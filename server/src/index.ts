
import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import { 
  createFileUploadInputSchema, 
  createAnalysisInputSchema 
} from './schema';

// Import handlers
import { uploadFile } from './handlers/upload_file';
import { getFileUploads } from './handlers/get_file_uploads';
import { processExcelFile } from './handlers/process_excel_file';
import { runAprioriAnalysis } from './handlers/run_apriori_analysis';
import { runFpGrowthAnalysis } from './handlers/run_fp_growth_analysis';
import { getAnalysisResults } from './handlers/get_analysis_results';
import { getAnalysisById } from './handlers/get_analysis_by_id';
import { getDashboardData } from './handlers/get_dashboard_data';
import { getFrequentItemsets } from './handlers/get_frequent_itemsets';
import { getAssociationRules } from './handlers/get_association_rules';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // File upload endpoints
  uploadFile: publicProcedure
    .input(createFileUploadInputSchema)
    .mutation(({ input }) => uploadFile(input)),

  getFileUploads: publicProcedure
    .query(() => getFileUploads()),

  processExcelFile: publicProcedure
    .input(z.object({ fileUploadId: z.number() }))
    .mutation(({ input }) => processExcelFile(input.fileUploadId)),

  // Analysis endpoints
  runAprioriAnalysis: publicProcedure
    .input(createAnalysisInputSchema)
    .mutation(({ input }) => runAprioriAnalysis(input)),

  runFpGrowthAnalysis: publicProcedure
    .input(createAnalysisInputSchema)
    .mutation(({ input }) => runFpGrowthAnalysis(input)),

  getAnalysisResults: publicProcedure
    .query(() => getAnalysisResults()),

  getAnalysisById: publicProcedure
    .input(z.object({ analysisId: z.number() }))
    .query(({ input }) => getAnalysisById(input.analysisId)),

  // Dashboard and visualization endpoints
  getDashboardData: publicProcedure
    .input(z.object({ analysisId: z.number() }))
    .query(({ input }) => getDashboardData(input.analysisId)),

  getFrequentItemsets: publicProcedure
    .input(z.object({ analysisId: z.number() }))
    .query(({ input }) => getFrequentItemsets(input.analysisId)),

  getAssociationRules: publicProcedure
    .input(z.object({ analysisId: z.number() }))
    .query(({ input }) => getAssociationRules(input.analysisId)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`Data Mining Dashboard TRPC server listening at port: ${port}`);
}

start();
