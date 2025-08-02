
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { fileUploadsTable, transactionsTable, analysisResultsTable, frequentItemsetsTable, associationRulesTable } from '../db/schema';
import { type CreateAnalysisInput } from '../schema';
import { runFpGrowthAnalysis } from '../handlers/run_fp_growth_analysis';
import { eq } from 'drizzle-orm';

describe('runFpGrowthAnalysis', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  const createTestData = async () => {
    // Create file upload
    const fileResults = await db.insert(fileUploadsTable)
      .values({
        filename: 'test-transactions.csv',
        original_name: 'transactions.csv',
        file_size: 1024,
        mime_type: 'text/csv',
        file_path: '/uploads/test.csv',
        status: 'completed'
      })
      .returning()
      .execute();

    const fileUpload = fileResults[0];

    // Create test transactions
    const transactionData = [
      { transaction_id: 'T1', items: ['bread', 'milk'] },
      { transaction_id: 'T2', items: ['bread', 'butter', 'milk'] },
      { transaction_id: 'T3', items: ['bread', 'butter'] },
      { transaction_id: 'T4', items: ['milk', 'butter'] },
      { transaction_id: 'T5', items: ['bread', 'milk', 'butter', 'cheese'] }
    ];

    await db.insert(transactionsTable)
      .values(transactionData.map(t => ({
        file_upload_id: fileUpload.id,
        transaction_id: t.transaction_id,
        items: t.items
      })))
      .execute();

    return fileUpload;
  };

  const testInput: CreateAnalysisInput = {
    file_upload_id: 1,
    algorithm: 'fp-growth',
    min_support: 0.4, // 40% = 2 out of 5 transactions
    min_confidence: 0.6 // 60%
  };

  it('should create and complete FP-Growth analysis', async () => {
    const fileUpload = await createTestData();
    const input = { ...testInput, file_upload_id: fileUpload.id };

    const result = await runFpGrowthAnalysis(input);

    expect(result.id).toBeDefined();
    expect(result.file_upload_id).toEqual(fileUpload.id);
    expect(result.algorithm).toEqual('fp-growth');
    expect(result.min_support).toEqual(0.4);
    expect(result.min_confidence).toEqual(0.6);
    expect(result.status).toEqual('completed');
    expect(result.summary).toContain('FP-Growth analysis completed successfully');
    expect(result.error_message).toBeNull();
    expect(result.completed_at).toBeInstanceOf(Date);
  });

  it('should save frequent itemsets to database', async () => {
    const fileUpload = await createTestData();
    const input = { ...testInput, file_upload_id: fileUpload.id };

    const result = await runFpGrowthAnalysis(input);

    const itemsets = await db.select()
      .from(frequentItemsetsTable)
      .where(eq(frequentItemsetsTable.analysis_id, result.id))
      .execute();

    expect(itemsets.length).toBeGreaterThan(0);

    // Check that itemsets have expected properties
    for (const itemset of itemsets) {
      expect(itemset.analysis_id).toEqual(result.id);
      expect(itemset.algorithm).toEqual('fp-growth');
      expect(Array.isArray(itemset.itemset)).toBe(true);
      const itemsetArray = itemset.itemset as string[];
      expect(itemsetArray.length).toBeGreaterThan(0);
      expect(typeof parseFloat(itemset.support)).toBe('number');
      expect(itemset.frequency).toBeGreaterThan(0);
      expect(itemset.created_at).toBeInstanceOf(Date);
    }

    // Verify specific frequent items (bread, milk, butter should be frequent with min_support=0.4)
    const breadItemsets = itemsets.filter(i => {
      const itemsetArray = i.itemset as string[];
      return itemsetArray.length === 1 && itemsetArray.includes('bread');
    });
    expect(breadItemsets.length).toEqual(1);
    expect(breadItemsets[0].frequency).toEqual(4); // bread appears in 4/5 transactions
  });

  it('should save association rules to database', async () => {
    const fileUpload = await createTestData();
    const input = { ...testInput, file_upload_id: fileUpload.id };

    const result = await runFpGrowthAnalysis(input);

    const rules = await db.select()
      .from(associationRulesTable)
      .where(eq(associationRulesTable.analysis_id, result.id))
      .execute();

    expect(rules.length).toBeGreaterThan(0);

    // Check that rules have expected properties
    for (const rule of rules) {
      expect(rule.analysis_id).toEqual(result.id);
      expect(rule.algorithm).toEqual('fp-growth');
      expect(Array.isArray(rule.antecedent)).toBe(true);
      expect(Array.isArray(rule.consequent)).toBe(true);
      const antecedentArray = rule.antecedent as string[];
      const consequentArray = rule.consequent as string[];
      expect(antecedentArray.length).toBeGreaterThan(0);
      expect(consequentArray.length).toBeGreaterThan(0);
      expect(typeof parseFloat(rule.support)).toBe('number');
      expect(typeof parseFloat(rule.confidence)).toBe('number');
      expect(typeof parseFloat(rule.lift)).toBe('number');
      expect(parseFloat(rule.confidence)).toBeGreaterThanOrEqual(0.6); // min_confidence
      expect(rule.created_at).toBeInstanceOf(Date);
    }
  });

  it('should handle empty transactions gracefully', async () => {
    // Create file upload without transactions
    const fileResults = await db.insert(fileUploadsTable)
      .values({
        filename: 'empty-transactions.csv',
        original_name: 'empty.csv',
        file_size: 0,
        mime_type: 'text/csv',
        file_path: '/uploads/empty.csv',
        status: 'completed'
      })
      .returning()
      .execute();

    const input = { ...testInput, file_upload_id: fileResults[0].id };

    await expect(runFpGrowthAnalysis(input)).rejects.toThrow(/no transactions found/i);

    // Check that analysis result was created and marked as failed
    const analysisResults = await db.select()
      .from(analysisResultsTable)
      .where(eq(analysisResultsTable.file_upload_id, fileResults[0].id))
      .execute();

    expect(analysisResults.length).toEqual(1);
    expect(analysisResults[0].status).toEqual('failed');
    expect(analysisResults[0].error_message).toContain('No transactions found');
  });

  it('should handle high minimum support threshold', async () => {
    const fileUpload = await createTestData();
    const input = {
      ...testInput,
      file_upload_id: fileUpload.id,
      min_support: 0.9 // Very high threshold - only items in 5/5 transactions
    };

    const result = await runFpGrowthAnalysis(input);

    expect(result.status).toEqual('completed');

    // Should find fewer itemsets with higher support threshold
    const itemsets = await db.select()
      .from(frequentItemsetsTable)
      .where(eq(frequentItemsetsTable.analysis_id, result.id))
      .execute();

    // With min_support=0.9, no single item appears in all 5 transactions
    expect(itemsets.length).toEqual(0);

    const rules = await db.select()
      .from(associationRulesTable)
      .where(eq(associationRulesTable.analysis_id, result.id))
      .execute();

    expect(rules.length).toEqual(0);
  });

  it('should handle nonexistent file_upload_id', async () => {
    const input = { ...testInput, file_upload_id: 999999 };

    await expect(runFpGrowthAnalysis(input)).rejects.toThrow(/no transactions found/i);
  });
});
