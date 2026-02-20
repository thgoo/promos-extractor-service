import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { HTTPException } from 'hono/http-exception';
import { logger } from 'hono/logger';
import { config } from '~/config';
import { HTTP_STATUS_CODE } from '~/constants/http';
import extractors from '~/extractors/extractors';
import { ConsoleLogger } from '~/logger';
import AIExtractorService from './extractors/ai/services/ai-extractor';
import ExtractorOrchestrator from './extractors/services/extractor-orchestrator';

export function createApp({
  orchestrator,
  appLogger = new ConsoleLogger(),
  enableLogger = true,
}: {
  orchestrator: ExtractorOrchestrator;
  appLogger?: ConsoleLogger;
  enableLogger?: boolean;
}) {
  const app = new Hono({ strict: true });

  // CORS - allow all origins for now
  app.use('*', cors({
    origin: '*',
    credentials: true,
  }));

  if (enableLogger) app.use(logger());

  // Inject services into context
  app.use('*', async (c, next) => {
    c.set('orchestrator', orchestrator);
    c.set('logger', appLogger);
    await next();
  });

  // Routes
  app.route('/api/extractors', extractors);

  // Health check
  app.get('/health', c => {
    const strategy = orchestrator?.getStrategy() || { primary: 'ai-unknown' };
    return c.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      llmProvider: config.LLM_PROVIDER,
      strategy,
    });
  });

  // Error handling
  app.onError(async (err, c) => {
    const logger = c.get('logger');

    if (err instanceof HTTPException) {
      const errMessage = await err.getResponse().text();
      return c.json({ message: errMessage }, { status: err.status });
    }

    logger.error('Unhandled error', {
      error: err.message,
      stack: err.stack,
      path: c.req.path,
      method: c.req.method,
    });

    const message = config.NODE_ENV === 'production'
      ? 'Internal Server Error'
      : err.message;

    return c.json({ message }, { status: HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR });
  });

  return app;
}

// Initialize extractors and orchestrator
const appLogger = new ConsoleLogger();

// Initialize AI provider - required for the service to work
if (config.LLM_PROVIDER !== 'abacus' || !config.ABACUS_API_KEY) {
  throw new Error('AI provider is required. Please configure ABACUS_API_KEY');
}

const aiProvider = new AIExtractorService();
if (!aiProvider.isConfigured()) {
  throw new Error('AI Extractor not properly configured');
}

appLogger.info('AI Extractor initialized', {
  provider: aiProvider.name,
  model: config.ABACUS_MODEL,
});

const orchestrator = new ExtractorOrchestrator(aiProvider, appLogger);

const strategy = orchestrator.getStrategy();
appLogger.info('Extraction strategy configured', {
  primary: strategy.primary,
});

const app = createApp({ orchestrator });

export default {
  port: config.PORT,
  fetch: app.fetch,
};
