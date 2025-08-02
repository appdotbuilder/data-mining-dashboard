
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import { FrequentItemsetsChart } from './FrequentItemsetsChart';
import { AssociationRulesNetwork } from './AssociationRulesNetwork';
import { InsightsSummary } from './InsightsSummary';
import type { DashboardData } from '../../../server/src/schema';

interface DashboardVisualizationProps {
  analysisId: number;
}

export function DashboardVisualization({ analysisId }: DashboardVisualizationProps) {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await trpc.getDashboardData.query({ analysisId });
      setDashboardData(data);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [analysisId]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-64 mt-2" />
              </div>
              <Skeleton className="h-6 w-20" />
            </div>
          </CardHeader>
        </Card>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Alert className="border-red-200 bg-red-50">
            <AlertDescription className="text-red-700">
              {error}
            </AlertDescription>
          </Alert>
          <div className="flex justify-center mt-4">
            <Button onClick={loadDashboardData} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!dashboardData) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <div className="text-4xl mb-2">📊</div>
            <p className="text-gray-500">No dashboard data available</p>
            <p className="text-sm text-gray-400 mt-2">
              The analysis may still be processing or may have failed.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center gap-2">
                🎯 Analysis Dashboard #{dashboardData.analysis_id}
              </CardTitle>
              <CardDescription className="mt-2">
                Interactive visualizations and insights from your data mining analysis
              </CardDescription>
              <div className="flex items-center gap-4 mt-3">
                <Badge variant="secondary">
                  {dashboardData.algorithm.toUpperCase()}
                </Badge>
                <span className="text-sm text-gray-600">
                  Support: {(dashboardData.parameters.min_support * 100).toFixed(1)}%
                </span>
                <span className="text-sm text-gray-600">
                  Confidence: {(dashboardData.parameters.min_confidence * 100).toFixed(1)}%
                </span>
              </div>
            </div>
            <Button onClick={loadDashboardData} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {dashboardData.frequent_itemsets.length}
              </div>
              <p className="text-sm text-gray-600">Frequent Itemsets</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {dashboardData.association_rules.length}
              </div>
              <p className="text-sm text-gray-600">Association Rules</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {dashboardData.association_rules.length > 0 
                  ? Math.max(...dashboardData.association_rules.map(rule => rule.lift)).toFixed(2)
                  : '0'
                }
              </div>
              <p className="text-sm text-gray-600">Max Lift</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Visualizations */}
      <Tabs defaultValue="itemsets" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="itemsets">📊 Frequent Itemsets</TabsTrigger>
          <TabsTrigger value="rules">🕸️ Association Rules</TabsTrigger>
          <TabsTrigger value="insights">💡 Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="itemsets">
          <Card>
            <CardHeader>
              <CardTitle>Frequent Itemsets Distribution</CardTitle>
              <CardDescription>
                Bar chart showing the support values of discovered frequent itemsets
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FrequentItemsetsChart itemsets={dashboardData.frequent_itemsets} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rules">
          <Card>
            <CardHeader>
              <CardTitle>Association Rules Network</CardTitle>
              <CardDescription>
                Network visualization of association rules showing relationships between items
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AssociationRulesNetwork rules={dashboardData.association_rules} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights">
          <InsightsSummary 
            dashboardData={dashboardData}
            summary={dashboardData.summary}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
