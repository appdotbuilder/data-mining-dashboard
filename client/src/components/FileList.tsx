
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw } from 'lucide-react';
import type { FileUpload } from '../../../server/src/schema';

interface FileListProps {
  files: FileUpload[];
  isLoading: boolean;
  onRefresh: () => void;
}

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800'
};

const statusEmojis = {
  pending: '⏳',
  processing: '🔄',
  completed: '✅',
  failed: '❌'
};

export function FileList({ files, isLoading, onRefresh }: FileListProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-6 w-16" />
          </div>
        ))}
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-4xl mb-2">📁</div>
        <p className="text-gray-500 mb-4">No files uploaded yet</p>
        <Button variant="outline" onClick={onRefresh} size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-600">
          {files.length} file{files.length !== 1 ? 's' : ''} uploaded
        </p>
        <Button variant="outline" onClick={onRefresh} size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>
      
      <div className="max-h-64 overflow-y-auto space-y-2">
        {files.map((file: FileUpload) => (
          <div key={file.id} className="p-3 border rounded-lg hover:bg-gray-50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">
                  {file.original_name}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-xs text-gray-500">
                    {(file.file_size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  <span className="text-xs text-gray-400">•</span>
                  <p className="text-xs text-gray-500">
                    {file.upload_date.toLocaleDateString()}
                  </p>
                </div>
              </div>
              <Badge 
                className={`ml-2 ${statusColors[file.status]}`}
                variant="secondary"
              >
                {statusEmojis[file.status]} {file.status}
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
