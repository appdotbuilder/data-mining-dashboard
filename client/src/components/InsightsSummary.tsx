
import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { DashboardData, FrequentItemset, AssociationRule } from '../../../server/src/schema';

interface InsightsSummaryProps {
  dashboardData: DashboardData;
  summary: string | null;
}

export function InsightsSummary({ dashboardData, summary }: InsightsSummaryProps) {
  const insights = useMemo(() => {
    const { frequent_itemsets, association_rules } = dashboardData;
    
    // Top itemsets analysis
    const topItemsets = frequent_itemsets
      .sort((a, b) => b.support - a.support)
      .slice(0, 5);
    
    // High-lift rules analysis
    const strongRules = association_rules
      .filter(rule => rule.lift > 1.5)
      .sort((a, b) => b.lift - a.lift)
      .slice(0, 5);
    
    // Most frequent individual items
    const itemFrequency: Record<string, number> = {};
    frequent_itemsets.forEach(itemset => {
      itemset.itemset.forEach(item => {
        itemFrequency[item] = (itemFrequency[item] || 0) + itemset.frequency;
      });
    });
    
    const topItems = Object.entries(itemFrequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([item, freq]) => ({ item, frequency: freq }));
    
    // Pattern analysis
    const singleItemsets = frequent_itemsets.filter(itemset => itemset.itemset.length === 1);
    const pairItemsets = frequent_itemsets.filter(itemset => itemset.itemset.length === 2);
    const tripleItemsets = frequent_itemsets.filter(itemset => itemset.itemset.length === 3);
    
    return {
      topItemsets,
      strongRules,
      topItems,
      patterns: {
        single: singleItemsets.length,
        pairs: pairItemsets.length,
        triples: tripleItemsets.length,
        total: frequent_itemsets.length
      },
      stats: {
        avgSupport: frequent_itemsets.reduce((sum, item) => sum + item.support, 0) / frequent_itemsets.length,
        avgConfidence: association_rules.reduce((sum, rule) => sum + rule.confidence, 0) / association_rules.length,
        avgLift: association_rules.reduce((sum, rule) => sum + rule.lift, 0) / association_rules.length,
        maxLift: Math.max(...association_rules.map(rule => rule.lift)),
        strongRulesCount: strongRules.length
      }
    };
  }, [dashboardData]);

  return (
    <div className="space-y-6">
      {/* Executive Summary */}
      {summary && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              📋 Executive Summary
            </CardTitle>
            <CardDescription>
              AI-generated insights from your data mining analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none">
              <p className="text-gray-700 leading-relaxed">{summary}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            📊 Key Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {insights.patterns.total}
              </div>
              <div className="text-sm text-gray-600">Total Patterns</div>
            </div>
            
            {insights.stats.avgSupport && (
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {(insights.stats.avgSupport * 100).toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600">Avg Support</div>
              </div>
            )}
            
            {insights.stats.avgLift && (
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {insights.stats.avgLift.toFixed(2)}
                </div>
                <div className="text-sm text-gray-600">Avg Lift</div>
              </div>
            )}
            
            <div className="text-center p-3 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">
                {insights.stats.strongRulesCount}
              </div>
              <div className="text-sm text-gray-600">Strong Rules</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Performing Itemsets */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🏆 Top Performing Itemsets
            </CardTitle>
            <CardDescription>
              Most frequently occurring item combinations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {insights.topItemsets.map((itemset: FrequentItemset, index: number) => (
                <div key={itemset.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="text-xs">
                      #{index + 1}
                    </Badge>
                    <div className="flex flex-wrap gap-1">
                      {itemset.itemset.map((item, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {item}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="text-sm font-mono text-gray-600">
                    {(itemset.support * 100).toFixed(1)}%
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Strongest Association Rules */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🔗 Strongest Association Rules
            </CardTitle>
            <CardDescription>
              Rules with highest lift values (strongest correlations)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {insights.strongRules.map((rule: AssociationRule, index: number) => (
                <div key={rule.id} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline" className="text-xs">
                      #{index + 1}
                    </Badge>
                    <div className="text-sm font-mono font-semibold text-green-600">
                      Lift: {rule.lift.toFixed(2)}
                    </div>
                  </div>
                  <div className="text-sm">
                    <div className="flex items-center space-x-2">
                      <div className="flex gap-1">
                        {rule.antecedent.map((item, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {item}
                          </Badge>
                        ))}
                      </div>
                      <span className="text-gray-400">→</span>
                      <div className="flex gap-1">
                        {rule.consequent.map((item, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {item}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      Confidence: {(rule.confidence * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pattern Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            📈 Pattern Distribution
          </CardTitle>
          <CardDescription>
            Breakdown of itemset sizes discovered in your data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-3xl font-bold text-blue-600 mb-2">
                {insights.patterns.single}
              </div>
              <div className="text-sm text-gray-600">Single Items</div>
              <div className="text-xs text-gray-500 mt-1">
                Individual frequent items
              </div>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <div className="text-3xl font-bold text-green-600 mb-2">
                {insights.patterns.pairs}
              </div>
              <div className="text-sm text-gray-600">Item Pairs</div>
              <div className="text-xs text-gray-500 mt-1">
                Two-item combinations
              </div>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <div className="text-3xl font-bold text-purple-600 mb-2">
                {insights.patterns.triples}
              </div>
              <div className="text-sm text-gray-600">Triple Sets</div>
              <div className="text-xs text-gray-500 mt-1">
                Three-item combinations
              </div>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <div className="text-3xl font-bold text-orange-600 mb-2">
                {insights.patterns.total - insights.patterns.single - insights.patterns.pairs - insights.patterns.triples}
              </div>
              <div className="text-sm text-gray-600">Larger Sets</div>
              <div className="text-xs text-gray-500 mt-1">
                4+ item combinations
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Most Popular Items */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            ⭐ Most Popular Items
          </CardTitle>
          <CardDescription>
            Items that appear most frequently across all patterns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {insights.topItems.slice(0, 10).map(({ item, frequency }, index) => (
              <div key={item} className="text-center p-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border">
                <div className="text-lg font-bold text-blue-600 mb-1">
                  #{index + 1}
                </div>
                <Badge variant="secondary" className="mb-2 text-xs">
                  {item}
                </Badge>
                <div className="text-xs text-gray-600">
                  Freq: {frequency}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-800">
            💡 Data-Driven Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm text-blue-700">
            {insights.stats.strongRulesCount > 0 && (
              <div className="flex items-start space-x-2">
                <span className="text-green-600 font-bold">✓</span>
                <div>
                  <strong>Cross-selling opportunities:</strong> You have {insights.stats.strongRulesCount} strong association rules (lift {'>'} 1.5) that indicate good cross-selling potential.
                </div>
              </div>
            )}
            
            {insights.patterns.pairs > 0 && (
              <div className="flex items-start space-x-2">
                <span className="text-blue-600 font-bold">📊</span>
                <div>
                  <strong>Product bundling:</strong> Consider creating bundles based on the {insights.patterns.pairs} frequent item pairs discovered.
                </div>
              </div>
            )}
            
            {insights.topItems.length > 0 && (
              <div className="flex items-start space-x-2">
                <span className="text-purple-600 font-bold">⭐</span>
                <div>
                  <strong>Inventory focus:</strong> Items like "{insights.topItems[0]?.item}" appear in multiple patterns and should be prioritized in inventory management.
                </div>
              </div>
            )}
            
            <div className="flex items-start space-x-2">
              <span className="text-orange-600 font-bold">🎯</span>
              <div>
                <strong>Algorithm performance:</strong> {dashboardData.algorithm.toUpperCase()} identified {insights.patterns.total} patterns with an average support of {(insights.stats.avgSupport * 100).toFixed(1)}%.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
