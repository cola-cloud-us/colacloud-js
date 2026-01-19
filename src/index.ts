/**
 * COLA Cloud JavaScript/TypeScript SDK
 *
 * Official SDK for the COLA Cloud API - access the TTB COLA Registry
 * of alcohol product label approvals.
 *
 * @example
 * ```typescript
 * import { ColaCloud } from 'colacloud';
 *
 * const client = new ColaCloud({ apiKey: 'your-api-key' });
 *
 * // Search COLAs
 * const { data, pagination } = await client.colas.list({
 *   q: 'bourbon',
 *   productType: 'distilled spirits'
 * });
 *
 * // Get a single COLA
 * const cola = await client.colas.get('12345678');
 *
 * // Iterate all results with async iterator
 * for await (const cola of client.colas.iterate({ q: 'whiskey' })) {
 *   console.log(cola.ttb_id);
 * }
 * ```
 *
 * @packageDocumentation
 */

// Main client
export { ColaCloud } from './client.js';

// Error classes
export {
  ColaCloudError,
  AuthenticationError,
  RateLimitError,
  NotFoundError,
  ValidationError,
  ServerError,
  TimeoutError,
  NetworkError,
} from './errors.js';

// Pagination utilities
export {
  createPaginatedIterator,
  createPaginatedIteratorWithMetadata,
  collectAll,
  take,
} from './pagination.js';
export type {
  PaginatedIteratorOptions,
  PaginatedIteratorResult,
} from './pagination.js';

// Types
export type {
  // Configuration
  ColaCloudConfig,

  // Pagination
  Pagination,
  PaginatedResponse,
  SingleResponse,

  // Rate limiting
  RateLimitInfo,
  ResponseWithRateLimit,

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

  // Error types
  ApiErrorResponse,
} from './types.js';
