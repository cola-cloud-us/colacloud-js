# COLA Cloud JavaScript/TypeScript SDK

Official JavaScript/TypeScript SDK for the [COLA Cloud API](https://colacloud.us) - access the TTB COLA Registry of alcohol product label approvals.

COLA Cloud is an independent service that turns public TTB label approvals into searchable, enriched data. An approval record is not a unique product or proof of current retail availability. See the [product-data workflow and source limits](https://colacloud.us/product-enrichment) and [California wine recipe](https://colacloud.us/data/california-wine).

## Features

- Full TypeScript support with comprehensive type definitions
- Works in Node.js 18+ and modern browsers
- Async/await API with async iterators for pagination
- Custom error classes for precise error handling
- Rate limit information accessible from responses
- Zero dependencies (uses native fetch)

## Installation

```bash
npm install colacloud
```

## Quick Start

```typescript
import { ColaCloud } from 'colacloud';

const client = new ColaCloud({ apiKey: 'your-api-key' });

// Search COLAs
const { data } = await client.colas.list({
  productType: 'wine',
  origin: 'California',
  approvalDateFrom: '2026-08-01',
  approvalDateTo: '2026-08-31',
  perPage: 1,
});

console.log(`Returned ${data.length} records on this page`);
for (const cola of data) {
  console.log(`${cola.brand_name}: ${cola.product_name}`);
}

// Retrieve a real ID returned by search; an empty page is valid
if (data.length > 0) {
  const detail = await client.colas.get(data[0].ttb_id);
  console.log(detail.brand_name, detail.abv); // Extracted fields may be null
}
```

## Usage

### Configuration

```typescript
import { ColaCloud } from 'colacloud';

const client = new ColaCloud({
  apiKey: 'your-api-key',
  // Optional: custom base URL (for testing)
  baseUrl: 'https://app.colacloud.us/api/v1',
  // Optional: request timeout in milliseconds (default: 30000)
  timeout: 30000,
});
```

### Searching COLAs

```typescript
// Basic search
const results = await client.colas.list({ q: 'whiskey' });

// Small California-origin wine query with an explicit date scope
const filtered = await client.colas.list({
  productType: 'wine',
  origin: 'California',
  approvalDateFrom: '2026-08-01',
  approvalDateTo: '2026-08-31',
  perPage: 1,
});

console.log(`Returned ${filtered.data.length} records`);
if (filtered.pagination.total != null) {
  console.log(`Total: ${filtered.pagination.total} records`);
}
console.log(`More pages available: ${filtered.pagination.has_more}`);
```

`origin` matches a recorded state/country name; a California business address is a different filter. It does not establish appellation, ownership, or current sale. Use `domesticOrImported` for the documented domestic/imported classification, not `origin: 'united states'`.

### Getting a Single COLA

```typescript
const matches = await client.colas.list({ productType: 'wine', origin: 'California', perPage: 1 });
if (matches.data.length === 0) throw new Error('No matches in the query scope');
const cola = await client.colas.get(matches.data[0].ttb_id);

console.log(cola.brand_name);
console.log(cola.product_name);
console.log(cola.abv);

// Access images
for (const image of cola.images) {
  console.log(image.image_url);
}

// Access barcodes
for (const barcode of cola.barcodes) {
  console.log(`${barcode.barcode_type}: ${barcode.barcode_value}`);
}
```

### Async Iterator for Pagination

Use async iterators to page through the matching query scope. Without explicit dates the API defaults to the last 365 days. Totals and page counts may be null; the iterator handles continuation. Date eligibility can fall back from approval date to application/latest-update date. Each page uses your plan allowance:

```typescript
// Iterate through all matching COLAs
for await (const cola of client.colas.iterate({
  q: 'vodka', approvalDateFrom: '2026-08-01', approvalDateTo: '2026-08-31',
})) {
  console.log(cola.ttb_id, cola.brand_name);
}

// Collect into an array (use with caution on large datasets)
import { collectAll, take } from 'colacloud';

const allColas = await collectAll(
  client.colas.iterate({ q: 'rare whiskey' }),
  1000 // Optional: safety limit
);

// Take first N results
const firstTen = await take(client.colas.iterate({ q: 'gin' }), 10);
```

### Searching Permittees

```typescript
// List permittees
const { data: permittees } = await client.permittees.list({
  q: 'distillery',
  state: 'KY',
  isActive: true,
});

// Get a specific permittee
if (permittees.length === 0) throw new Error('No permittees found');
const permittee = await client.permittees.get(permittees[0].permit_number);
console.log(permittee.company_name);
console.log(`${permittee.colas} total COLAs`);

// Access recent COLAs
for (const cola of permittee.recent_colas) {
  console.log(cola.brand_name);
}

// Iterate through permittees
for await (const p of client.permittees.iterate({ state: 'CA' })) {
  console.log(p.company_name);
}
```

### Barcode Lookup

Barcode lookup returns matching approval records from decoded label images. Codes may be missing or repeated across approvals; review the candidate records before treating a match as a product identity. The UPC example uses a code from the [existing whiskey evaluation sample](https://colacloud.us/data-packs/whiskey).

```typescript
const result = await client.barcodes.lookup('869357000220');

console.log(`Barcode: ${result.barcode_value}`);
console.log(`Type: ${result.barcode_type}`);
console.log(`Found ${result.total_colas} COLAs`);

for (const cola of result.colas) {
  console.log(cola.brand_name);
}
```

### Usage Statistics

```typescript
const usage = await client.usage.get();

console.log(`Tier: ${usage.tier}`);
console.log(`Period: ${usage.current_period}`);
console.log(`Detail views: ${usage.detail_views.used} / ${usage.detail_views.limit}`);
console.log(`List records: ${usage.list_records.used} / ${usage.list_records.limit}`);
console.log(`Burst limit: ${usage.per_minute_limit} req/min`);
```

### Rate Limit Information

Access rate limit headers from any request:

```typescript
const { data, rateLimit } = await client.colas.listWithRateLimit({ q: 'wine' });

if (rateLimit) {
  console.log(`Limit: ${rateLimit.limit}`);
  console.log(`Remaining: ${rateLimit.remaining}`);
  console.log(`Resets at: ${new Date(rateLimit.reset * 1000)}`);
}
```

## Error Handling

The SDK provides specific error classes for different error types:

```typescript
import {
  ColaCloud,
  ColaCloudError,
  AuthenticationError,
  RateLimitError,
  NotFoundError,
  ValidationError,
  ServerError,
  TimeoutError,
  NetworkError,
} from 'colacloud';

const client = new ColaCloud({ apiKey: 'your-api-key' });

try {
  const cola = await client.colas.get('invalid-id');
} catch (error) {
  if (error instanceof NotFoundError) {
    console.log(`${error.resourceType} not found: ${error.resourceId}`);
  } else if (error instanceof AuthenticationError) {
    console.log('Invalid API key');
  } else if (error instanceof RateLimitError) {
    console.log(`Rate limited. Retry after ${error.retryAfter} seconds`);
    console.log(`Remaining: ${error.rateLimit?.remaining}`);
  } else if (error instanceof ValidationError) {
    console.log('Invalid request:', error.message);
    console.log('Field errors:', error.fieldErrors);
  } else if (error instanceof ServerError) {
    console.log(`Server error (${error.statusCode}): ${error.message}`);
  } else if (error instanceof TimeoutError) {
    console.log(`Request timed out after ${error.timeoutMs}ms`);
  } else if (error instanceof NetworkError) {
    console.log('Network error:', error.message);
  } else if (error instanceof ColaCloudError) {
    // Generic API error
    console.log(`Error (${error.statusCode}): ${error.message}`);
  }
}
```

## TypeScript Types

All types are exported for use in your TypeScript code:

```typescript
import type {
  // Configuration
  ColaCloudConfig,

  // Pagination
  Pagination,
  PaginatedResponse,
  SingleResponse,

  // Rate limiting
  RateLimitInfo,

  // COLA types
  ColaSummary,
  ColaDetail,
  ColaImage,
  ColaBarcode,
  ColaListParams,

  // Permittee types
  PermitteeSummary,
  PermitteeDetail,
  PermitteeListParams,

  // Barcode types
  BarcodeLookupResult,

  // Usage types
  UsageStats,
} from 'colacloud';
```

## API Reference

### ColaCloud

The main client class.

#### Constructor

```typescript
new ColaCloud(config: ColaCloudConfig)
```

- `config.apiKey` (required): Your COLA Cloud API key
- `config.baseUrl` (optional): Base URL for the API
- `config.timeout` (optional): Request timeout in milliseconds

#### Resources

- `client.colas` - COLA endpoints
- `client.permittees` - Permittee endpoints
- `client.barcodes` - Barcode lookup endpoint
- `client.usage` - Usage statistics endpoint

### Colas Resource

- `list(params?)` - List/search COLAs
- `listWithRateLimit(params?)` - List with rate limit info
- `get(ttbId)` - Get a single COLA by TTB ID
- `getWithRateLimit(ttbId)` - Get with rate limit info
- `iterate(params?)` - Async iterator for all results

### Permittees Resource

- `list(params?)` - List/search permittees
- `listWithRateLimit(params?)` - List with rate limit info
- `get(permitNumber)` - Get a single permittee
- `getWithRateLimit(permitNumber)` - Get with rate limit info
- `iterate(params?)` - Async iterator for all results

### Barcodes Resource

- `lookup(barcodeValue)` - Look up COLAs by barcode
- `lookupWithRateLimit(barcodeValue)` - Lookup with rate limit info

### Usage Resource

- `get()` - Get API usage statistics
- `getWithRateLimit()` - Get with rate limit info

## Browser Usage

The SDK works in modern browsers that support the Fetch API:

```html
<script type="module">
  import { ColaCloud } from 'https://unpkg.com/colacloud/dist/index.mjs';

  const client = new ColaCloud({ apiKey: 'your-api-key' });
  const results = await client.colas.list({ q: 'wine' });
  console.log(results);
</script>
```

## License

MIT covers this SDK. Data and label artwork have separate rights and terms.

## Support

- Documentation: https://docs.colacloud.us/api-reference
- Issues: https://github.com/cola-cloud-us/colacloud-js/issues
- Email: help@colacloud.us
