
import { serial, text, pgTable, timestamp, numeric, integer, jsonb, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const fileStatusEnum = pgEnum('file_status', ['pending', 'processing', 'completed', 'failed']);
export const algorithmEnum = pgEnum('algorithm', ['apriori', 'fp-growth']);
export const analysisStatusEnum = pgEnum('analysis_status', ['pending', 'processing', 'completed', 'failed']);

// File uploads table
export const fileUploadsTable = pgTable('file_uploads', {
  id: serial('id').primaryKey(),
  filename: text('filename').notNull(),
  original_name: text('original_name').notNull(),
  file_size: integer('file_size').notNull(),
  mime_type: text('mime_type').notNull(),
  file_path: text('file_path').notNull(),
  upload_date: timestamp('upload_date').defaultNow().notNull(),
  status: fileStatusEnum('status').default('pending').notNull()
});

// Transactions table
export const transactionsTable = pgTable('transactions', {
  id: serial('id').primaryKey(),
  file_upload_id: integer('file_upload_id').notNull(),
  transaction_id: text('transaction_id').notNull(),
  items: jsonb('items').notNull(), // Array of strings stored as JSON
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Analysis results table
export const analysisResultsTable = pgTable('analysis_results', {
  id: serial('id').primaryKey(),
  file_upload_id: integer('file_upload_id').notNull(),
  algorithm: algorithmEnum('algorithm').notNull(),
  min_support: numeric('min_support', { precision: 5, scale: 4 }).notNull(),
  min_confidence: numeric('min_confidence', { precision: 5, scale: 4 }).notNull(),
  status: analysisStatusEnum('status').default('pending').notNull(),
  summary: text('summary'),
  error_message: text('error_message'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  completed_at: timestamp('completed_at')
});

// Frequent itemsets table
export const frequentItemsetsTable = pgTable('frequent_itemsets', {
  id: serial('id').primaryKey(),
  analysis_id: integer('analysis_id').notNull(),
  itemset: jsonb('itemset').notNull(), // Array of strings stored as JSON
  support: numeric('support', { precision: 8, scale: 6 }).notNull(),
  frequency: integer('frequency').notNull(),
  algorithm: algorithmEnum('algorithm').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Association rules table
export const associationRulesTable = pgTable('association_rules', {
  id: serial('id').primaryKey(),
  analysis_id: integer('analysis_id').notNull(),
  antecedent: jsonb('antecedent').notNull(), // Array of strings stored as JSON
  consequent: jsonb('consequent').notNull(), // Array of strings stored as JSON
  support: numeric('support', { precision: 8, scale: 6 }).notNull(),
  confidence: numeric('confidence', { precision: 8, scale: 6 }).notNull(),
  lift: numeric('lift', { precision: 8, scale: 6 }).notNull(),
  algorithm: algorithmEnum('algorithm').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Relations
export const fileUploadsRelations = relations(fileUploadsTable, ({ many }) => ({
  transactions: many(transactionsTable),
  analysisResults: many(analysisResultsTable)
}));

export const transactionsRelations = relations(transactionsTable, ({ one }) => ({
  fileUpload: one(fileUploadsTable, {
    fields: [transactionsTable.file_upload_id],
    references: [fileUploadsTable.id]
  })
}));

export const analysisResultsRelations = relations(analysisResultsTable, ({ one, many }) => ({
  fileUpload: one(fileUploadsTable, {
    fields: [analysisResultsTable.file_upload_id],
    references: [fileUploadsTable.id]
  }),
  frequentItemsets: many(frequentItemsetsTable),
  associationRules: many(associationRulesTable)
}));

export const frequentItemsetsRelations = relations(frequentItemsetsTable, ({ one }) => ({
  analysisResult: one(analysisResultsTable, {
    fields: [frequentItemsetsTable.analysis_id],
    references: [analysisResultsTable.id]
  })
}));

export const associationRulesRelations = relations(associationRulesTable, ({ one }) => ({
  analysisResult: one(analysisResultsTable, {
    fields: [associationRulesTable.analysis_id],
    references: [analysisResultsTable.id]
  })
}));

// TypeScript types for the table schemas
export type FileUpload = typeof fileUploadsTable.$inferSelect;
export type NewFileUpload = typeof fileUploadsTable.$inferInsert;

export type Transaction = typeof transactionsTable.$inferSelect;
export type NewTransaction = typeof transactionsTable.$inferInsert;

export type AnalysisResult = typeof analysisResultsTable.$inferSelect;
export type NewAnalysisResult = typeof analysisResultsTable.$inferInsert;

export type FrequentItemset = typeof frequentItemsetsTable.$inferSelect;
export type NewFrequentItemset = typeof frequentItemsetsTable.$inferInsert;

export type AssociationRule = typeof associationRulesTable.$inferSelect;
export type NewAssociationRule = typeof associationRulesTable.$inferInsert;

// Export all tables for proper query building
export const tables = {
  fileUploads: fileUploadsTable,
  transactions: transactionsTable,
  analysisResults: analysisResultsTable,
  frequentItemsets: frequentItemsetsTable,
  associationRules: associationRulesTable
};
