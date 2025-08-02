
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { fileUploadsTable, analysisResultsTable } from '../db/schema';
import { type CreateFileUploadInput, type CreateAnalysisInput } from '../schema';
import { getAnalysisById } from '../handlers/get_analysis_by_id';

// Test data
const testFileUpload: CreateFileUploadInput = {
  filename: 'test-transactions.csv',
  original_name: 'transactions.csv',
  file_size: 1024,
  mime_type: 'text/csv',
  file_path: '/uploads/test-transactions.csv'
};

const testAnalysisInput: CreateAnalysisInput = {
  file_upload_id: 1, // Will be updated after file upload creation
  algorithm: 'apriori',
  min_support: 0.1,
  min_confidence: 0.5
};

describe('getAnalysisById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return analysis result by ID', async () => {
    // Create prerequisite file upload
    const fileUploadResult = await db.insert(fileUploadsTable)
      .values({
        filename: testFileUpload.filename,
        original_name: testFileUpload.original_name,
        file_size: testFileUpload.file_size,
        mime_type: testFileUpload.mime_type,
        file_path: testFileUpload.file_path
      })
      .returning()
      .execute();

    const fileUploadId = fileUploadResult[0].id;

    // Create analysis result
    const analysisResult = await db.insert(analysisResultsTable)
      .values({
        file_upload_id: fileUploadId,
        algorithm: testAnalysisInput.algorithm,
        min_support: testAnalysisInput.min_support.toString(),
        min_confidence: testAnalysisInput.min_confidence.toString(),
        status: 'completed',
        summary: 'Test analysis completed successfully'
      })
      .returning()
      .execute();

    const analysisId = analysisResult[0].id;

    // Test the handler
    const result = await getAnalysisById(analysisId);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(analysisId);
    expect(result!.file_upload_id).toEqual(fileUploadId);
    expect(result!.algorithm).toEqual('apriori');
    expect(result!.min_support).toEqual(0.1);
    expect(result!.min_confidence).toEqual(0.5);
    expect(typeof result!.min_support).toEqual('number');
    expect(typeof result!.min_confidence).toEqual('number');
    expect(result!.status).toEqual('completed');
    expect(result!.summary).toEqual('Test analysis completed successfully');
    expect(result!.created_at).toBeInstanceOf(Date);
  });

  it('should return null for non-existent analysis ID', async () => {
    const result = await getAnalysisById(999);
    expect(result).toBeNull();
  });

  it('should handle analysis with null optional fields', async () => {
    // Create prerequisite file upload
    const fileUploadResult = await db.insert(fileUploadsTable)
      .values({
        filename: testFileUpload.filename,
        original_name: testFileUpload.original_name,
        file_size: testFileUpload.file_size,
        mime_type: testFileUpload.mime_type,
        file_path: testFileUpload.file_path
      })
      .returning()
      .execute();

    const fileUploadId = fileUploadResult[0].id;

    // Create analysis result with null optional fields
    const analysisResult = await db.insert(analysisResultsTable)
      .values({
        file_upload_id: fileUploadId,
        algorithm: 'fp-growth',
        min_support: '0.05',
        min_confidence: '0.75',
        status: 'pending',
        summary: null,
        error_message: null,
        completed_at: null
      })
      .returning()
      .execute();

    const analysisId = analysisResult[0].id;

    // Test the handler
    const result = await getAnalysisById(analysisId);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(analysisId);
    expect(result!.algorithm).toEqual('fp-growth');
    expect(result!.min_support).toEqual(0.05);
    expect(result!.min_confidence).toEqual(0.75);
    expect(result!.status).toEqual('pending');
    expect(result!.summary).toBeNull();
    expect(result!.error_message).toBeNull();
    expect(result!.completed_at).toBeNull();
  });
});
