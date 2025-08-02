
import { db } from '../db';
import { fileUploadsTable } from '../db/schema';
import { type CreateFileUploadInput, type FileUpload } from '../schema';

export const uploadFile = async (input: CreateFileUploadInput): Promise<FileUpload> => {
  try {
    // Insert file upload record
    const result = await db.insert(fileUploadsTable)
      .values({
        filename: input.filename,
        original_name: input.original_name,
        file_size: input.file_size,
        mime_type: input.mime_type,
        file_path: input.file_path
        // upload_date and status have defaults in the database
      })
      .returning()
      .execute();

    const fileUpload = result[0];
    return fileUpload;
  } catch (error) {
    console.error('File upload failed:', error);
    throw error;
  }
};
