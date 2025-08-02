
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { trpc } from '@/utils/trpc';
import type { FileUpload as FileUploadType, CreateFileUploadInput } from '../../../server/src/schema';

interface FileUploadProps {
  onFileUploaded: (file: FileUploadType) => void;
}

export function FileUpload({ onFileUploaded }: FileUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setError(null);
      setSuccess(null);
      
      // Validate file type
      if (!file.name.toLowerCase().endsWith('.xlsx') && !file.name.toLowerCase().endsWith('.xls')) {
        setError('Please select an Excel file (.xlsx or .xls)');
        setSelectedFile(null);
        return;
      }
      
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB');
        setSelectedFile(null);
        return;
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev: number) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      // Create file upload record
      const uploadData: CreateFileUploadInput = {
        filename: `${Date.now()}_${selectedFile.name}`,
        original_name: selectedFile.name,
        file_size: selectedFile.size,
        mime_type: selectedFile.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        file_path: `/uploads/${Date.now()}_${selectedFile.name}` // This would be actual path in real implementation
      };

      const uploadedFile = await trpc.uploadFile.mutate(uploadData);
      
      clearInterval(progressInterval);
      setUploadProgress(100);

      // Process the Excel file
      await trpc.processExcelFile.mutate({ fileUploadId: uploadedFile.id });

      setSuccess(`Successfully uploaded and processed: ${selectedFile.name}`);
      onFileUploaded(uploadedFile);
      setSelectedFile(null);
      
      // Reset form
      const fileInput = document.getElementById('file-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

    } catch (err) {
      console.error('Upload failed:', err);
      setError('Failed to upload file. Please try again.');
    } finally {
      setIsUploading(false);
      setTimeout(() => {
        setUploadProgress(0);
        setSuccess(null);
      }, 3000);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="file-upload" className="text-sm font-medium">
          Select Excel File
        </Label>
        <Input
          id="file-upload"
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileSelect}
          disabled={isUploading}
          className="cursor-pointer"
        />
        <p className="text-xs text-gray-500">
          Supported formats: .xlsx, .xls (max 10MB)
        </p>
      </div>

      {selectedFile && (
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{selectedFile.name}</p>
              <p className="text-xs text-gray-600">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            <Button 
              onClick={handleUpload}
              disabled={isUploading}
              className="ml-4"
            >
              {isUploading ? 'Uploading...' : 'Upload & Process'}
            </Button>
          </div>
        </Card>
      )}

      {isUploading && (
        <div className="space-y-2">
          <Progress value={uploadProgress} className="w-full" />
          <p className="text-xs text-center text-gray-600">
            Uploading and processing file... {uploadProgress}%
          </p>
        </div>
      )}

      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertDescription className="text-red-700">
            ❌ {error}
          </AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-200 bg-green-50">
          <AlertDescription className="text-green-700">
            ✅ {success}
          </AlertDescription>
        </Alert>
      )}

      <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-md">
        <p className="font-medium mb-1">📋 Expected File Format:</p>
        <ul className="space-y-1">
          <li>• Excel file with transaction data</li>
          <li>• Each row should represent a transaction</li>
          <li>• Items should be in separate columns or comma-separated</li>
          <li>• First row can contain headers</li>
        </ul>
      </div>
    </div>
  );
}
