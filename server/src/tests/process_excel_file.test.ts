
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { fileUploadsTable, transactionsTable } from '../db/schema';
import { processExcelFile } from '../handlers/process_excel_file';
import { eq } from 'drizzle-orm';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

// Create test directory and CSV file
const testDir = '/tmp/test_uploads';
const testFilePath = join(testDir, 'test_transactions.csv');

const createTestCSVFile = async (data: string[][]) => {
  await mkdir(testDir, { recursive: true });
  
  // Convert array data to CSV format
  const csvContent = data.map(row => 
    row.map(cell => `"${cell}"`).join(',')
  ).join('\n');
  
  await writeFile(testFilePath, csvContent);
};

const createTestFileUpload = async (
  status: 'pending' | 'processing' | 'completed' | 'failed' = 'pending',
  customPath?: string
) => {
  const result = await db.insert(fileUploadsTable)
    .values({
      filename: 'test_transactions.csv',
      original_name: 'transactions.csv',
      file_size: 1024,
      mime_type: 'text/csv',
      file_path: customPath || testFilePath,
      status
    })
    .returning()
    .execute();
  
  return result[0];
};

describe('processExcelFile', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should process CSV file with valid transaction data', async () => {
    // Create test CSV file
    const testData = [
      ['Transaction ID', 'Item 1', 'Item 2', 'Item 3'],
      ['T001', 'Bread', 'Milk', 'Eggs'],
      ['T002', 'Bread', 'Butter', ''],
      ['T003', 'Milk', 'Cheese', 'Yogurt']
    ];
    await createTestCSVFile(testData);
    
    // Create file upload record
    const fileUpload = await createTestFileUpload();
    
    // Process the file
    const transactions = await processExcelFile(fileUpload.id);
    
    // Verify results
    expect(transactions).toHaveLength(3);
    
    expect(transactions[0].transaction_id).toEqual('T001');
    expect(transactions[0].items).toEqual(['Bread', 'Milk', 'Eggs']);
    expect(transactions[0].file_upload_id).toEqual(fileUpload.id);
    
    expect(transactions[1].transaction_id).toEqual('T002');
    expect(transactions[1].items).toEqual(['Bread', 'Butter']);
    
    expect(transactions[2].transaction_id).toEqual('T003');
    expect(transactions[2].items).toEqual(['Milk', 'Cheese', 'Yogurt']);
  });

  it('should save transactions to database', async () => {
    const testData = [
      ['Transaction ID', 'Item 1', 'Item 2'],
      ['T001', 'Apple', 'Banana']
    ];
    await createTestCSVFile(testData);
    
    const fileUpload = await createTestFileUpload();
    
    await processExcelFile(fileUpload.id);
    
    // Verify database records
    const dbTransactions = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.file_upload_id, fileUpload.id))
      .execute();
    
    expect(dbTransactions).toHaveLength(1);
    expect(dbTransactions[0].transaction_id).toEqual('T001');
    expect(dbTransactions[0].items as string[]).toEqual(['Apple', 'Banana']);
    expect(dbTransactions[0].created_at).toBeInstanceOf(Date);
  });

  it('should update file upload status to completed', async () => {
    const testData = [
      ['Transaction ID', 'Item 1'],
      ['T001', 'Apple']
    ];
    await createTestCSVFile(testData);
    
    const fileUpload = await createTestFileUpload();
    
    await processExcelFile(fileUpload.id);
    
    // Check file status was updated
    const updatedFile = await db.select()
      .from(fileUploadsTable)
      .where(eq(fileUploadsTable.id, fileUpload.id))
      .execute();
    
    expect(updatedFile[0].status).toEqual('completed');
  });

  it('should skip empty rows and items', async () => {
    const testData = [
      ['Transaction ID', 'Item 1', 'Item 2', 'Item 3'],
      ['T001', 'Apple', '', 'Banana'],
      ['', 'Orange', 'Grape', ''], // Empty transaction ID - should be skipped
      ['T002', '', '', ''], // No items - should be skipped
      ['T003', 'Milk', 'Bread', ''] // Empty item should be filtered
    ];
    await createTestCSVFile(testData);
    
    const fileUpload = await createTestFileUpload();
    
    const transactions = await processExcelFile(fileUpload.id);
    
    expect(transactions).toHaveLength(2);
    expect(transactions[0].transaction_id).toEqual('T001');
    expect(transactions[0].items).toEqual(['Apple', 'Banana']);
    expect(transactions[1].transaction_id).toEqual('T003');
    expect(transactions[1].items).toEqual(['Milk', 'Bread']);
  });

  it('should handle file not found error', async () => {
    // Create file upload record with non-existent file path
    const fileUpload = await createTestFileUpload('pending', '/tmp/non_existent_file.csv');
    
    expect(processExcelFile(fileUpload.id)).rejects.toThrow();
    
    // Check file status was updated to failed
    const updatedFile = await db.select()
      .from(fileUploadsTable)
      .where(eq(fileUploadsTable.id, fileUpload.id))
      .execute();
    
    expect(updatedFile[0].status).toEqual('failed');
  });

  it('should handle non-existent file upload ID', async () => {
    expect(processExcelFile(99999)).rejects.toThrow(/not found/i);
  });

  it('should handle empty file', async () => {
    await writeFile(testFilePath, '');
    
    const fileUpload = await createTestFileUpload();
    
    expect(processExcelFile(fileUpload.id)).rejects.toThrow(/empty/i);
    
    // Check file status was updated to failed
    const updatedFile = await db.select()
      .from(fileUploadsTable)
      .where(eq(fileUploadsTable.id, fileUpload.id))
      .execute();
    
    expect(updatedFile[0].status).toEqual('failed');
  });

  it('should handle file with no valid transactions', async () => {
    const testData = [
      ['Transaction ID', 'Item 1'],
      ['', ''], // Empty row
      ['  ', '  '] // Whitespace only
    ];
    await createTestCSVFile(testData);
    
    const fileUpload = await createTestFileUpload();
    
    expect(processExcelFile(fileUpload.id)).rejects.toThrow(/No valid transactions/i);
  });

  it('should handle transactions with only one item', async () => {
    const testData = [
      ['Transaction ID', 'Item 1'],
      ['T001', 'SingleItem']
    ];
    await createTestCSVFile(testData);
    
    const fileUpload = await createTestFileUpload();
    
    const transactions = await processExcelFile(fileUpload.id);
    
    expect(transactions).toHaveLength(1);
    expect(transactions[0].transaction_id).toEqual('T001');
    expect(transactions[0].items).toEqual(['SingleItem']);
  });

  it('should trim whitespace from transaction IDs and items', async () => {
    const testData = [
      ['Transaction ID', 'Item 1', 'Item 2'],
      [' T001 ', ' Apple ', ' Banana ']
    ];
    await createTestCSVFile(testData);
    
    const fileUpload = await createTestFileUpload();
    
    const transactions = await processExcelFile(fileUpload.id);
    
    expect(transactions[0].transaction_id).toEqual('T001');
    expect(transactions[0].items).toEqual(['Apple', 'Banana']);
  });
});
