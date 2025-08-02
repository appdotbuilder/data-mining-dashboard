
import { db } from '../db';
import { analysisResultsTable, transactionsTable, frequentItemsetsTable, associationRulesTable } from '../db/schema';
import { type CreateAnalysisInput, type AnalysisResult } from '../schema';
import { eq } from 'drizzle-orm';

// FP-Tree Node class
class FPNode {
  item: string;
  count: number;
  parent: FPNode | null;
  children: Map<string, FPNode>;
  nodeLink: FPNode | null;

  constructor(item: string, count: number, parent: FPNode | null = null) {
    this.item = item;
    this.count = count;
    this.parent = parent;
    this.children = new Map();
    this.nodeLink = null;
  }
}

// FP-Tree class
class FPTree {
  root: FPNode;
  headerTable: Map<string, { count: number; head: FPNode | null }>;
  minSupport: number;

  constructor(transactions: string[][], minSupport: number) {
    this.root = new FPNode('root', 0);
    this.headerTable = new Map();
    this.minSupport = minSupport;
    this.buildTree(transactions);
  }

  private buildTree(transactions: string[][]) {
    // First pass: count item frequencies
    const itemCounts = new Map<string, number>();
    for (const transaction of transactions) {
      for (const item of transaction) {
        itemCounts.set(item, (itemCounts.get(item) || 0) + 1);
      }
    }

    // Filter frequent items and sort by frequency (descending)
    const frequentItems = Array.from(itemCounts.entries())
      .filter(([, count]) => count >= this.minSupport)
      .sort((a, b) => b[1] - a[1]);

    // Initialize header table
    for (const [item, count] of frequentItems) {
      this.headerTable.set(item, { count, head: null });
    }

    const frequentItemSet = new Set(frequentItems.map(([item]) => item));

    // Second pass: build FP-tree
    for (const transaction of transactions) {
      const filteredTransaction = transaction
        .filter(item => frequentItemSet.has(item))
        .sort((a, b) => {
          const aCount = itemCounts.get(a) || 0;
          const bCount = itemCounts.get(b) || 0;
          return bCount - aCount;
        });

      if (filteredTransaction.length > 0) {
        this.insertTransaction(filteredTransaction, this.root);
      }
    }
  }

  private insertTransaction(transaction: string[], node: FPNode) {
    if (transaction.length === 0) return;

    const [firstItem, ...restItems] = transaction;
    
    if (node.children.has(firstItem)) {
      const childNode = node.children.get(firstItem)!;
      childNode.count++;
      this.insertTransaction(restItems, childNode);
    } else {
      const newNode = new FPNode(firstItem, 1, node);
      node.children.set(firstItem, newNode);

      // Update header table links
      const headerEntry = this.headerTable.get(firstItem);
      if (headerEntry) {
        if (headerEntry.head === null) {
          headerEntry.head = newNode;
        } else {
          let current: FPNode = headerEntry.head;
          while (current.nodeLink !== null) {
            current = current.nodeLink;
          }
          current.nodeLink = newNode;
        }
      }

      this.insertTransaction(restItems, newNode);
    }
  }

  getConditionalPatternBase(item: string): string[][] {
    const patterns: string[][] = [];
    const headerEntry = this.headerTable.get(item);
    
    if (!headerEntry || !headerEntry.head) return patterns;

    let current: FPNode | null = headerEntry.head;
    while (current !== null) {
      const path: string[] = [];
      let pathNode = current.parent;
      
      while (pathNode !== null && pathNode.item !== 'root') {
        path.unshift(pathNode.item);
        pathNode = pathNode.parent;
      }
      
      if (path.length > 0) {
        for (let i = 0; i < current.count; i++) {
          patterns.push([...path]);
        }
      }
      
      current = current.nodeLink;
    }
    
    return patterns;
  }
}

function fpGrowth(transactions: string[][], minSupport: number, prefix: string[] = []): Array<{ itemset: string[]; support: number }> {
  const tree = new FPTree(transactions, minSupport);
  const frequentItemsets: Array<{ itemset: string[]; support: number }> = [];

  // Get items sorted by frequency (ascending for FP-Growth)
  const items = Array.from(tree.headerTable.entries())
    .sort((a, b) => a[1].count - b[1].count);

  for (const [item, { count }] of items) {
    const newItemset = [...prefix, item];
    frequentItemsets.push({ itemset: newItemset, support: count });

    const conditionalPatternBase = tree.getConditionalPatternBase(item);
    
    if (conditionalPatternBase.length > 0) {
      const conditionalFrequentItemsets = fpGrowth(conditionalPatternBase, minSupport, newItemset);
      frequentItemsets.push(...conditionalFrequentItemsets);
    }
  }

  return frequentItemsets;
}

function generateAssociationRules(
  frequentItemsets: Array<{ itemset: string[]; support: number }>,
  minConfidence: number,
  totalTransactions: number
): Array<{
  antecedent: string[];
  consequent: string[];
  support: number;
  confidence: number;
  lift: number;
}> {
  const rules: Array<{
    antecedent: string[];
    consequent: string[];
    support: number;
    confidence: number;
    lift: number;
  }> = [];

  // Create support lookup
  const supportMap = new Map<string, number>();
  for (const { itemset, support } of frequentItemsets) {
    const key = itemset.sort().join(',');
    supportMap.set(key, support);
  }

  // Generate rules from itemsets with 2+ items
  for (const { itemset, support } of frequentItemsets) {
    if (itemset.length < 2) continue;

    // Generate all possible antecedent/consequent combinations
    for (let i = 1; i < Math.pow(2, itemset.length) - 1; i++) {
      const antecedent: string[] = [];
      const consequent: string[] = [];

      for (let j = 0; j < itemset.length; j++) {
        if (i & (1 << j)) {
          antecedent.push(itemset[j]);
        } else {
          consequent.push(itemset[j]);
        }
      }

      if (antecedent.length === 0 || consequent.length === 0) continue;

      const antecedentKey = antecedent.sort().join(',');
      const consequentKey = consequent.sort().join(',');
      const antecedentSupport = supportMap.get(antecedentKey) || 0;
      const consequentSupport = supportMap.get(consequentKey) || 0;

      if (antecedentSupport === 0) continue;

      const confidence = support / antecedentSupport;
      if (confidence < minConfidence) continue;

      const lift = (support * totalTransactions) / (antecedentSupport * consequentSupport);

      rules.push({
        antecedent,
        consequent,
        support,
        confidence,
        lift
      });
    }
  }

  return rules;
}

export async function runFpGrowthAnalysis(input: CreateAnalysisInput): Promise<AnalysisResult> {
  try {
    // Create analysis result with processing status
    const analysisResults = await db.insert(analysisResultsTable)
      .values({
        file_upload_id: input.file_upload_id,
        algorithm: 'fp-growth',
        min_support: input.min_support.toString(),
        min_confidence: input.min_confidence.toString(),
        status: 'processing'
      })
      .returning()
      .execute();

    const analysisResult = analysisResults[0];

    try {
      // Fetch transactions for the file
      const transactions = await db.select()
        .from(transactionsTable)
        .where(eq(transactionsTable.file_upload_id, input.file_upload_id))
        .execute();

      if (transactions.length === 0) {
        throw new Error('No transactions found for the specified file');
      }

      // Convert transactions to item arrays
      const transactionItems: string[][] = transactions.map(t => t.items as string[]);
      const totalTransactions = transactionItems.length;
      const minSupportCount = Math.ceil(input.min_support * totalTransactions);

      // Run FP-Growth algorithm
      const frequentItemsets = fpGrowth(transactionItems, minSupportCount);

      // Generate association rules
      const associationRules = generateAssociationRules(
        frequentItemsets,
        input.min_confidence,
        totalTransactions
      );

      // Save frequent itemsets
      if (frequentItemsets.length > 0) {
        await db.insert(frequentItemsetsTable)
          .values(frequentItemsets.map(itemset => ({
            analysis_id: analysisResult.id,
            itemset: itemset.itemset,
            support: (itemset.support / totalTransactions).toString(),
            frequency: itemset.support,
            algorithm: 'fp-growth' as const
          })))
          .execute();
      }

      // Save association rules
      if (associationRules.length > 0) {
        await db.insert(associationRulesTable)
          .values(associationRules.map(rule => ({
            analysis_id: analysisResult.id,
            antecedent: rule.antecedent,
            consequent: rule.consequent,
            support: (rule.support / totalTransactions).toString(),
            confidence: rule.confidence.toString(),
            lift: rule.lift.toString(),
            algorithm: 'fp-growth' as const
          })))
          .execute();
      }

      // Generate summary
      const summary = `FP-Growth analysis completed successfully. Found ${frequentItemsets.length} frequent itemsets and ${associationRules.length} association rules with min_support=${input.min_support} and min_confidence=${input.min_confidence}.`;

      // Update analysis result to completed
      const updatedResults = await db.update(analysisResultsTable)
        .set({
          status: 'completed',
          summary,
          completed_at: new Date()
        })
        .where(eq(analysisResultsTable.id, analysisResult.id))
        .returning()
        .execute();

      const finalResult = updatedResults[0];
      return {
        ...finalResult,
        min_support: parseFloat(finalResult.min_support),
        min_confidence: parseFloat(finalResult.min_confidence)
      };

    } catch (error) {
      // Update analysis result to failed
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      await db.update(analysisResultsTable)
        .set({
          status: 'failed',
          error_message: errorMessage,
          completed_at: new Date()
        })
        .where(eq(analysisResultsTable.id, analysisResult.id))
        .execute();

      throw error;
    }

  } catch (error) {
    console.error('FP-Growth analysis failed:', error);
    throw error;
  }
}
