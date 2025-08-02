
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { fileUploadsTable, analysisResultsTable, associationRulesTable } from '../db/schema';
import { getAssociationRules } from '../handlers/get_association_rules';

// Test data setup
const testFileUpload = {
  filename: 'test.csv',
  original_name: 'test.csv',
  file_size: 1024,
  mime_type: 'text/csv',
  file_path: '/uploads/test.csv',
  status: 'completed' as const
};

const testAnalysisResult = {
  file_upload_id: 1,
  algorithm: 'apriori' as const,
  min_support: '0.1',
  min_confidence: '0.5',
  status: 'completed' as const
};

const testAssociationRules = [
  {
    analysis_id: 1,
    antecedent: ['bread'],
    consequent: ['butter'],
    support: '0.3',
    confidence: '0.8',
    lift: '2.5',
    algorithm: 'apriori' as const
  },
  {
    analysis_id: 1,
    antecedent: ['milk'],
    consequent: ['cookies'],
    support: '0.25',
    confidence: '0.9',
    lift: '3.0',
    algorithm: 'apriori' as const
  },
  {
    analysis_id: 1,
    antecedent: ['tea'],
    consequent: ['sugar'],
    support: '0.2',
    confidence: '0.7',
    lift: '1.8',
    algorithm: 'apriori' as const
  }
];

describe('getAssociationRules', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return association rules for a specific analysis', async () => {
    // Create prerequisite data
    const fileUploadResult = await db.insert(fileUploadsTable)
      .values(testFileUpload)
      .returning()
      .execute();

    const analysisResult = await db.insert(analysisResultsTable)
      .values({
        ...testAnalysisResult,
        file_upload_id: fileUploadResult[0].id
      })
      .returning()
      .execute();

    // Create association rules
    await db.insert(associationRulesTable)
      .values(testAssociationRules.map(rule => ({
        ...rule,
        analysis_id: analysisResult[0].id
      })))
      .execute();

    const results = await getAssociationRules(analysisResult[0].id);

    expect(results).toHaveLength(3);
    
    // Verify all fields are properly converted
    results.forEach(rule => {
      expect(rule.id).toBeDefined();
      expect(rule.analysis_id).toEqual(analysisResult[0].id);
      expect(typeof rule.support).toBe('number');
      expect(typeof rule.confidence).toBe('number');
      expect(typeof rule.lift).toBe('number');
      expect(Array.isArray(rule.antecedent)).toBe(true);
      expect(Array.isArray(rule.consequent)).toBe(true);
      expect(rule.algorithm).toEqual('apriori');
      expect(rule.created_at).toBeInstanceOf(Date);
    });
  });

  it('should order results by confidence and lift descending', async () => {
    // Create prerequisite data
    const fileUploadResult = await db.insert(fileUploadsTable)
      .values(testFileUpload)
      .returning()
      .execute();

    const analysisResult = await db.insert(analysisResultsTable)
      .values({
        ...testAnalysisResult,
        file_upload_id: fileUploadResult[0].id
      })
      .returning()
      .execute();

    // Create association rules
    await db.insert(associationRulesTable)
      .values(testAssociationRules.map(rule => ({
        ...rule,
        analysis_id: analysisResult[0].id
      })))
      .execute();

    const results = await getAssociationRules(analysisResult[0].id);

    // Should be ordered by confidence desc, then lift desc
    // milk->cookies: confidence=0.9, lift=3.0 (first)
    // bread->butter: confidence=0.8, lift=2.5 (second) 
    // tea->sugar: confidence=0.7, lift=1.8 (third)
    expect(results[0].confidence).toEqual(0.9);
    expect(results[0].lift).toEqual(3.0);
    expect(results[1].confidence).toEqual(0.8);
    expect(results[1].lift).toEqual(2.5);
    expect(results[2].confidence).toEqual(0.7);
    expect(results[2].lift).toEqual(1.8);
  });

  it('should return empty array when no rules exist for analysis', async () => {
    const results = await getAssociationRules(999);
    expect(results).toHaveLength(0);
  });

  it('should only return rules for the specified analysis', async () => {
    // Create two file uploads and analyses
    const fileUpload1 = await db.insert(fileUploadsTable)
      .values(testFileUpload)
      .returning()
      .execute();

    const fileUpload2 = await db.insert(fileUploadsTable)
      .values({...testFileUpload, filename: 'test2.csv'})
      .returning()
      .execute();

    const analysis1 = await db.insert(analysisResultsTable)
      .values({
        ...testAnalysisResult,
        file_upload_id: fileUpload1[0].id
      })
      .returning()
      .execute();

    const analysis2 = await db.insert(analysisResultsTable)
      .values({
        ...testAnalysisResult,
        file_upload_id: fileUpload2[0].id
      })
      .returning()
      .execute();

    // Create rules for first analysis
    await db.insert(associationRulesTable)
      .values([{
        ...testAssociationRules[0],
        analysis_id: analysis1[0].id
      }])
      .execute();

    // Create rules for second analysis
    await db.insert(associationRulesTable)
      .values([{
        ...testAssociationRules[1],
        analysis_id: analysis2[0].id
      }])
      .execute();

    const results1 = await getAssociationRules(analysis1[0].id);
    const results2 = await getAssociationRules(analysis2[0].id);

    expect(results1).toHaveLength(1);
    expect(results2).toHaveLength(1);
    expect(results1[0].analysis_id).toEqual(analysis1[0].id);
    expect(results2[0].analysis_id).toEqual(analysis2[0].id);
  });
});
