
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { fileUploadsTable } from '../db/schema';
import { getFileUploads } from '../handlers/get_file_uploads';

describe('getFileUploads', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no file uploads exist', async () => {
    const result = await getFileUploads();
    expect(result).toEqual([]);
  });

  it('should return all file uploads', async () => {
    // Create test file uploads with explicit timestamps to ensure predictable ordering
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);

    await db.insert(fileUploadsTable).values([
      {
        filename: 'test1.csv',
        original_name: 'transactions1.csv',
        file_size: 1024,
        mime_type: 'text/csv',
        file_path: '/uploads/test1.csv',
        upload_date: oneMinuteAgo,
        status: 'completed'
      },
      {
        filename: 'test2.csv',
        original_name: 'transactions2.csv',
        file_size: 2048,
        mime_type: 'text/csv',
        file_path: '/uploads/test2.csv',
        upload_date: now,
        status: 'pending'
      }
    ]).execute();

    const result = await getFileUploads();

    expect(result).toHaveLength(2);
    // Most recent first (test2.csv uploaded at 'now')
    expect(result[0].filename).toEqual('test2.csv');
    expect(result[0].original_name).toEqual('transactions2.csv');
    expect(result[0].file_size).toEqual(2048);
    expect(result[0].status).toEqual('pending');
    expect(result[0].id).toBeDefined();
    expect(result[0].upload_date).toBeInstanceOf(Date);

    // Older one second (test1.csv uploaded at 'oneMinuteAgo')
    expect(result[1].filename).toEqual('test1.csv');
    expect(result[1].status).toEqual('completed');
  });

  it('should return file uploads ordered by upload date (most recent first)', async () => {
    // Create file uploads with specific timestamps
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

    await db.insert(fileUploadsTable).values([
      {
        filename: 'oldest.csv',
        original_name: 'oldest.csv',
        file_size: 1000,
        mime_type: 'text/csv',
        file_path: '/uploads/oldest.csv',
        upload_date: twoHoursAgo,
        status: 'completed'
      },
      {
        filename: 'newest.csv',
        original_name: 'newest.csv',
        file_size: 3000,
        mime_type: 'text/csv',
        file_path: '/uploads/newest.csv',
        upload_date: now,
        status: 'pending'
      },
      {
        filename: 'middle.csv',
        original_name: 'middle.csv',
        file_size: 2000,
        mime_type: 'text/csv',
        file_path: '/uploads/middle.csv',
        upload_date: oneHourAgo,
        status: 'processing'
      }
    ]).execute();

    const result = await getFileUploads();

    expect(result).toHaveLength(3);
    // Should be ordered by upload_date descending (newest first)
    expect(result[0].filename).toEqual('newest.csv');
    expect(result[1].filename).toEqual('middle.csv');
    expect(result[2].filename).toEqual('oldest.csv');
    
    // Verify actual date ordering
    expect(result[0].upload_date >= result[1].upload_date).toBe(true);
    expect(result[1].upload_date >= result[2].upload_date).toBe(true);
  });

  it('should include all required fields in response', async () => {
    await db.insert(fileUploadsTable).values({
      filename: 'complete.csv',
      original_name: 'complete_transactions.csv',
      file_size: 5120,
      mime_type: 'text/csv',
      file_path: '/uploads/complete.csv',
      status: 'failed'
    }).execute();

    const result = await getFileUploads();

    expect(result).toHaveLength(1);
    const fileUpload = result[0];
    
    expect(fileUpload.id).toBeDefined();
    expect(typeof fileUpload.id).toBe('number');
    expect(fileUpload.filename).toEqual('complete.csv');
    expect(fileUpload.original_name).toEqual('complete_transactions.csv');
    expect(fileUpload.file_size).toEqual(5120);
    expect(fileUpload.mime_type).toEqual('text/csv');
    expect(fileUpload.file_path).toEqual('/uploads/complete.csv');
    expect(fileUpload.upload_date).toBeInstanceOf(Date);
    expect(fileUpload.status).toEqual('failed');
  });
});
