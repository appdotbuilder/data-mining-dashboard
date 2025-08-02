
import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { AssociationRule } from '../../../server/src/schema';

interface AssociationRulesNetworkProps {
  rules: AssociationRule[];
}

interface ProcessedRule extends AssociationRule {
  antecedentText: string;
  consequentText: string;
  confidencePercentage: number;
  supportPercentage: number;
  liftColor: string;
}

export function AssociationRulesNetwork({ rules }: AssociationRulesNetworkProps) {
  const processedRules = useMemo(() => {
    return rules
      .sort((a, b) => b.lift - a.lift) // Sort by lift descending
      .slice(0, 15) // Show top 15 rules
      .map((rule): ProcessedRule => ({
        ...rule,
        antecedentText: rule.antecedent.join(', '),
        consequentText: rule.consequent.join(', '),
        confidencePercentage: rule.confidence * 100,
        supportPercentage: rule.support * 100,
        liftColor: rule.lift >= 2 ? 'text-green-600' : 
                  rule.lift >= 1.5 ? 'text-blue-600' : 
                  rule.lift >= 1 ? 'text-yellow-600' : 'text-red-600'
      }));
  }, [rules]);

  const maxLift = Math.max(...processedRules.map(rule => rule.lift));

  if (rules.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-4xl mb-2">🕸️</div>
        <p className="text-gray-500">No association rules found</p>
        <p className="text-sm text-gray-400">
          Try lowering the minimum confidence threshold
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-gray-600 mb-4">
        Showing top {Math.min(15, rules.length)} rules by lift (total: {rules.length})
      </div>

      {/* Legend */}
      <Card className="bg-gray-50">
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="font-medium">Support:</span> How frequently items appear together
            </div>
            <div>
              <span className="font-medium">Confidence:</span> Likelihood of consequent given antecedent
            </div>
            <div>
              <span className="font-medium">Lift:</span> Strength of association ({'>'}1 = positive correlation)
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium">Quality:</span>
              <span className="text-green-600">●</span> Excellent (≥2.0)
              <span className="text-blue-600">●</span> Good (≥1.5)
              <span className="text-yellow-600">●</span> Fair (≥1.0)
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4 max-h-96 overflow-y-auto">
        {processedRules.map((rule) => (
          <Card key={rule.id} className="hover:shadow-md transition-shadow">
            <CardContent className="pt-4">
              <div className="space-y-3">
                {/* Rule visualization */}
                <div className="flex items-center space-x-3">
                  <div className="flex-1 text-center">
                    <div className="flex flex-wrap justify-center gap-1 mb-1">
                      {rule.antecedent.map((item, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {item}
                        </Badge>
                      ))}
                    </div>
                    <div className="text-xs text-gray-500">Antecedent</div>
                  </div>
                  
                  <div className="text-2xl text-gray-400">
                    →
                  </div>
                  
                  <div className="flex-1 text-center">
                    <div className="flex flex-wrap justify-center gap-1 mb-1">
                      {rule.consequent.map((item, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {item}
                        </Badge>
                      ))}
                    </div>
                    <div className="text-xs text-gray-500">Consequent</div>
                  </div>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-gray-600">Support</span>
                      <span className="font-mono">{rule.supportPercentage.toFixed(1)}%</span>
                    </div>
                    <Progress value={rule.supportPercentage * 2} className="h-2" />
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-gray-600">Confidence</span>
                      <span className="font-mono">{rule.confidencePercentage.toFixed(1)}%</span>
                    </div>
                    <Progress 
                      value={rule.confidencePercentage} 
                      className="h-2"
                    />
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-gray-600">Lift</span>
                      <span className={`font-mono ${rule.liftColor} font-semibold`}>
                        {rule.lift.toFixed(2)}
                      </span>
                    </div>
                    <Progress 
                      value={Math.min((rule.lift / maxLift) * 100, 100)} 
                      className="h-2"
                    />
                  </div>
                </div>

                {/* Rule interpretation */}
                <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                  <span className="font-medium">Interpretation:</span> 
                  {rule.confidencePercentage.toFixed(0)}% of transactions containing{' '}
                  <em>{rule.antecedentText}</em> also contain{' '}
                  <em>{rule.consequentText}</em>
                  {rule.lift > 1 && (
                    <span>, which is {rule.lift.toFixed(1)}x more likely than random chance</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {rules.length > 15 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-4">
            <p className="text-sm text-blue-700 text-center">
              🔗 {rules.length - 15} more association rules available in the full analysis
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
