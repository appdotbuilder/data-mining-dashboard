
import { db } from '../db';
import { analysisResultsTable } from '../db/schema';
import { type AnalysisResult } from '../schema';
import { eq } from 'drizzle-orm';

export const getAnalysisById = async (analysisId: number): Promise<AnalysisResult | null> => {
  try {
    const results = await db.select()
      .from(analysisResultsTable)
      .where(eq(analysisResultsTable.id, analysisId))
      .execute();

    if (results.length === 0) {
      return null;
    }

    const analysisResult = results[0];
    
    // Convert numeric fields back to numbers
    return {
      ...analysisResult,
      min_support: parseFloat(analysisResult.min_support),
      min_confidence: parseFloat(analysisResult.min_confidence)
    };
  } catch (error) {
    console.error('Failed to get analysis by ID:', error);
    throw error;
  }
};
