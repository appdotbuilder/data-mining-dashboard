
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { fileUploadsTable, analysisResultsTable } from '../db/schema';
import { getAnalysisResults } from '../handlers/get_analysis_results';

describe('getAnalysisResults', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no analysis results exist', async () => {
    const results = await getAnalysisResults();
    expect(results).toEqual([]);
  });

  it('should return all analysis results ordered by creation date', async () => {
    // Create prerequisite file upload
    const fileUpload = await db.insert(fileUploadsTable)
      .values({
        filename: 'test.csv',
        original_name: 'test.csv',
        file_size: 1000,
        mime_type: 'text/csv',
        file_path: '/uploads/test.csv'
      })
      .returning()
      .execute();

    const fileUploadId = fileUpload[0].id;

    // Create multiple analysis results with different timestamps
    const firstAnalysis = await db.insert(analysisResultsTable)
      .values({
        file_upload_id: fileUploadId,
        algorithm: 'apriori',
        min_support: '0.1000',
        min_confidence: '0.5000',
        status: 'completed'
      })
      .returning()
      .execute();

    // Wait a moment to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    const secondAnalysis = await db.insert(analysisResultsTable)
      .values({
        file_upload_id: fileUploadId,
        algorithm: 'fp-growth',
        min_support: '0.2000',
        min_confidence: '0.6000',
        status: 'pending'
      })
      .returning()
      .execute();

    const results = await getAnalysisResults();

    expect(results).toHaveLength(2);
    
    // Should be ordered by creation date (newest first)
    expect(results[0].id).toEqual(secondAnalysis[0].id);
    expect(results[1].id).toEqual(firstAnalysis[0].id);

    // Verify numeric conversions
    expect(typeof results[0].min_support).toBe('number');
    expect(typeof results[0].min_confidence).toBe('number');
    expect(results[0].min_support).toEqual(0.2);
    expect(results[0].min_confidence).toEqual(0.6);
    expect(results[1].min_support).toEqual(0.1);
    expect(results[1].min_confidence).toEqual(0.5);
  });

  it('should return analysis results with all required fields', async () => {
    // Create prerequisite file upload
    const fileUpload = await db.insert(fileUploadsTable)
      .values({
        filename: 'analysis.csv',
        original_name: 'analysis.csv',
        file_size: 2000,
        mime_type: 'text/csv',
        file_path: '/uploads/analysis.csv'
      })
      .returning()
      .execute();

    // Create analysis result with all fields
    await db.insert(analysisResultsTable)
      .values({
        file_upload_id: fileUpload[0].id,
        algorithm: 'apriori',
        min_support: '0.1500',
        min_confidence: '0.7500',
        status: 'completed',
        summary: 'Analysis completed successfully',
        error_message: null
      })
      .execute();

    const results = await getAnalysisResults();

    expect(results).toHaveLength(1);
    const result = results[0];

    // Verify all required fields are present
    expect(result.id).toBeDefined();
    expect(result.file_upload_id).toEqual(fileUpload[0].id);
    expect(result.algorithm).toEqual('apriori');
    expect(result.min_support).toEqual(0.15);
    expect(result.min_confidence).toEqual(0.75);
    expect(result.status).toEqual('completed');
    expect(result.summary).toEqual('Analysis completed successfully');
    expect(result.error_message).toBeNull();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.completed_at).toBeNull();
  });

  it('should handle analysis results with completed_at timestamp', async () => {
    // Create prerequisite file upload
    const fileUpload = await db.insert(fileUploadsTable)
      .values({
        filename: 'completed.csv',
        original_name: 'completed.csv',
        file_size: 1500,
        mime_type: 'text/csv',
        file_path: '/uploads/completed.csv'
      })
      .returning()
      .execute();

    const completedAt = new Date();

    await db.insert(analysisResultsTable)
      .values({
        file_upload_id: fileUpload[0].id,
        algorithm: 'fp-growth',
        min_support: '0.0500',
        min_confidence: '0.8000',
        status: 'completed',
        completed_at: completedAt
      })
      .execute();

    const results = await getAnalysisResults();

    expect(results).toHaveLength(1);
    expect(results[0].completed_at).toBeInstanceOf(Date);
    expect(results[0].completed_at?.getTime()).toBeCloseTo(completedAt.getTime(), -2);
  });
});
