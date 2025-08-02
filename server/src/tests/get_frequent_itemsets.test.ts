
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { fileUploadsTable, analysisResultsTable, frequentItemsetsTable } from '../db/schema';
import { getFrequentItemsets } from '../handlers/get_frequent_itemsets';

describe('getFrequentItemsets', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return frequent itemsets ordered by support descending', async () => {
    // Create test file upload
    const fileUpload = await db.insert(fileUploadsTable)
      .values({
        filename: 'test.csv',
        original_name: 'test.csv',
        file_size: 1000,
        mime_type: 'text/csv',
        file_path: '/uploads/test.csv',
        status: 'completed'
      })
      .returning()
      .execute();

    // Create analysis result
    const analysisResult = await db.insert(analysisResultsTable)
      .values({
        file_upload_id: fileUpload[0].id,
        algorithm: 'apriori',
        min_support: '0.1',
        min_confidence: '0.5',
        status: 'completed'
      })
      .returning()
      .execute();

    const analysisId = analysisResult[0].id;

    // Create frequent itemsets with different support values
    await db.insert(frequentItemsetsTable)
      .values([
        {
          analysis_id: analysisId,
          itemset: ['bread', 'milk'],
          support: '0.8',
          frequency: 80,
          algorithm: 'apriori'
        },
        {
          analysis_id: analysisId,
          itemset: ['bread'],
          support: '0.9',
          frequency: 90,
          algorithm: 'apriori'
        },
        {
          analysis_id: analysisId,
          itemset: ['milk', 'eggs'],
          support: '0.6',
          frequency: 60,
          algorithm: 'apriori'
        }
      ])
      .execute();

    const result = await getFrequentItemsets(analysisId);

    // Should return 3 itemsets
    expect(result).toHaveLength(3);

    // Should be ordered by support descending
    expect(result[0].support).toEqual(0.9);
    expect(result[0].itemset).toEqual(['bread']);
    expect(result[1].support).toEqual(0.8);
    expect(result[1].itemset).toEqual(['bread', 'milk']);
    expect(result[2].support).toEqual(0.6);
    expect(result[2].itemset).toEqual(['milk', 'eggs']);

    // Verify all fields are properly converted
    result.forEach(itemset => {
      expect(typeof itemset.support).toBe('number');
      expect(Array.isArray(itemset.itemset)).toBe(true);
      expect(typeof itemset.frequency).toBe('number');
      expect(itemset.created_at).toBeInstanceOf(Date);
    });
  });

  it('should return empty array for non-existent analysis', async () => {
    const result = await getFrequentItemsets(999);
    expect(result).toHaveLength(0);
  });

  it('should return only itemsets for specified analysis', async () => {
    // Create two file uploads
    const fileUpload1 = await db.insert(fileUploadsTable)
      .values({
        filename: 'test1.csv',
        original_name: 'test1.csv',
        file_size: 1000,
        mime_type: 'text/csv',
        file_path: '/uploads/test1.csv',
        status: 'completed'
      })
      .returning()
      .execute();

    const fileUpload2 = await db.insert(fileUploadsTable)
      .values({
        filename: 'test2.csv',
        original_name: 'test2.csv',
        file_size: 2000,
        mime_type: 'text/csv',
        file_path: '/uploads/test2.csv',
        status: 'completed'
      })
      .returning()
      .execute();

    // Create two analysis results
    const analysisResults = await db.insert(analysisResultsTable)
      .values([
        {
          file_upload_id: fileUpload1[0].id,
          algorithm: 'apriori',
          min_support: '0.1',
          min_confidence: '0.5',
          status: 'completed'
        },
        {
          file_upload_id: fileUpload2[0].id,
          algorithm: 'fp-growth',
          min_support: '0.2',
          min_confidence: '0.6',
          status: 'completed'
        }
      ])
      .returning()
      .execute();

    const analysisId1 = analysisResults[0].id;
    const analysisId2 = analysisResults[1].id;

    // Create itemsets for both analyses
    await db.insert(frequentItemsetsTable)
      .values([
        {
          analysis_id: analysisId1,
          itemset: ['bread'],
          support: '0.8',
          frequency: 80,
          algorithm: 'apriori'
        },
        {
          analysis_id: analysisId2,
          itemset: ['milk'],
          support: '0.7',
          frequency: 70,
          algorithm: 'fp-growth'
        }
      ])
      .execute();

    // Should only return itemsets for analysis 1
    const result = await getFrequentItemsets(analysisId1);
    expect(result).toHaveLength(1);
    expect(result[0].itemset).toEqual(['bread']);
    expect(result[0].algorithm).toEqual('apriori');
  });
});
