
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Slider } from '@/components/ui/slider';
import { trpc } from '@/utils/trpc';
import type { FileUpload, AnalysisResult, CreateAnalysisInput } from '../../../server/src/schema';

interface AnalysisRunnerProps {
  fileUploads: FileUpload[];
  onAnalysisCompleted: (analysis: AnalysisResult) => void;
}

export function AnalysisRunner({ fileUploads, onAnalysisCompleted }: AnalysisRunnerProps) {
  const [selectedFileId, setSelectedFileId] = useState<number | null>(null);
  const [algorithm, setAlgorithm] = useState<'apriori' | 'fp-growth'>('apriori');
  const [minSupport, setMinSupport] = useState<number[]>([0.1]);
  const [minConfidence, setMinConfidence] = useState<number[]>([0.5]);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleRunAnalysis = async () => {
    if (!selectedFileId) {
      setError('Please select a file to analyze');
      return;
    }

    setIsRunning(true);
    setError(null);
    setSuccess(null);

    try {
      const analysisInput: CreateAnalysisInput = {
        file_upload_id: selectedFileId,
        algorithm,
        min_support: minSupport[0],
        min_confidence: minConfidence[0]
      };

      const result = algorithm === 'apriori' 
        ? await trpc.runAprioriAnalysis.mutate(analysisInput)
        : await trpc.runFpGrowthAnalysis.mutate(analysisInput);

      setSuccess(`${algorithm.toUpperCase()} analysis completed successfully!`);
      onAnalysisCompleted(result);
      
      // Reset form
      setSelectedFileId(null);
      setMinSupport([0.1]);
      setMinConfidence([0.5]);

    } catch (err) {
      console.error('Analysis failed:', err);
      setError('Analysis failed. Please check your parameters and try again.');
    } finally {
      setIsRunning(false);
      setTimeout(() => {
        setSuccess(null);
      }, 5000);
    }
  };

  if (fileUploads.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-4xl mb-2">📊</div>
        <p className="text-gray-500 mb-2">No processed files available</p>
        <p className="text-sm text-gray-400">
          Upload and process an Excel file first to run analysis
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* File Selection */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Select File for Analysis</Label>
        <Select 
          value={selectedFileId?.toString() || ''} 
          onValueChange={(value: string) => setSelectedFileId(parseInt(value))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Choose a processed file..." />
          </SelectTrigger>
          <SelectContent>
            {fileUploads.map((file: FileUpload) => (
              <SelectItem key={file.id} value={file.id.toString()}>
                <div className="flex items-center justify-between w-full">
                  <span>{file.original_name}</span>
                  <Badge variant="secondary" className="ml-2">
                    {file.status}
                  </Badge>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Algorithm Selection */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Mining Algorithm</Label>
        <div className="grid grid-cols-2 gap-4">
          <Card 
            className={`p-4 cursor-pointer transition-all ${
              algorithm === 'apriori' 
                ? 'ring-2 ring-blue-500 bg-blue-50' 
                : 'hover:bg-gray-50'
            }`}
            onClick={() => setAlgorithm('apriori')}
          >
            <div className="text-center">
              <h3 className="font-semibold">🔍 Apriori</h3>
              <p className="text-xs text-gray-600 mt-1">
                Classic breadth-first approach
              </p>
            </div>
          </Card>
          <Card 
            className={`p-4 cursor-pointer transition-all ${
              algorithm === 'fp-growth' 
                ? 'ring-2 ring-blue-500 bg-blue-50' 
                : 'hover:bg-gray-50'
            }`}
            onClick={() => setAlgorithm('fp-growth')}
          >
            <div className="text-center">
              <h3 className="font-semibold">🌳 FP-Growth</h3>
              <p className="text-xs text-gray-600 mt-1">
                Tree-based efficient approach
              </p>
            </div>
          </Card>
        </div>
      </div>

      {/* Parameters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <Label className="text-sm font-medium">
            Minimum Support: {(minSupport[0] * 100).toFixed(1)}%
          </Label>
          <Slider
            value={minSupport}
            onValueChange={setMinSupport}
            max={1}
            min={0.01}
            step={0.01}
            className="w-full"
          />
          <p className="text-xs text-gray-500">
            Minimum frequency threshold for itemsets
          </p>
        </div>

        <div className="space-y-3">
          <Label className="text-sm font-medium">
            Minimum Confidence: {(minConfidence[0] * 100).toFixed(1)}%
          </Label>
          <Slider
            value={minConfidence}
            onValueChange={setMinConfidence}
            max={1}
            min={0.01}
            step={0.01}
            className="w-full"
          />
          <p className="text-xs text-gray-500">
            Minimum confidence threshold for association rules
          </p>
        </div>
      </div>

      {/* Run Analysis Button */}
      <div className="flex justify-center">
        <Button 
          onClick={handleRunAnalysis}
          disabled={isRunning || !selectedFileId}
          size="lg"
          className="px-8"
        >
          {isRunning ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Running {algorithm.toUpperCase()} Analysis...
            </>
          ) : (
            <>
              🚀 Run {algorithm.toUpperCase()} Analysis
            </>
          )}
        </Button>
      </div>

      {/* Status Messages */}
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

      {/* Info Box */}
      <div className="text-xs text-gray-500 bg-gray-50 p-4 rounded-md">
        <p className="font-medium mb-2">💡 Algorithm Information:</p>
        <div className="space-y-1">
          <p><strong>Apriori:</strong> Uses candidate generation and pruning. Good for small to medium datasets.</p>
          <p><strong>FP-Growth:</strong> Uses tree structure without candidate generation. More efficient for large datasets.</p>
        </div>
      </div>
    </div>
  );
}
