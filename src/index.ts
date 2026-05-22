import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { HTTPException } from 'hono/http-exception';
import { logger as honoLogger } from 'hono/logger';
import { config } from '~/config';
import { HTTP_STATUS_CODE } from '~/constants/http';
import extractors from '~/extractors/extractors';
import { type Logger, logger } from '~/logger';
import { version } from '../package.json';
import { createProvider } from './extractors/ai/provider-factory';
import ExtractorOrchestrator from './extractors/services/extractor-orchestrator';

export function createApp({
  orchestrator,
  appLogger = logger,
  enableLogger = true,
}: {
  orchestrator: ExtractorOrchestrator;
  appLogger?: Logger;
  enableLogger?: boolean;
}) {
  const app = new Hono({ strict: true });

  app.use('*', cors({ origin: '*', credentials: true }));

  if (enableLogger) app.use(honoLogger());

  app.use('*', async (c, next) => {
    c.set('orchestrator', orchestrator);
    c.set('logger', appLogger);
    await next();
  });

  app.route('/api/extractors', extractors);

  app.get('/health', c => {
    const strategy = orchestrator.getStrategy();
    return c.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version,
      llmProvider: config.LLM_PROVIDER,
      strategy,
    });
  });

  app.onError(async (err, c) => {
    const appErr = c.get('logger');

    if (err instanceof HTTPException) {
      const errMessage = await err.getResponse().text();
      return c.json({ message: errMessage }, { status: err.status });
    }

    appErr.error('Unhandled error', {
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

const aiProvider = createProvider(config.LLM_PROVIDER);

logger.info('AI Extractor initialized', {
  provider: aiProvider.name,
  model: aiProvider.model,
});

const orchestrator = new ExtractorOrchestrator(aiProvider, logger);

logger.info('Extraction strategy configured', {
  primary: orchestrator.getStrategy().primary,
});

const app = createApp({ orchestrator });

export default {
  port: config.PORT,
  fetch: app.fetch,
};
