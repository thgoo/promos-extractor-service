import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import type ExtractorOrchestrator from './services/extractor-orchestrator';
import { extractRequestSchema } from './schemas';

interface Variables {
  orchestrator: ExtractorOrchestrator;
}

const app = new Hono<{ Variables: Variables }>();

/**
 * POST /api/extractors/extract
 * Extract structured data from text using AI with automatic retry
 */
app.post('/extract', zValidator('json', extractRequestSchema), async c => {
  const orchestrator = c.get('orchestrator');
  const input = c.req.valid('json');

  const result = await orchestrator.extract(input);
  return c.json(result);
});

export default app;
