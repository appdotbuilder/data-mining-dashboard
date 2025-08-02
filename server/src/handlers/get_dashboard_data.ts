
import { db } from '../db';
import { analysisResultsTable, frequentItemsetsTable, associationRulesTable } from '../db/schema';
import { type DashboardData } from '../schema';
import { eq } from 'drizzle-orm';

export async function getDashboardData(analysisId: number): Promise<DashboardData | null> {
  try {
    // Fetch analysis result by ID
    const analysisResults = await db.select()
      .from(analysisResultsTable)
      .where(eq(analysisResultsTable.id, analysisId))
      .execute();

    if (analysisResults.length === 0) {
      return null;
    }

    const analysisResult = analysisResults[0];

    // Fetch all frequent itemsets for the analysis
    const frequentItemsets = await db.select()
      .from(frequentItemsetsTable)
      .where(eq(frequentItemsetsTable.analysis_id, analysisId))
      .execute();

    // Fetch all association rules for the analysis
    const associationRules = await db.select()
      .from(associationRulesTable)
      .where(eq(associationRulesTable.analysis_id, analysisId))
      .execute();

    // Convert numeric fields back to numbers and format data
    const formattedFrequentItemsets = frequentItemsets.map(itemset => ({
      ...itemset,
      support: parseFloat(itemset.support),
      itemset: itemset.itemset as string[]
    }));

    const formattedAssociationRules = associationRules.map(rule => ({
      ...rule,
      support: parseFloat(rule.support),
      confidence: parseFloat(rule.confidence),
      lift: parseFloat(rule.lift),
      antecedent: rule.antecedent as string[],
      consequent: rule.consequent as string[]
    }));

    // Combine all data into dashboard data object
    return {
      analysis_id: analysisId,
      frequent_itemsets: formattedFrequentItemsets,
      association_rules: formattedAssociationRules,
      summary: analysisResult.summary,
      algorithm: analysisResult.algorithm,
      parameters: {
        algorithm: analysisResult.algorithm,
        min_support: parseFloat(analysisResult.min_support),
        min_confidence: parseFloat(analysisResult.min_confidence)
      }
    };
  } catch (error) {
    console.error('Dashboard data fetch failed:', error);
    throw error;
  }
}
