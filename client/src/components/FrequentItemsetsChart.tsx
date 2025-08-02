
import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { FrequentItemset } from '../../../server/src/schema';

interface FrequentItemsetsChartProps {
  itemsets: FrequentItemset[];
}

export function FrequentItemsetsChart({ itemsets }: FrequentItemsetsChartProps) {
  const chartData = useMemo(() => {
    // Sort itemsets by support (descending) and take top 20
    return itemsets
      .sort((a, b) => b.support - a.support)
      .slice(0, 20)
      .map((itemset, index) => ({
        ...itemset,
        label: itemset.itemset.join(', '),
        percentage: (itemset.support * 100).toFixed(1),
        rank: index + 1
      }));
  }, [itemsets]);

  const maxSupport = Math.max(...chartData.map(item => item.support));

  if (itemsets.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-4xl mb-2">📊</div>
        <p className="text-gray-500">No frequent itemsets found</p>
        <p className="text-sm text-gray-400">
          Try lowering the minimum support threshold
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-gray-600 mb-4">
        Showing top {Math.min(20, itemsets.length)} itemsets (total: {itemsets.length})
      </div>
      
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {chartData.map((item) => (
          <div key={item.id} className="flex items-center space-x-4">
            <div className="w-8 text-xs text-gray-500 font-mono">
              #{item.rank}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <div className="font-medium text-sm truncate">
                  {item.itemset.map((item, index) => (
                    <span key={index}>
                      <Badge variant="outline" className="mr-1 text-xs">
                        {item}
                      </Badge>
                    </span>
                  ))}
                </div>
                <div className="text-sm font-mono text-gray-600">
                  {item.percentage}%
                </div>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${(item.support / maxSupport) * 100}%`
                  }}
                />
              </div>
              
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Frequency: {item.frequency}</span>
                <span>Support: {item.support.toFixed(4)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {itemsets.length > 20 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-4">
            <p className="text-sm text-blue-700 text-center">
              📈 {itemsets.length - 20} more itemsets available in the full analysis
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
