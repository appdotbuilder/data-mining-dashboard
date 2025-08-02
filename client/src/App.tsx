
import { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { trpc } from '@/utils/trpc';
import { FileUpload } from './components/FileUpload';
import { AnalysisRunner } from './components/AnalysisRunner';
import { AnalysisResults } from './components/AnalysisResults';
import { DashboardVisualization } from './components/DashboardVisualization';
import { FileList } from './components/FileList';
import type { FileUpload as FileUploadType, AnalysisResult } from '../../server/src/schema';

function App() {
  const [fileUploads, setFileUploads] = useState<FileUploadType[]>([]);
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult[]>([]);
  const [selectedAnalysis, setSelectedAnalysis] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Load initial data with better error handling
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setConnectionError(null);
      
      // Try to make API calls with proper error handling
      const [uploads, results] = await Promise.all([
        trpc.getFileUploads.query().catch((error) => {
          console.warn('Failed to load file uploads:', error);
          return []; // Return empty array as fallback
        }),
        trpc.getAnalysisResults.query().catch((error) => {
          console.warn('Failed to load analysis results:', error);
          return []; // Return empty array as fallback
        })
      ]);
      
      setFileUploads(uploads);
      setAnalysisResults(results);
      
      // If both calls returned empty arrays, show a warning
      if (uploads.length === 0 && results.length === 0) {
        setConnectionError('Backend services are not fully implemented yet. The UI is working correctly and ready for data.');
      }
      
    } catch (error) {
      console.error('Failed to load data:', error);
      setConnectionError('Unable to connect to server. Backend may not be running or data endpoints may not be implemented yet.');
      // Set empty arrays as fallback
      setFileUploads([]);
      setAnalysisResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleFileUploaded = useCallback((newFile: FileUploadType) => {
    setFileUploads((prev: FileUploadType[]) => [newFile, ...prev]);
    // Clear connection error when we successfully interact with backend
    setConnectionError(null);
  }, []);

  const handleAnalysisCompleted = useCallback((newAnalysis: AnalysisResult) => {
    setAnalysisResults((prev: AnalysisResult[]) => [newAnalysis, ...prev]);
    // Auto-select the new analysis for visualization
    setSelectedAnalysis(newAnalysis.id);
    // Clear connection error when we successfully interact with backend
    setConnectionError(null);
  }, []);

  const completedAnalyses = analysisResults.filter(result => result.status === 'completed');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            📊 Data Mining Dashboard
          </h1>
          <p className="text-lg text-gray-600">
            Upload Excel files and discover patterns with Apriori & FP-Growth algorithms
          </p>
        </div>

        {/* Connection Status Alert */}
        {connectionError && (
          <Alert className="mb-6 border-yellow-200 bg-yellow-50">
            <AlertDescription className="text-yellow-700">
              ⚠️ {connectionError}
              <div className="mt-2 text-sm">
                The UI is fully functional and ready. Backend handlers are currently stubs that return empty data.
                You can still explore the interface and see how the data mining dashboard will work with real data.
              </div>
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="upload" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="upload">📁 Upload & Process</TabsTrigger>
            <TabsTrigger value="analyze">🔍 Run Analysis</TabsTrigger>
            <TabsTrigger value="results">📈 Results</TabsTrigger>
            <TabsTrigger value="dashboard">🎯 Dashboard</TabsTrigger>
          </TabsList>

          {/* Upload Tab */}
          <TabsContent value="upload" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    📤 Upload Excel File
                  </CardTitle>
                  <CardDescription>
                    Upload your transactional data in Excel format for analysis
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <FileUpload onFileUploaded={handleFileUploaded} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    📋 Uploaded Files
                    <Badge variant="secondary">{fileUploads.length}</Badge>
                  </CardTitle>
                  <CardDescription>
                    Your uploaded files and their processing status
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <FileList 
                    files={fileUploads} 
                    isLoading={isLoading}
                    onRefresh={loadData}
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Analysis Tab */}
          <TabsContent value="analyze" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  🚀 Run Data Mining Analysis
                </CardTitle>
                <CardDescription>
                  Configure and execute Apriori or FP-Growth algorithms on your processed data
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AnalysisRunner 
                  fileUploads={fileUploads.filter(f => f.status === 'completed')}
                  onAnalysisCompleted={handleAnalysisCompleted}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Results Tab */}
          <TabsContent value="results" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  📊 Analysis Results
                  <Badge variant="secondary">{analysisResults.length}</Badge>
                </CardTitle>
                <CardDescription>
                  View and manage your completed data mining analyses
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AnalysisResults 
                  results={analysisResults}
                  isLoading={isLoading}
                  onRefresh={loadData}
                  onSelectAnalysis={setSelectedAnalysis}
                  selectedAnalysis={selectedAnalysis}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            {selectedAnalysis ? (
              <DashboardVisualization analysisId={selectedAnalysis} />
            ) : completedAnalyses.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>🎯 Select Analysis for Visualization</CardTitle>
                  <CardDescription>
                    Choose an analysis from the results tab to view interactive visualizations
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4">
                    {completedAnalyses.map((analysis: AnalysisResult) => (
                      <div 
                        key={analysis.id}
                        className="p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => setSelectedAnalysis(analysis.id)}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <h3 className="font-semibold">Analysis #{analysis.id}</h3>
                            <p className="text-sm text-gray-600">
                              Algorithm: {analysis.algorithm.toUpperCase()} | 
                              Created: {analysis.created_at.toLocaleDateString()}
                            </p>
                          </div>
                          <Badge>{analysis.status}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>🎯 Dashboard Preview</CardTitle>
                  <CardDescription>
                    Interactive visualizations for your data mining analysis results
                  </CardDescription>
                </CardHeader>
                <CardContent className="py-8">
                  <div className="text-center mb-6">
                    <p className="text-gray-500 mb-4">
                      Once you upload files and run analysis, you'll see interactive charts and insights here.
                    </p>
                    <div className="flex justify-center space-x-2 mb-6">
                      <span className="text-2xl">📊</span>
                      <span className="text-2xl">📈</span>
                      <span className="text-2xl">🔍</span>
                    </div>
                  </div>
                  
                  {/* Preview Cards showing what will be displayed */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="p-4 bg-blue-50 rounded-lg border-2 border-dashed border-blue-200">
                      <div className="text-center">
                        <div className="text-xl font-bold text-blue-600 mb-1">📊</div>
                        <div className="text-sm font-medium">Frequent Itemsets</div>
                        <div className="text-xs text-gray-600 mt-1">Bar charts showing support values</div>
                      </div>
                    </div>
                    
                    <div className="p-4 bg-green-50 rounded-lg border-2 border-dashed border-green-200">
                      <div className="text-center">
                        <div className="text-xl font-bold text-green-600 mb-1">🕸️</div>
                        <div className="text-sm font-medium">Association Rules</div>
                        <div className="text-xs text-gray-600 mt-1">Network visualization of relationships</div>
                      </div>
                    </div>
                    
                    <div className="p-4 bg-purple-50 rounded-lg border-2 border-dashed border-purple-200">
                      <div className="text-center">
                        <div className="text-xl font-bold text-purple-600 mb-1">💡</div>
                        <div className="text-sm font-medium">AI Insights</div>
                        <div className="text-xs text-gray-600 mt-1">Business recommendations</div>
                      </div>
                    </div>
                  </div>

                  {/* Sample visualization preview */}
                  <div className="bg-gray-50 rounded-lg p-6 border">
                    <h4 className="font-medium text-gray-700 mb-4">Sample Dashboard Features:</h4>
                    <div className="space-y-3 text-sm text-gray-600">
                      <div className="flex items-center space-x-2">
                        <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                        <span>Interactive bar charts for frequent itemset analysis</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        <span>Network graphs showing association rules with lift, confidence, and support</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                        <span>Automated insights and business recommendations</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                        <span>Pattern distribution analysis and top item rankings</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-center text-sm text-gray-500 mt-6">
                    Start by uploading an Excel file in the "Upload & Process" tab
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        <Separator className="my-8" />
        
        {/* Footer */}
        <div className="text-center text-sm text-gray-500">
          <p>Data Mining Dashboard - Discover patterns in your transactional data 🚀</p>
          {connectionError && (
            <p className="mt-2 text-xs text-yellow-600">
              Demo mode: UI fully functional, backend implementation pending
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
