
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { fileUploadsTable, transactionsTable, analysisResultsTable, frequentItemsetsTable, associationRulesTable } from '../db/schema';
import { type CreateAnalysisInput } from '../schema';
import { runAprioriAnalysis } from '../handlers/run_apriori_analysis';
import { eq } from 'drizzle-orm';

// Test input
const testInput: CreateAnalysisInput = {
  file_upload_id: 1,
  algorithm: 'apriori',
  min_support: 0.4,
  min_confidence: 0.6
};

// Sample transaction data for testing
const sampleTransactions = [
  { transaction_id: 'T1', items: ['bread', 'milk', 'eggs'] },
  { transaction_id: 'T2', items: ['bread', 'butter'] },
  { transaction_id: 'T3', items: ['milk', 'eggs', 'butter'] },
  { transaction_id: 'T4', items: ['bread', 'milk', 'butter'] },
  { transaction_id: 'T5', items: ['bread', 'eggs'] }
];

describe('runAprioriAnalysis', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create analysis result and process transactions', async () => {
    // Create prerequisite file upload
    const fileUpload = await db.insert(fileUploadsTable)
      .values({
        filename: 'test_transactions.csv',
        original_name: 'test_transactions.csv',
        file_size: 1024,
        mime_type: 'text/csv',
        file_path: '/uploads/test.csv',
        status: 'completed'
      })
      .returning()
      .execute();

    const fileUploadId = fileUpload[0].id;

    // Create sample transactions
    await db.insert(transactionsTable)
      .values(sampleTransactions.map(t => ({
        file_upload_id: fileUploadId,
        transaction_id: t.transaction_id,
        items: t.items
      })))
      .execute();

    // Run analysis
    const result = await runAprioriAnalysis({
      ...testInput,
      file_upload_id: fileUploadId
    });

    // Verify analysis result
    expect(result.id).toBeDefined();
    expect(result.file_upload_id).toEqual(fileUploadId);
    expect(result.algorithm).toEqual('apriori');
    expect(result.min_support).toEqual(0.4);
    expect(result.min_confidence).toEqual(0.6);
    expect(result.status).toEqual('completed');
    expect(result.summary).toBeDefined();
    expect(result.summary).toContain('Apriori Analysis completed successfully');
    expect(result.completed_at).toBeInstanceOf(Date);
    expect(result.error_message).toBeNull();
  });

  it('should save frequent itemsets to database', async () => {
    // Create prerequisite data
    const fileUpload = await db.insert(fileUploadsTable)
      .values({
        filename: 'test.csv',
        original_name: 'test.csv',
        file_size: 1024,
        mime_type: 'text/csv',
        file_path: '/uploads/test.csv',
        status: 'completed'
      })
      .returning()
      .execute();

    const fileUploadId = fileUpload[0].id;

    await db.insert(transactionsTable)
      .values(sampleTransactions.map(t => ({
        file_upload_id: fileUploadId,
        transaction_id: t.transaction_id,
        items: t.items
      })))
      .execute();

    // Run analysis
    const result = await runAprioriAnalysis({
      ...testInput,
      file_upload_id: fileUploadId
    });

    // Check frequent itemsets were saved
    const itemsets = await db.select()
      .from(frequentItemsetsTable)
      .where(eq(frequentItemsetsTable.analysis_id, result.id))
      .execute();

    expect(itemsets.length).toBeGreaterThan(0);
    
    // Verify itemset structure
    const itemset = itemsets[0];
    expect(itemset.analysis_id).toEqual(result.id);
    expect(itemset.itemset).toBeDefined();
    expect(Array.isArray(itemset.itemset)).toBe(true);
    expect(parseFloat(itemset.support)).toBeGreaterThanOrEqual(0.4); // Min support threshold
    expect(itemset.frequency).toBeGreaterThan(0);
    expect(itemset.algorithm).toEqual('apriori');
    expect(itemset.created_at).toBeInstanceOf(Date);
  });

  it('should save association rules to database', async () => {
    // Create prerequisite data
    const fileUpload = await db.insert(fileUploadsTable)
      .values({
        filename: 'test.csv',
        original_name: 'test.csv',
        file_size: 1024,
        mime_type: 'text/csv',
        file_path: '/uploads/test.csv',
        status: 'completed'
      })
      .returning()
      .execute();

    const fileUploadId = fileUpload[0].id;

    await db.insert(transactionsTable)
      .values(sampleTransactions.map(t => ({
        file_upload_id: fileUploadId,
        transaction_id: t.transaction_id,
        items: t.items
      })))
      .execute();

    // Run analysis
    const result = await runAprioriAnalysis({
      ...testInput,
      file_upload_id: fileUploadId
    });

    // Check association rules were saved
    const rules = await db.select()
      .from(associationRulesTable)
      .where(eq(associationRulesTable.analysis_id, result.id))
      .execute();

    if (rules.length > 0) {
      // Verify rule structure
      const rule = rules[0];
      expect(rule.analysis_id).toEqual(result.id);
      expect(Array.isArray(rule.antecedent)).toBe(true);
      expect(Array.isArray(rule.consequent)).toBe(true);
      expect(parseFloat(rule.support)).toBeGreaterThan(0);
      expect(parseFloat(rule.confidence)).toBeGreaterThanOrEqual(0.6); // Min confidence threshold
      expect(parseFloat(rule.lift)).toBeGreaterThan(0);
      expect(rule.algorithm).toEqual('apriori');
      expect(rule.created_at).toBeInstanceOf(Date);
    }
  });

  it('should handle empty transactions gracefully', async () => {
    // Create file upload without transactions
    const fileUpload = await db.insert(fileUploadsTable)
      .values({
        filename: 'empty.csv',
        original_name: 'empty.csv',
        file_size: 0,
        mime_type: 'text/csv',
        file_path: '/uploads/empty.csv',
        status: 'completed'
      })
      .returning()
      .execute();

    const fileUploadId = fileUpload[0].id;

    // Should throw error for empty transactions
    await expect(runAprioriAnalysis({
      ...testInput,
      file_upload_id: fileUploadId
    })).rejects.toThrow(/no transactions found/i);

    // Verify analysis was marked as failed
    const failedAnalysis = await db.select()
      .from(analysisResultsTable)
      .where(eq(analysisResultsTable.file_upload_id, fileUploadId))
      .execute();

    expect(failedAnalysis.length).toBeGreaterThan(0);
    expect(failedAnalysis[0].status).toEqual('failed');
    expect(failedAnalysis[0].error_message).toContain('No transactions found');
  });

  it('should work with different support and confidence thresholds', async () => {
    // Create prerequisite data
    const fileUpload = await db.insert(fileUploadsTable)
      .values({
        filename: 'test.csv',
        original_name: 'test.csv',
        file_size: 1024,
        mime_type: 'text/csv',
        file_path: '/uploads/test.csv',
        status: 'completed'
      })
      .returning()
      .execute();

    const fileUploadId = fileUpload[0].id;

    await db.insert(transactionsTable)
      .values(sampleTransactions.map(t => ({
        file_upload_id: fileUploadId,
        transaction_id: t.transaction_id,
        items: t.items
      })))
      .execute();

    // Run analysis with lower thresholds
    const result = await runAprioriAnalysis({
      file_upload_id: fileUploadId,
      algorithm: 'apriori',
      min_support: 0.2, // Lower support
      min_confidence: 0.3 // Lower confidence
    });

    expect(result.status).toEqual('completed');
    expect(result.min_support).toEqual(0.2);
    expect(result.min_confidence).toEqual(0.3);

    // Should find more itemsets/rules with lower thresholds
    const itemsets = await db.select()
      .from(frequentItemsetsTable)
      .where(eq(frequentItemsetsTable.analysis_id, result.id))
      .execute();

    const rules = await db.select()
      .from(associationRulesTable)
      .where(eq(associationRulesTable.analysis_id, result.id))
      .execute();

    expect(itemsets.length).toBeGreaterThan(0);
    // With lower thresholds, we might find association rules
    expect(rules.length).toBeGreaterThanOrEqual(0);
  });

  it('should generate meaningful summary', async () => {
    // Create prerequisite data
    const fileUpload = await db.insert(fileUploadsTable)
      .values({
        filename: 'test.csv',
        original_name: 'test.csv',
        file_size: 1024,
        mime_type: 'text/csv',
        file_path: '/uploads/test.csv',
        status: 'completed'
      })
      .returning()
      .execute();

    const fileUploadId = fileUpload[0].id;

    await db.insert(transactionsTable)
      .values(sampleTransactions.map(t => ({
        file_upload_id: fileUploadId,
        transaction_id: t.transaction_id,
        items: t.items
      })))
      .execute();

    // Run analysis
    const result = await runAprioriAnalysis({
      ...testInput,
      file_upload_id: fileUploadId
    });

    expect(result.summary).toBeDefined();
    expect(result.summary).toContain('Apriori Analysis completed successfully');
    expect(result.summary).toContain('Parameters: Min Support = 40.0%, Min Confidence = 60.0%');
    expect(result.summary).toContain('frequent itemsets');
    expect(result.summary).toContain('association rules');
  });
});
