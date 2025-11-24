import type ExtractorOrchestrator from '~/extractors/services/extractor-orchestrator';
import type { Logger } from '~/logger';

declare module 'hono' {
  interface ContextVariableMap {
    orchestrator: ExtractorOrchestrator;
    logger: Logger;
  }
}
