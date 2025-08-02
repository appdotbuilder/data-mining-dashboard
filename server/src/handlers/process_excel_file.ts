
import { db } from '../db';
import { fileUploadsTable, transactionsTable } from '../db/schema';
import { type Transaction } from '../schema';
import { eq } from 'drizzle-orm';
import { readFile } from 'fs/promises';

// Simple CSV parser for Excel-like data (assuming CSV format for now)
function parseCSVData(content: string): string[][] {
  const lines = content.split('\n').filter(line => line.trim());
  return lines.map(line => {
    // Simple CSV parsing - split by comma and clean whitespace
    return line.split(',').map(cell => cell.trim().replace(/^["']|["']$/g, ''));
  });
}

export async function processExcelFile(fileUploadId: number): Promise<Transaction[]> {
  try {
    // Update file status to processing
    await db.update(fileUploadsTable)
      .set({ status: 'processing' })
      .where(eq(fileUploadsTable.id, fileUploadId))
      .execute();

    // Get file upload record
    const fileUploadRecords = await db.select()
      .from(fileUploadsTable)
      .where(eq(fileUploadsTable.id, fileUploadId))
      .execute();

    if (fileUploadRecords.length === 0) {
      throw new Error(`File upload with id ${fileUploadId} not found`);
    }

    const fileUpload = fileUploadRecords[0];

    // Read the file as text (assuming CSV format for simplicity)
    const fileContent = await readFile(fileUpload.file_path, 'utf-8');
    
    if (!fileContent.trim()) {
      throw new Error('File is empty');
    }

    // Parse CSV data
    const rawData = parseCSVData(fileContent);
    
    if (rawData.length === 0) {
      throw new Error('File contains no data');
    }

    // Skip header row if present
    const dataRows = rawData.slice(1).filter(row => row.length > 0);
    
    const transactions: Transaction[] = [];
    
    for (const row of dataRows) {
      if (row.length < 2) continue; // Need at least transaction_id and one item
      
      const transactionId = String(row[0]).trim();
      if (!transactionId) continue;
      
      // Extract items from remaining columns, filter out empty values
      const items = row.slice(1)
        .map(item => String(item).trim())
        .filter(item => item && item !== '' && item !== 'undefined' && item !== 'null');
      
      if (items.length === 0) continue; // Skip transactions with no items
      
      // Insert transaction record
      const result = await db.insert(transactionsTable)
        .values({
          file_upload_id: fileUploadId,
          transaction_id: transactionId,
          items: items // Store array directly - JSONB will handle the conversion
        })
        .returning()
        .execute();

      // The items field is already an array from JSONB, no need to parse
      const transaction = result[0];
      transactions.push({
        ...transaction,
        items: transaction.items as string[] // Type assertion since JSONB returns unknown
      });
    }

    if (transactions.length === 0) {
      throw new Error('No valid transactions found in file');
    }

    // Update file status to completed
    await db.update(fileUploadsTable)
      .set({ status: 'completed' })
      .where(eq(fileUploadsTable.id, fileUploadId))
      .execute();

    return transactions;

  } catch (error) {
    console.error('File processing failed:', error);
    
    // Update file status to failed
    try {
      await db.update(fileUploadsTable)
        .set({ status: 'failed' })
        .where(eq(fileUploadsTable.id, fileUploadId))
        .execute();
    } catch (updateError) {
      console.error('Failed to update file status to failed:', updateError);
    }
    
    throw error;
  }
}
