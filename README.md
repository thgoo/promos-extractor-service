# Extractor Service

Service for extracting structured data from Telegram posts using LLM and fallback strategies.

## Features

- 🤖 LLM-based extraction (OpenAI, Anthropic, Ollama)
- 🔄 Regex fallback for reliability
- ✅ Request/response validation with Zod
- 🚀 Built with Hono + Bun for performance
- 📝 Structured logging
- 🔒 API authentication support

## Setup

1. Install dependencies:
```bash
bun install
```

2. Copy environment variables:
```bash
cp .env.example .env
```

3. Configure your LLM provider in `.env`

4. Run development server:
```bash
bun run dev
```

5. Run linter:
```bash
bun run lint
```

6. Run tests:
```bash
bun run test:bun
```

## API Endpoints

### Health Check
```bash
GET /health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "version": "1.0.0",
  "llmProvider": "openai"
}
```

### Extract Data
```bash
POST /api/extractors/extract
Content-Type: application/json

{
  "text": "CUPOM NIKE AINDA ATIVO...",
  "chat": "hardmob_promos",
  "messageId": 12345,
  "links": ["https://example.com"]
}
```

Response:
```json
{
  "text": "📺 Smart TV 43\" Crystal UHD 4K 2025 + Soundbar\n\n🔥 POR 1.768 no Pix ou 1.861 em 12x\n🎟 CUPOM: VEMPROCLUBE\n\n🔗 https://tidd.ly/43Ls6pF",
  "product": "Smart TV 43\" Crystal UHD 4K 2025 + Soundbar",
  "store": null,
  "price": 176800,
  "coupons": [
    {
      "code": "VEMPROCLUBE",
      "discount": null,
      "description": null,
      "url": "https://tidd.ly/43Ls6pF"
    }
  ]
}
```

**Notes**: 
- `text` is cleaned (promotional footers like "💰Entre no nosso grupo" are removed)
- `price` is in cents (176800 = R$ 1.768,00)
- `product` is extracted from the first meaningful line
- `store` is extracted if mentioned (Amazon, Mercado Livre, etc.)

## Testing

Run tests:
```bash
bun test
```

Watch mode:
```bash
bun test:watch
```

## Architecture

Following the **hono-boilerplate** pattern:

```
extractor-service/
├── src/
│   ├── index.ts              # Main app (Hono)
│   ├── config.ts             # Environment configuration
│   ├── types.ts              # Shared types
│   ├── constants/
│   │   └── http.ts           # HTTP status codes
│   ├── logger/
│   │   ├── index.ts
│   │   ├── types.ts
│   │   └── console-logger.ts
│   └── extractors/           # Domain: Extractors
│       ├── extractors.ts     # Routes (Hono router)
│       ├── schemas.ts        # Zod schemas
│       ├── services/
│       │   └── regex-extractor-service.ts
│       └── regex/            # Regex extraction logic
│           ├── coupon-detector.ts
│           ├── coupon-validator.ts
│           ├── price-extractor.ts
│           ├── discount-extractor.ts
│           ├── product-extractor.ts
│           ├── store-extractor.ts
│           ├── deal-classifier.ts
│           └── regex.test.ts
├── eslint.config.mjs         # ESLint configuration
├── tsconfig.json             # TypeScript configuration
└── package.json
```

## Current Status

✅ **Regex extraction** - Fully implemented and working  
✅ **Request/response validation** - Zod schemas  
✅ **Basic tests** - Core extraction scenarios  
⏳ **LLM extraction** - Prepared but not implemented  
⏳ **Caching layer** - Not implemented  
⏳ **Rate limiting** - Not implemented  
⏳ **Monitoring/metrics** - Not implemented  

## Next Steps

- [ ] Implement LLM extraction (OpenAI/Anthropic/Ollama)
- [ ] Add prompt engineering for LLM
- [ ] Add caching layer (Redis or in-memory)
- [ ] Add rate limiting
- [ ] Add monitoring/metrics
- [ ] Extract original price (DE/POR pattern)
- [ ] Extract expiration dates
