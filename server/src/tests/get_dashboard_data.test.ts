
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { fileUploadsTable, analysisResultsTable, frequentItemsetsTable, associationRulesTable } from '../db/schema';
import { getDashboardData } from '../handlers/get_dashboard_data';

describe('getDashboardData', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return null for non-existent analysis', async () => {
    const result = await getDashboardData(999);
    expect(result).toBeNull();
  });

  it('should return dashboard data for existing analysis', async () => {
    // Create prerequisite file upload
    const fileUpload = await db.insert(fileUploadsTable)
      .values({
        filename: 'test.csv',
        original_name: 'test_data.csv',
        file_size: 1024,
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
        min_support: '0.1000',
        min_confidence: '0.5000',
        status: 'completed',
        summary: 'Analysis completed successfully'
      })
      .returning()
      .execute();

    const analysisId = analysisResult[0].id;

    // Create frequent itemsets
    await db.insert(frequentItemsetsTable)
      .values([
        {
          analysis_id: analysisId,
          itemset: ['bread', 'milk'],
          support: '0.250000',
          frequency: 25,
          algorithm: 'apriori'
        },
        {
          analysis_id: analysisId,
          itemset: ['eggs'],
          support: '0.300000',
          frequency: 30,
          algorithm: 'apriori'
        }
      ])
      .execute();

    // Create association rules
    await db.insert(associationRulesTable)
      .values([
        {
          analysis_id: analysisId,
          antecedent: ['bread'],
          consequent: ['milk'],
          support: '0.200000',
          confidence: '0.800000',
          lift: '1.200000',
          algorithm: 'apriori'
        }
      ])
      .execute();

    const result = await getDashboardData(analysisId);

    expect(result).not.toBeNull();
    expect(result!.analysis_id).toEqual(analysisId);
    expect(result!.algorithm).toEqual('apriori');
    expect(result!.summary).toEqual('Analysis completed successfully');

    // Verify parameters
    expect(result!.parameters.algorithm).toEqual('apriori');
    expect(result!.parameters.min_support).toEqual(0.1);
    expect(result!.parameters.min_confidence).toEqual(0.5);

    // Verify frequent itemsets
    expect(result!.frequent_itemsets).toHaveLength(2);
    expect(result!.frequent_itemsets[0].itemset).toEqual(['bread', 'milk']);
    expect(result!.frequent_itemsets[0].support).toEqual(0.25);
    expect(result!.frequent_itemsets[0].frequency).toEqual(25);
    
    expect(result!.frequent_itemsets[1].itemset).toEqual(['eggs']);
    expect(result!.frequent_itemsets[1].support).toEqual(0.3);

    // Verify association rules
    expect(result!.association_rules).toHaveLength(1);
    expect(result!.association_rules[0].antecedent).toEqual(['bread']);
    expect(result!.association_rules[0].consequent).toEqual(['milk']);
    expect(result!.association_rules[0].support).toEqual(0.2);
    expect(result!.association_rules[0].confidence).toEqual(0.8);
    expect(result!.association_rules[0].lift).toEqual(1.2);
  });

  it('should return dashboard data with empty itemsets and rules', async () => {
    // Create prerequisite file upload
    const fileUpload = await db.insert(fileUploadsTable)
      .values({
        filename: 'empty.csv',
        original_name: 'empty_data.csv',
        file_size: 100,
        mime_type: 'text/csv',
        file_path: '/uploads/empty.csv',
        status: 'completed'
      })
      .returning()
      .execute();

    // Create analysis result without itemsets or rules
    const analysisResult = await db.insert(analysisResultsTable)
      .values({
        file_upload_id: fileUpload[0].id,
        algorithm: 'fp-growth',
        min_support: '0.0500',
        min_confidence: '0.7000',
        status: 'completed',
        summary: null
      })
      .returning()
      .execute();

    const result = await getDashboardData(analysisResult[0].id);

    expect(result).not.toBeNull();
    expect(result!.analysis_id).toEqual(analysisResult[0].id);
    expect(result!.algorithm).toEqual('fp-growth');
    expect(result!.summary).toBeNull();
    expect(result!.frequent_itemsets).toHaveLength(0);
    expect(result!.association_rules).toHaveLength(0);
    expect(result!.parameters.min_support).toEqual(0.05);
    expect(result!.parameters.min_confidence).toEqual(0.7);
  });

  it('should handle numeric type conversions correctly', async () => {
    // Create prerequisite file upload
    const fileUpload = await db.insert(fileUploadsTable)
      .values({
        filename: 'precision.csv',
        original_name: 'precision_test.csv',
        file_size: 2048,
        mime_type: 'text/csv',
        file_path: '/uploads/precision.csv',
        status: 'completed'
      })
      .returning()
      .execute();

    // Create analysis with high precision numeric values
    const analysisResult = await db.insert(analysisResultsTable)
      .values({
        file_upload_id: fileUpload[0].id,
        algorithm: 'apriori',
        min_support: '0.0123',
        min_confidence: '0.9876',
        status: 'completed',
        summary: 'High precision test'
      })
      .returning()
      .execute();

    const analysisId = analysisResult[0].id;

    // Create itemset with high precision support
    await db.insert(frequentItemsetsTable)
      .values({
        analysis_id: analysisId,
        itemset: ['item1', 'item2', 'item3'],
        support: '0.123456',
        frequency: 123,
        algorithm: 'apriori'
      })
      .execute();

    // Create rule with high precision metrics
    await db.insert(associationRulesTable)
      .values({
        analysis_id: analysisId,
        antecedent: ['item1'],
        consequent: ['item2', 'item3'],
        support: '0.098765',
        confidence: '0.876543',
        lift: '2.345678',
        algorithm: 'apriori'
      })
      .execute();

    const result = await getDashboardData(analysisId);

    expect(result).not.toBeNull();
    
    // Verify all numeric values are properly converted to numbers
    expect(typeof result!.parameters.min_support).toBe('number');
    expect(typeof result!.parameters.min_confidence).toBe('number');
    expect(result!.parameters.min_support).toEqual(0.0123);
    expect(result!.parameters.min_confidence).toEqual(0.9876);

    expect(typeof result!.frequent_itemsets[0].support).toBe('number');
    expect(result!.frequent_itemsets[0].support).toEqual(0.123456);

    expect(typeof result!.association_rules[0].support).toBe('number');
    expect(typeof result!.association_rules[0].confidence).toBe('number');
    expect(typeof result!.association_rules[0].lift).toBe('number');
    expect(result!.association_rules[0].support).toEqual(0.098765);
    expect(result!.association_rules[0].confidence).toEqual(0.876543);
    expect(result!.association_rules[0].lift).toEqual(2.345678);
  });
});
