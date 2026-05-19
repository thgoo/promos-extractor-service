# extractor-service

AI-powered extraction service built with **Hono** and **Bun**. Receives a raw Telegram promotional message, sends it to an LLM, and returns structured data ready to be stored — product name, store, price in cents, coupon codes, category, and a normalized `productKey` for cross-store price tracking.

Designed to be provider-agnostic: swapping the LLM means implementing one interface and wiring it up — no changes to the callers.

## Key Technologies

- **Hono**: Fast, lightweight web framework built on Web Standards
- **Abacus AI (RouteLLM)**: LLM provider (OpenAI-compatible API)
- **Zod**: TypeScript-first schema validation and type derivation
- **Bun**: Fast JavaScript runtime and package manager

## What's Included

- AI extraction pipeline with structured JSON output
- Exponential backoff retry (configurable presets — FAST / STANDARD / AGGRESSIVE)
- Schema validation with `z.enum` for categories — unknown values fail fast
- Structured logging (development: colored console, production: JSON)
- `productKey` normalization for cross-store price tracking
- Health check endpoint
- Unit tests for schemas and retry logic

## Setup

### 1. Install Dependencies

```sh
bun install
```

### 2. Configure Environment

Create a `.env` file based on `.env.example`:

```sh
cp .env.example .env
```

Then fill in your Abacus API key:

```env
ABACUS_API_KEY=your_key_here
```

**Environment Variables:**

| Variable | Required | Default | Description |
|---|---|---|---|
| `ABACUS_API_KEY` | ✅ | — | Abacus AI API key |
| `ABACUS_MODEL` | | `claude-3-5-sonnet` | Model identifier used by RouteLLM |
| `ABACUS_BASE_URL` | | `https://routellm.abacus.ai/v1/chat/completions` | RouteLLM endpoint |
| `ABACUS_TIMEOUT_MS` | | `30000` | Request timeout in milliseconds |
| `LLM_PROVIDER` | | `abacus` | Active LLM provider |
| `PORT` | | `3001` | HTTP port |
| `NODE_ENV` | | `development` | `development` or `production` |

### 3. Start Development Server

```sh
bun run dev
```

## Available Scripts

| Command | Description |
|---|---|
| `bun run dev` | Start development server with hot-reload |
| `bun run lint` | Run ESLint |
| `bun run test:bun` | Run unit tests |

## Project Structure

```
src/
├── constants/
│   ├── categories.ts          # CATEGORIES — single source for schema + prompt
│   └── http.ts                # HTTP status codes
├── extractors/
│   ├── ai/
│   │   ├── prompts/
│   │   │   └── system-prompt.ts   # LLM system prompt with few-shot examples
│   │   ├── services/
│   │   │   └── ai-extractor.ts    # AIExtractorService — LLMProvider for Abacus
│   │   ├── types.ts               # LLMProvider interface, Abacus API types, errors
│   │   └── utils/
│   │       └── retry.ts           # withRetry — exponential backoff
│   ├── services/
│   │   └── extractor-orchestrator.ts  # Coordinates extraction, logging, timing
│   ├── extractors.ts              # POST /api/extractors/extract route
│   └── schemas.ts                 # Zod schemas + derived types
├── logger/
│   ├── console-logger.ts      # Colored dev output / JSON prod output
│   ├── instance.ts            # Logger singleton
│   ├── types.ts               # Logger interface
│   └── index.ts               # Re-exports
├── types/
│   ├── hono.d.ts              # Hono ContextVariableMap augmentation
│   └── index.ts               # Re-exports + HealthResponse
├── config.ts                  # Environment validation (fail-fast on startup)
└── index.ts                   # App factory + startup wiring
```

## Architecture

All LLM providers implement the same interface:

```typescript
interface LLMProvider {
  readonly name: string;
  extract(input: ExtractRequest): Promise<ExtractResponse>;
}
```

The `ExtractorOrchestrator` wraps the active provider, adding per-request timing and structured logging:

```typescript
const orchestrator = new ExtractorOrchestrator(aiProvider, logger);
```

The retry utility wraps the API call with exponential backoff, retrying only on transient failures (5xx, 408, 429, network errors) and failing fast on client errors (4xx) and parsing errors:

```typescript
return withRetry(async () => {
  const raw = await this.callAPI(payload);
  return this.parseResponse(raw, input.text);
}, RETRY_PRESETS.AGGRESSIVE); // 5 attempts: delays of 1s, 2s, 4s, 8s
```

Categories are defined once and used in both schema validation and the LLM prompt — adding a category to `CATEGORIES` updates both automatically:

```typescript
// constants/categories.ts
export const CATEGORIES = ['smartphones', 'notebooks', 'games', ...] as const;

// schemas.ts
category: z.enum(CATEGORIES).nullable()

// system-prompt.ts
`category: one of: [${CATEGORIES.join(', ')}]`
```

## API

### `POST /api/extractors/extract`

Extracts structured data from a Telegram promotional message.

**Request:**
```json
{
  "text": "🎮 PlayStation 5 Slim Digital 1TB\nPor apenas R$ 2.849\nhttps://amazon.com.br/dp/B0CL5KNB9M",
  "chat": "promo_channel",
  "messageId": 12345,
  "links": ["https://amazon.com.br/dp/B0CL5KNB9M"]
}
```

**Response:**
```json
{
  "text": "🎮 PlayStation 5 Slim Digital 1TB\nPor apenas R$ 2.849\nhttps://amazon.com.br/dp/B0CL5KNB9M",
  "description": "Pra você finalmente zerar aquele backlog. Ou não.",
  "product": "PlayStation 5 Slim Digital 1TB",
  "store": "Amazon",
  "price": 284900,
  "coupons": [],
  "productKey": "sony-playstation-5-slim-digital-1tb",
  "category": "games"
}
```

| Field | Type | Description |
|---|---|---|
| `text` | `string` | Full original message text |
| `description` | `string \| null` | Rewritten description with light humor |
| `product` | `string \| null` | Product name with specs |
| `store` | `string \| null` | Store/platform (e.g. `"Amazon"`, `"Mercado Livre"`) |
| `price` | `number \| null` | Final price in cents, coupons already applied |
| `coupons` | `{ code: string, discount: string \| null }[]` | Extracted coupon codes |
| `productKey` | `string \| null` | Normalized slug for cross-store price tracking |
| `category` | `string \| null` | One of the defined categories, or null |

| Status | Meaning |
|---|---|
| `200` | Extraction successful |
| `400` | Invalid request body (Zod validation error) |
| `500` | AI extraction failed after all retries |

### `GET /health`

Returns service status, active provider, and extraction strategy.

```json
{
  "status": "ok",
  "timestamp": "2025-05-19T18:00:00.000Z",
  "version": "1.0.0",
  "llmProvider": "abacus",
  "strategy": { "primary": "ai-abacus" }
}
```

## How to Add a New LLM Provider

### 1. Implement the `LLMProvider` interface

```typescript
// src/extractors/ai/services/openai-extractor.ts
import type { LLMProvider } from '../types';
import type { ExtractRequest, ExtractResponse } from '~/types';

export default class OpenAIExtractorService implements LLMProvider {
  readonly name = 'openai';

  async extract(input: ExtractRequest): Promise<ExtractResponse> {
    // call OpenAI API, parse response, return ExtractResponse
  }
}
```

### 2. Add the provider config to `src/config.ts`

```typescript
OPENAI_API_KEY: getEnv('OPENAI_API_KEY'),
OPENAI_MODEL: getEnv('OPENAI_MODEL', 'gpt-4o'),
```

### 3. Wire it up in `src/index.ts`

```typescript
if (config.LLM_PROVIDER !== 'openai') {
  throw new Error(`Unsupported provider: "${config.LLM_PROVIDER}"`);
}

const aiProvider = new OpenAIExtractorService();
const orchestrator = new ExtractorOrchestrator(aiProvider, logger);
```

### 4. Update `.env.example`

```env
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o
```

## License

MIT
