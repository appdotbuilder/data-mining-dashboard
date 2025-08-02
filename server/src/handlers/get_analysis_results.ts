
import { db } from '../db';
import { analysisResultsTable } from '../db/schema';
import { type AnalysisResult } from '../schema';
import { desc } from 'drizzle-orm';

export const getAnalysisResults = async (): Promise<AnalysisResult[]> => {
  try {
    const results = await db.select()
      .from(analysisResultsTable)
      .orderBy(desc(analysisResultsTable.created_at))
      .execute();

    // Convert numeric fields back to numbers
    return results.map(result => ({
      ...result,
      min_support: parseFloat(result.min_support),
      min_confidence: parseFloat(result.min_confidence)
    }));
  } catch (error) {
    console.error('Failed to fetch analysis results:', error);
    throw error;
  }
};
