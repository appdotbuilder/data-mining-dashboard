
import { db } from '../db';
import { transactionsTable, analysisResultsTable, frequentItemsetsTable, associationRulesTable } from '../db/schema';
import { type CreateAnalysisInput, type AnalysisResult } from '../schema';
import { eq } from 'drizzle-orm';

interface ItemsetSupport {
  itemset: string[];
  support: number;
  frequency: number;
}

interface AssociationRuleData {
  antecedent: string[];
  consequent: string[];
  support: number;
  confidence: number;
  lift: number;
}

export async function runAprioriAnalysis(input: CreateAnalysisInput): Promise<AnalysisResult> {
  let analysisId: number;
  
  try {
    // 1. Create analysis result record with 'processing' status
    const analysisResult = await db.insert(analysisResultsTable)
      .values({
        file_upload_id: input.file_upload_id,
        algorithm: input.algorithm,
        min_support: input.min_support.toString(),
        min_confidence: input.min_confidence.toString(),
        status: 'processing'
      })
      .returning()
      .execute();

    analysisId = analysisResult[0].id;

    // 2. Fetch transactions for the given file_upload_id
    const transactions = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.file_upload_id, input.file_upload_id))
      .execute();

    if (transactions.length === 0) {
      throw new Error('No transactions found for the specified file upload');
    }

    // Convert transactions to item arrays
    const transactionItems: string[][] = transactions.map(t => t.items as string[]);
    const totalTransactions = transactionItems.length;

    // 3. Implement Apriori algorithm
    const frequentItemsets = aprioriAlgorithm(transactionItems, input.min_support);

    // 4. Generate association rules
    const associationRules = generateAssociationRules(frequentItemsets, input.min_confidence, totalTransactions);

    // 5. Save frequent itemsets to database
    if (frequentItemsets.length > 0) {
      await db.insert(frequentItemsetsTable)
        .values(frequentItemsets.map(itemset => ({
          analysis_id: analysisId,
          itemset: itemset.itemset,
          support: itemset.support.toString(),
          frequency: itemset.frequency,
          algorithm: input.algorithm
        })))
        .execute();
    }

    // Save association rules to database
    if (associationRules.length > 0) {
      await db.insert(associationRulesTable)
        .values(associationRules.map(rule => ({
          analysis_id: analysisId,
          antecedent: rule.antecedent,
          consequent: rule.consequent,
          support: rule.support.toString(),
          confidence: rule.confidence.toString(),
          lift: rule.lift.toString(),
          algorithm: input.algorithm
        })))
        .execute();
    }

    // 6. Generate summary
    const summary = generateSummary(frequentItemsets, associationRules, input);

    // 7. Update analysis status to 'completed'
    const updatedResult = await db.update(analysisResultsTable)
      .set({
        status: 'completed',
        summary: summary,
        completed_at: new Date()
      })
      .where(eq(analysisResultsTable.id, analysisId))
      .returning()
      .execute();

    // 8. Return the analysis result with proper type conversions
    const result = updatedResult[0];
    return {
      ...result,
      min_support: parseFloat(result.min_support),
      min_confidence: parseFloat(result.min_confidence)
    };

  } catch (error) {
    console.error('Apriori analysis failed:', error);
    
    // Update status to 'failed' if we have an analysis ID
    if (analysisId!) {
      try {
        await db.update(analysisResultsTable)
          .set({
            status: 'failed',
            error_message: error instanceof Error ? error.message : 'Unknown error occurred',
            completed_at: new Date()
          })
          .where(eq(analysisResultsTable.id, analysisId))
          .execute();
      } catch (updateError) {
        console.error('Failed to update analysis status to failed:', updateError);
      }
    }
    
    throw error;
  }
}

function aprioriAlgorithm(transactions: string[][], minSupport: number): ItemsetSupport[] {
  const totalTransactions = transactions.length;
  const minSupportCount = Math.ceil(minSupport * totalTransactions);
  
  // Get all unique items
  const allItems = new Set<string>();
  transactions.forEach(transaction => {
    transaction.forEach(item => allItems.add(item));
  });

  let frequentItemsets: ItemsetSupport[] = [];
  let candidateItemsets: string[][] = Array.from(allItems).map(item => [item]);
  
  // Generate frequent itemsets of increasing size
  while (candidateItemsets.length > 0) {
    const itemsetSupports: ItemsetSupport[] = [];
    
    // Count support for each candidate itemset
    for (const candidate of candidateItemsets) {
      let count = 0;
      for (const transaction of transactions) {
        if (candidate.every(item => transaction.includes(item))) {
          count++;
        }
      }
      
      if (count >= minSupportCount) {
        itemsetSupports.push({
          itemset: candidate.sort(), // Sort for consistency
          support: count / totalTransactions,
          frequency: count
        });
      }
    }
    
    // Add frequent itemsets to result
    frequentItemsets.push(...itemsetSupports);
    
    // Generate next level candidates
    candidateItemsets = generateCandidates(itemsetSupports.map(is => is.itemset));
  }
  
  return frequentItemsets;
}

function generateCandidates(frequentItemsets: string[][]): string[][] {
  const candidates: string[][] = [];
  
  for (let i = 0; i < frequentItemsets.length; i++) {
    for (let j = i + 1; j < frequentItemsets.length; j++) {
      const itemset1 = frequentItemsets[i];
      const itemset2 = frequentItemsets[j];
      
      // Join if they differ by only one item
      if (itemset1.length === itemset2.length) {
        const commonItems = itemset1.filter(item => itemset2.includes(item));
        if (commonItems.length === itemset1.length - 1) {
          const newCandidate = [...new Set([...itemset1, ...itemset2])].sort();
          if (newCandidate.length === itemset1.length + 1) {
            candidates.push(newCandidate);
          }
        }
      }
    }
  }
  
  // Remove duplicates
  const uniqueCandidates = candidates.filter((candidate, index) => {
    return candidates.findIndex(c => 
      c.length === candidate.length && c.every((item, i) => item === candidate[i])
    ) === index;
  });
  
  return uniqueCandidates;
}

function generateAssociationRules(
  frequentItemsets: ItemsetSupport[], 
  minConfidence: number, 
  totalTransactions: number
): AssociationRuleData[] {
  const rules: AssociationRuleData[] = [];
  
  // Generate rules from itemsets with 2+ items
  const multiItemItemsets = frequentItemsets.filter(itemset => itemset.itemset.length >= 2);
  
  for (const itemset of multiItemItemsets) {
    const items = itemset.itemset;
    
    // Generate all possible antecedent/consequent combinations
    for (let i = 1; i < Math.pow(2, items.length) - 1; i++) {
      const antecedent: string[] = [];
      const consequent: string[] = [];
      
      for (let j = 0; j < items.length; j++) {
        if (i & (1 << j)) {
          antecedent.push(items[j]);
        } else {
          consequent.push(items[j]);
        }
      }
      
      // Find support of antecedent
      const antecedentItemset = frequentItemsets.find(is => 
        is.itemset.length === antecedent.length && 
        antecedent.every(item => is.itemset.includes(item))
      );
      
      if (antecedentItemset) {
        const confidence = itemset.support / antecedentItemset.support;
        
        if (confidence >= minConfidence) {
          // Find support of consequent for lift calculation
          const consequentItemset = frequentItemsets.find(is => 
            is.itemset.length === consequent.length && 
            consequent.every(item => is.itemset.includes(item))
          );
          
          const lift = consequentItemset ? confidence / consequentItemset.support : confidence;
          
          rules.push({
            antecedent: antecedent.sort(),
            consequent: consequent.sort(),
            support: itemset.support,
            confidence: confidence,
            lift: lift
          });
        }
      }
    }
  }
  
  return rules;
}

function generateSummary(
  frequentItemsets: ItemsetSupport[], 
  associationRules: AssociationRuleData[], 
  parameters: CreateAnalysisInput
): string {
  const totalItemsets = frequentItemsets.length;
  const totalRules = associationRules.length;
  
  // Find most frequent itemsets
  const topItemsets = frequentItemsets
    .sort((a, b) => b.support - a.support)
    .slice(0, 5);
  
  // Find strongest rules by confidence
  const topRules = associationRules
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 3);
  
  let summary = `Apriori Analysis completed successfully.\n\n`;
  summary += `Parameters: Min Support = ${(parameters.min_support * 100).toFixed(1)}%, Min Confidence = ${(parameters.min_confidence * 100).toFixed(1)}%\n\n`;
  summary += `Results: Found ${totalItemsets} frequent itemsets and ${totalRules} association rules.\n\n`;
  
  if (topItemsets.length > 0) {
    summary += `Top Frequent Itemsets:\n`;
    topItemsets.forEach((itemset, index) => {
      summary += `${index + 1}. {${itemset.itemset.join(', ')}} - Support: ${(itemset.support * 100).toFixed(1)}%\n`;
    });
    summary += `\n`;
  }
  
  if (topRules.length > 0) {
    summary += `Top Association Rules:\n`;
    topRules.forEach((rule, index) => {
      summary += `${index + 1}. {${rule.antecedent.join(', ')}} → {${rule.consequent.join(', ')}} - Confidence: ${(rule.confidence * 100).toFixed(1)}%, Lift: ${rule.lift.toFixed(2)}\n`;
    });
  }
  
  return summary;
}
