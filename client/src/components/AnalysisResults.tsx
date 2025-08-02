
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, Eye } from 'lucide-react';
import type { AnalysisResult } from '../../../server/src/schema';

interface AnalysisResultsProps {
  results: AnalysisResult[];
  isLoading: boolean;
  onRefresh: () => void;
  onSelectAnalysis: (analysisId: number) => void;
  selectedAnalysis: number | null;
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

export function AnalysisResults({ 
  results, 
  isLoading, 
  onRefresh, 
  onSelectAnalysis, 
  selectedAnalysis 
}: AnalysisResultsProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-48" />
                </div>
                <Skeleton className="h-6 w-20" />
              </div>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-16 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-4xl mb-2">📊</div>
        <p className="text-gray-500 mb-4">No analysis results yet</p>
        <p className="text-sm text-gray-400 mb-4">
          Run an analysis to see results here
        </p>
        <Button variant="outline" onClick={onRefresh} size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-600">
          {results.length} analysis result{results.length !== 1 ? 's' : ''}
        </p>
        <Button variant="outline" onClick={onRefresh} size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="space-y-4">
        {results.map((result: AnalysisResult) => (
          <Card 
            key={result.id}
            className={`transition-all hover:shadow-md ${
              selectedAnalysis === result.id ? 'ring-2 ring-blue-500' : ''
            }`}
          >
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">
                    Analysis #{result.id}
                  </CardTitle>
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                    <span>
                      🔍 {result.algorithm.toUpperCase()}
                    </span>
                    <span>
                      📊 Support: {(result.min_support * 100).toFixed(1)}%
                    </span>
                    <span>
                      🎯 Confidence: {(result.min_confidence * 100).toFixed(1)}%
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Created: {result.created_at.toLocaleDateString()} at{' '}
                    {result.created_at.toLocaleTimeString()}
                  </p>
                </div>
                <Badge 
                  className={statusColors[result.status]}
                  variant="secondary"
                >
                  {statusEmojis[result.status]} {result.status}
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent>
              {result.summary && (
                <div className="mb-4 p-3 bg-gray-50 rounded-md">
                  <p className="text-sm text-gray-700">{result.summary}</p>
                </div>
              )}
              
              {result.error_message && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-700">
                    ❌ {result.error_message}
                  </p>
                </div>
              )}

              <div className="flex justify-between items-center">
                <div className="text-xs text-gray-500">
                  {result.completed_at && (
                    <span>
                      Completed: {result.completed_at.toLocaleDateString()}
                    </span>
                  )}
                </div>
                
                {result.status === 'completed' && (
                  <Button
                    variant={selectedAnalysis === result.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => onSelectAnalysis(result.id)}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    {selectedAnalysis === result.id ? 'Selected' : 'View Dashboard'}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
