
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { fileUploadsTable } from '../db/schema';
import { type CreateFileUploadInput } from '../schema';
import { uploadFile } from '../handlers/upload_file';
import { eq } from 'drizzle-orm';

// Test input
const testInput: CreateFileUploadInput = {
  filename: 'test-file.csv',
  original_name: 'original-test-file.csv',
  file_size: 1024,
  mime_type: 'text/csv',
  file_path: '/uploads/test-file.csv'
};

describe('uploadFile', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should upload a file record', async () => {
    const result = await uploadFile(testInput);

    // Basic field validation
    expect(result.filename).toEqual('test-file.csv');
    expect(result.original_name).toEqual('original-test-file.csv');
    expect(result.file_size).toEqual(1024);
    expect(result.mime_type).toEqual('text/csv');
    expect(result.file_path).toEqual('/uploads/test-file.csv');
    expect(result.id).toBeDefined();
    expect(result.upload_date).toBeInstanceOf(Date);
    expect(result.status).toEqual('pending');
  });

  it('should save file upload to database', async () => {
    const result = await uploadFile(testInput);

    // Query using proper drizzle syntax
    const fileUploads = await db.select()
      .from(fileUploadsTable)
      .where(eq(fileUploadsTable.id, result.id))
      .execute();

    expect(fileUploads).toHaveLength(1);
    expect(fileUploads[0].filename).toEqual('test-file.csv');
    expect(fileUploads[0].original_name).toEqual('original-test-file.csv');
    expect(fileUploads[0].file_size).toEqual(1024);
    expect(fileUploads[0].mime_type).toEqual('text/csv');
    expect(fileUploads[0].file_path).toEqual('/uploads/test-file.csv');
    expect(fileUploads[0].upload_date).toBeInstanceOf(Date);
    expect(fileUploads[0].status).toEqual('pending');
  });

  it('should set default status to pending', async () => {
    const result = await uploadFile(testInput);

    expect(result.status).toEqual('pending');
  });

  it('should set upload_date to current time', async () => {
    const beforeUpload = new Date();
    const result = await uploadFile(testInput);
    const afterUpload = new Date();

    expect(result.upload_date).toBeInstanceOf(Date);
    expect(result.upload_date.getTime()).toBeGreaterThanOrEqual(beforeUpload.getTime());
    expect(result.upload_date.getTime()).toBeLessThanOrEqual(afterUpload.getTime());
  });
});
