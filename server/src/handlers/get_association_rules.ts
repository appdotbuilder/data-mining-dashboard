
import { db } from '../db';
import { associationRulesTable } from '../db/schema';
import { type AssociationRule } from '../schema';
import { eq, desc } from 'drizzle-orm';

export async function getAssociationRules(analysisId: number): Promise<AssociationRule[]> {
  try {
    const results = await db.select()
      .from(associationRulesTable)
      .where(eq(associationRulesTable.analysis_id, analysisId))
      .orderBy(desc(associationRulesTable.confidence), desc(associationRulesTable.lift))
      .execute();

    // Convert numeric fields back to numbers and parse JSON arrays
    return results.map(rule => ({
      ...rule,
      antecedent: rule.antecedent as string[],
      consequent: rule.consequent as string[],
      support: parseFloat(rule.support),
      confidence: parseFloat(rule.confidence),
      lift: parseFloat(rule.lift)
    }));
  } catch (error) {
    console.error('Failed to fetch association rules:', error);
    throw error;
  }
}
