
import { z } from 'zod';

// File upload schema
export const fileUploadSchema = z.object({
  id: z.number(),
  filename: z.string(),
  original_name: z.string(),
  file_size: z.number(),
  mime_type: z.string(),
  file_path: z.string(),
  upload_date: z.coerce.date(),
  status: z.enum(['pending', 'processing', 'completed', 'failed'])
});

export type FileUpload = z.infer<typeof fileUploadSchema>;

// Input schema for file upload
export const createFileUploadInputSchema = z.object({
  filename: z.string(),
  original_name: z.string(),
  file_size: z.number().positive(),
  mime_type: z.string(),
  file_path: z.string()
});

export type CreateFileUploadInput = z.infer<typeof createFileUploadInputSchema>;

// Transaction data schema
export const transactionSchema = z.object({
  id: z.number(),
  file_upload_id: z.number(),
  transaction_id: z.string(),
  items: z.array(z.string()),
  created_at: z.coerce.date()
});

export type Transaction = z.infer<typeof transactionSchema>;

// Input schema for creating transactions
export const createTransactionInputSchema = z.object({
  file_upload_id: z.number(),
  transaction_id: z.string(),
  items: z.array(z.string())
});

export type CreateTransactionInput = z.infer<typeof createTransactionInputSchema>;

// Frequent itemset schema
export const frequentItemsetSchema = z.object({
  id: z.number(),
  analysis_id: z.number(),
  itemset: z.array(z.string()),
  support: z.number(),
  frequency: z.number(),
  algorithm: z.enum(['apriori', 'fp-growth']),
  created_at: z.coerce.date()
});

export type FrequentItemset = z.infer<typeof frequentItemsetSchema>;

// Association rule schema
export const associationRuleSchema = z.object({
  id: z.number(),
  analysis_id: z.number(),
  antecedent: z.array(z.string()),
  consequent: z.array(z.string()),
  support: z.number(),
  confidence: z.number(),
  lift: z.number(),
  algorithm: z.enum(['apriori', 'fp-growth']),
  created_at: z.coerce.date()
});

export type AssociationRule = z.infer<typeof associationRuleSchema>;

// Analysis result schema
export const analysisResultSchema = z.object({
  id: z.number(),
  file_upload_id: z.number(),
  algorithm: z.enum(['apriori', 'fp-growth']),
  min_support: z.number(),
  min_confidence: z.number(),
  status: z.enum(['pending', 'processing', 'completed', 'failed']),
  summary: z.string().nullable(),
  error_message: z.string().nullable(),
  created_at: z.coerce.date(),
  completed_at: z.coerce.date().nullable()
});

export type AnalysisResult = z.infer<typeof analysisResultSchema>;

// Input schemas for analysis
export const createAnalysisInputSchema = z.object({
  file_upload_id: z.number(),
  algorithm: z.enum(['apriori', 'fp-growth']),
  min_support: z.number().min(0).max(1),
  min_confidence: z.number().min(0).max(1)
});

export type CreateAnalysisInput = z.infer<typeof createAnalysisInputSchema>;

// Analysis parameters schema
export const analysisParametersSchema = z.object({
  algorithm: z.enum(['apriori', 'fp-growth']),
  min_support: z.number().min(0).max(1),
  min_confidence: z.number().min(0).max(1)
});

export type AnalysisParameters = z.infer<typeof analysisParametersSchema>;

// Dashboard data schema for visualization
export const dashboardDataSchema = z.object({
  analysis_id: z.number(),
  frequent_itemsets: z.array(frequentItemsetSchema),
  association_rules: z.array(associationRuleSchema),
  summary: z.string().nullable(),
  algorithm: z.enum(['apriori', 'fp-growth']),
  parameters: analysisParametersSchema
});

export type DashboardData = z.infer<typeof dashboardDataSchema>;
