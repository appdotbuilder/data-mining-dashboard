
import { db } from '../db';
import { fileUploadsTable } from '../db/schema';
import { type FileUpload } from '../schema';
import { desc } from 'drizzle-orm';

export async function getFileUploads(): Promise<FileUpload[]> {
  try {
    const results = await db.select()
      .from(fileUploadsTable)
      .orderBy(desc(fileUploadsTable.upload_date))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch file uploads:', error);
    throw error;
  }
}
