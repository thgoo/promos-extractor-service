# AI Extractor Implementation

## Overview

AI-powered extractor using **Abacus API** (RouteLL M) to extract structured data from promotional text. Falls back to regex-based extraction if AI fails.

## Architecture

```
┌─────────────────────────────────────────┐
│         POST /api/extractors/extract     │
└─────────────────────────────────────────┘
                    │
                    ▼
        ┌───────────────────────┐
        │  AI Extractor Enabled? │
        └───────────────────────┘
                │           │
           Yes  │           │ No
                ▼           ▼
    ┌──────────────┐   ┌──────────────┐
    │ AI Extractor │   │Regex Extractor│
    │   (Abacus)   │   │   (Fallback)  │
    └──────────────┘   └──────────────┘
            │                  │
        Success?               │
            │                  │
         No │                  │
            ▼                  │
    ┌──────────────┐          │
    │Regex Fallback│◄─────────┘
    └──────────────┘
            │
            ▼
    ┌──────────────┐
    │   Response   │
    └──────────────┘
```

## Files Created/Modified

### Created
- `src/extractors/ai/services/ai-extractor.ts` - AI extractor service using Abacus API

### Modified
- `src/config.ts` - Added Abacus configuration
- `src/index.ts` - Initialize AI extractor and inject into context
- `src/extractors/extractors.ts` - Updated router to use AI with fallback

## Configuration

Add to your `.env`:

```bash
# LLM Provider
LLM_PROVIDER=abacus

# Abacus Configuration
ABACUS_API_KEY=s2_50cc3fbb29884c85ab049c39d51d306f
ABACUS_MODEL=claude-3-7-sonnet-20250219
```

## Usage

### Start the server

```bash
bun run dev
```

You should see:
```
✓ AI Extractor initialized (Abacus)
```

### Test the endpoint

```bash
curl -X POST http://localhost:3001/api/extractors/extract \
  -H "Content-Type: application/json" \
  -d '{
    "text": "NOTA FISCAL + FRETE GRÁTIS\n💻 Notebook Lenovo IdeaPad 5, Ryzen 5, 8GB RAM, SSD 512GB\n🔥 DE 3500 POR 2899 EM 12X\nCUPOM: LENOPROMO\nhttps://amazon.com/lenovo",
    "chat": "test-channel",
    "messageId": 12345,
    "links": ["https://amazon.com/lenovo"]
  }' | jq '.'
```

### Check health endpoint

```bash
curl http://localhost:3001/health | jq '.'
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2024-11-12T21:45:00.000Z",
  "version": "1.0.0",
  "llmProvider": "abacus",
  "extractor": "ai-with-regex-fallback"
}
```

## How It Works

### 1. AI Extraction (Primary)

The AI extractor sends a request to Abacus API with:
- **System prompt**: Instructions for structured extraction
- **User message**: The promotional text
- **Response format**: JSON object

The AI returns:
```json
{
  "text": "original text",
  "description": "clear product description",
  "product": "Notebook Lenovo IdeaPad 5",
  "store": "Amazon",
  "price": 2899,
  "coupons": [{"code": "LENOPROMO", "discount": ""}]
}
```

### 2. Regex Fallback (Secondary)

If AI extraction fails (API error, timeout, invalid response), the system automatically falls back to regex-based extraction.

### 3. Logging

All extraction attempts are logged:
```
✓ Extract request received (messageId: 12345)
✓ AI extraction successful (messageId: 12345)
✓ Extract completed (extractor: ai, coupons: 1, hasPrice: true)
```

Or with fallback:
```
✓ Extract request received (messageId: 12345)
⚠ AI extraction failed, falling back to regex (error: API timeout)
✓ Extract completed (extractor: regex, coupons: 1, hasPrice: true)
```

## Response Format

```typescript
{
  text: string;                // Cleaned text
  description: string | null;  // Product description
  product: string | null;      // Product name
  store: string | null;        // Store name
  price: number | null;        // Price in cents
  coupons: Array<{
    code: string;
    discount?: string;
  }>;
}
```

## Advantages

✅ **Intelligent extraction** - AI understands context and nuance
✅ **Reliable fallback** - Never fails completely, falls back to regex
✅ **Simple integration** - Just set env vars and it works
✅ **Cost-effective** - Uses RouteLL M for optimal cost/performance
✅ **Flexible** - Easy to switch models or providers

## Disabling AI Extractor

Set `LLM_PROVIDER` to anything other than `abacus`:

```bash
LLM_PROVIDER=none
```

Or remove `ABACUS_API_KEY` from `.env`.

The service will automatically use regex-only mode:
```
ℹ AI Extractor disabled (using regex only)
```

## Testing

Use the provided test script:

```bash
./test-ai-extractor.sh
```

Or test manually with curl (see Usage section above).

## Future Improvements

- [ ] Add caching for repeated extractions
- [ ] Support multiple AI providers (OpenAI, Anthropic, etc.)
- [ ] Add confidence scores from AI
- [ ] Implement retry logic with exponential backoff
- [ ] Add metrics/monitoring for AI vs regex usage
