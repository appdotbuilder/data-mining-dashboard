
import { db } from '../db';
import { frequentItemsetsTable } from '../db/schema';
import { type FrequentItemset } from '../schema';
import { eq, desc } from 'drizzle-orm';

export async function getFrequentItemsets(analysisId: number): Promise<FrequentItemset[]> {
  try {
    const results = await db.select()
      .from(frequentItemsetsTable)
      .where(eq(frequentItemsetsTable.analysis_id, analysisId))
      .orderBy(desc(frequentItemsetsTable.support))
      .execute();

    // Convert numeric fields back to numbers and handle JSON arrays
    return results.map(itemset => ({
      ...itemset,
      support: parseFloat(itemset.support),
      itemset: itemset.itemset as string[] // Cast JSONB to string array
    }));
  } catch (error) {
    console.error('Failed to fetch frequent itemsets:', error);
    throw error;
  }
}
