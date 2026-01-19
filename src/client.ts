/**
 * COLA Cloud SDK Client
 */

import {
  AuthenticationError,
  ColaCloudError,
  NetworkError,
  NotFoundError,
  RateLimitError,
  ServerError,
  TimeoutError,
  ValidationError,
} from './errors.js';
import { createPaginatedIterator } from './pagination.js';
import type {
  ApiErrorResponse,
  BarcodeLookupResult,
  ColaCloudConfig,
  ColaDetail,
  ColaListParams,
  ColaSummary,
  PaginatedResponse,
  PermitteeDetail,
  PermitteeListParams,
  PermitteeSummary,
  RateLimitInfo,
  SingleResponse,
  UsageStats,
} from './types.js';

const DEFAULT_BASE_URL = 'https://app.colacloud.us/api/v1';
const DEFAULT_TIMEOUT = 30000;

/**
 * Internal type for fetch response with rate limit info
 */
interface FetchResult<T> {
  data: T;
  rateLimit: RateLimitInfo | null;
}

/**
 * Convert camelCase params to snake_case for API
 */
function toSnakeCase(params: Record<string, unknown>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    // Convert camelCase to snake_case
    const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
    result[snakeKey] = String(value);
  }
  return result;
}

/**
 * Parse rate limit information from response headers
 */
function parseRateLimitHeaders(headers: Headers): RateLimitInfo | null {
  const limit = headers.get('X-RateLimit-Limit');
  const remaining = headers.get('X-RateLimit-Remaining');
  const reset = headers.get('X-RateLimit-Reset');

  if (limit === null || remaining === null || reset === null) {
    return null;
  }

  return {
    limit: parseInt(limit, 10),
    remaining: parseInt(remaining, 10),
    reset: parseInt(reset, 10),
  };
}

/**
 * COLA Cloud API Client
 *
 * The main entry point for interacting with the COLA Cloud API.
 *
 * @example
 * ```typescript
 * import { ColaCloud } from 'colacloud';
 *
 * const client = new ColaCloud({ apiKey: 'your-api-key' });
 *
 * // Search COLAs
 * const { data, pagination } = await client.colas.list({ q: 'bourbon' });
 *
 * // Get a single COLA
 * const cola = await client.colas.get('12345678');
 *
 * // Iterate all results
 * for await (const cola of client.colas.iterate({ q: 'whiskey' })) {
 *   console.log(cola.ttb_id);
 * }
 * ```
 */
export class ColaCloud {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeout: number;

  /** COLA (Certificate of Label Approval) endpoints */
  public readonly colas: ColasResource;
  /** Permittee (business/permit holder) endpoints */
  public readonly permittees: PermitteesResource;
  /** Barcode lookup endpoint */
  public readonly barcodes: BarcodesResource;
  /** Usage statistics endpoint */
  public readonly usage: UsageResource;

  /**
   * Create a new COLA Cloud API client
   * @param config Configuration options
   */
  constructor(config: ColaCloudConfig) {
    if (!config.apiKey) {
      throw new Error('API key is required');
    }

    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;
    this.timeout = config.timeout ?? DEFAULT_TIMEOUT;

    // Initialize resource handlers
    this.colas = new ColasResource(this);
    this.permittees = new PermitteesResource(this);
    this.barcodes = new BarcodesResource(this);
    this.usage = new UsageResource(this);
  }

  /**
   * Make an authenticated request to the API
   * @internal
   */
  async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    params?: Record<string, unknown>
  ): Promise<FetchResult<T>> {
    // Build URL with query parameters for GET requests
    let url = `${this.baseUrl}${path}`;
    if (method === 'GET' && params && Object.keys(params).length > 0) {
      const searchParams = new URLSearchParams(toSnakeCase(params));
      url += `?${searchParams.toString()}`;
    }

    // Set up abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'X-API-Key': this.apiKey,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Parse rate limit headers
      const rateLimit = parseRateLimitHeaders(response.headers);

      // Handle errors
      if (!response.ok) {
        await this.handleErrorResponse(response, rateLimit);
      }

      // Parse successful response
      const data = (await response.json()) as T;
      return { data, rateLimit };
    } catch (error) {
      clearTimeout(timeoutId);

      // Handle abort (timeout)
      if (error instanceof Error && error.name === 'AbortError') {
        throw new TimeoutError(this.timeout);
      }

      // Re-throw our custom errors
      if (error instanceof ColaCloudError) {
        throw error;
      }

      // Wrap other errors as NetworkError
      throw new NetworkError(
        error instanceof Error ? error.message : 'Unknown error',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Handle error responses from the API
   */
  private async handleErrorResponse(
    response: Response,
    rateLimit: RateLimitInfo | null
  ): Promise<never> {
    let errorData: ApiErrorResponse;
    try {
      errorData = (await response.json()) as ApiErrorResponse;
    } catch {
      errorData = { error: response.statusText || 'Unknown error' };
    }

    const message = errorData.error || 'Unknown error';

    switch (response.status) {
      case 401:
        throw new AuthenticationError(message);

      case 404:
        throw new NotFoundError('Resource', 'unknown');

      case 429: {
        const retryAfter = response.headers.get('Retry-After');
        throw new RateLimitError(
          message,
          rateLimit,
          retryAfter ? parseInt(retryAfter, 10) : null
        );
      }

      case 400:
        throw new ValidationError(
          message,
          errorData.details as Record<string, string[]> | undefined
        );

      default:
        if (response.status >= 500) {
          throw new ServerError(message, response.status);
        }
        throw ColaCloudError.fromResponse(errorData, response.status);
    }
  }
}

/**
 * COLA (Certificate of Label Approval) resource handler
 */
class ColasResource {
  constructor(private readonly client: ColaCloud) {}

  /**
   * List and search COLAs with pagination
   * @param params Search and filter parameters
   * @returns Paginated list of COLA summaries
   */
  async list(params: ColaListParams = {}): Promise<PaginatedResponse<ColaSummary>> {
    const result = await this.client.request<PaginatedResponse<ColaSummary>>(
      'GET',
      '/colas',
      params as Record<string, unknown>
    );
    return result.data;
  }

  /**
   * List COLAs with rate limit information
   * @param params Search and filter parameters
   * @returns Paginated list with rate limit info
   */
  async listWithRateLimit(
    params: ColaListParams = {}
  ): Promise<FetchResult<PaginatedResponse<ColaSummary>>> {
    return this.client.request<PaginatedResponse<ColaSummary>>(
      'GET',
      '/colas',
      params as Record<string, unknown>
    );
  }

  /**
   * Get a single COLA by TTB ID
   * @param ttbId The unique TTB identifier
   * @returns Full COLA details including images and barcodes
   */
  async get(ttbId: string): Promise<ColaDetail> {
    try {
      const result = await this.client.request<SingleResponse<ColaDetail>>(
        'GET',
        `/colas/${encodeURIComponent(ttbId)}`
      );
      return result.data.data;
    } catch (error) {
      // Enhance NotFoundError with resource info
      if (error instanceof NotFoundError) {
        throw new NotFoundError('COLA', ttbId);
      }
      throw error;
    }
  }

  /**
   * Get a single COLA with rate limit information
   * @param ttbId The unique TTB identifier
   * @returns COLA details with rate limit info
   */
  async getWithRateLimit(ttbId: string): Promise<FetchResult<ColaDetail>> {
    try {
      const result = await this.client.request<SingleResponse<ColaDetail>>(
        'GET',
        `/colas/${encodeURIComponent(ttbId)}`
      );
      return { data: result.data.data, rateLimit: result.rateLimit };
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw new NotFoundError('COLA', ttbId);
      }
      throw error;
    }
  }

  /**
   * Create an async iterator that automatically pages through all results
   * @param params Search and filter parameters (page is ignored)
   * @returns Async iterable that yields individual COLA summaries
   *
   * @example
   * ```typescript
   * for await (const cola of client.colas.iterate({ q: 'bourbon' })) {
   *   console.log(cola.ttb_id, cola.brand_name);
   * }
   * ```
   */
  iterate(params: Omit<ColaListParams, 'page'> = {}): AsyncIterable<ColaSummary> {
    return createPaginatedIterator<ColaSummary, Omit<ColaListParams, 'page'>>({
      params,
      fetchPage: async (p) => {
        const result = await this.client.request<PaginatedResponse<ColaSummary>>(
          'GET',
          '/colas',
          p as unknown as Record<string, unknown>
        );
        return { response: result.data, rateLimit: result.rateLimit };
      },
    });
  }
}

/**
 * Permittee (business/permit holder) resource handler
 */
class PermitteesResource {
  constructor(private readonly client: ColaCloud) {}

  /**
   * List and search permittees with pagination
   * @param params Search and filter parameters
   * @returns Paginated list of permittee summaries
   */
  async list(
    params: PermitteeListParams = {}
  ): Promise<PaginatedResponse<PermitteeSummary>> {
    const result = await this.client.request<PaginatedResponse<PermitteeSummary>>(
      'GET',
      '/permittees',
      params as Record<string, unknown>
    );
    return result.data;
  }

  /**
   * List permittees with rate limit information
   * @param params Search and filter parameters
   * @returns Paginated list with rate limit info
   */
  async listWithRateLimit(
    params: PermitteeListParams = {}
  ): Promise<FetchResult<PaginatedResponse<PermitteeSummary>>> {
    return this.client.request<PaginatedResponse<PermitteeSummary>>(
      'GET',
      '/permittees',
      params as Record<string, unknown>
    );
  }

  /**
   * Get a single permittee by permit number
   * @param permitNumber The unique permit number
   * @returns Full permittee details including recent COLAs
   */
  async get(permitNumber: string): Promise<PermitteeDetail> {
    try {
      const result = await this.client.request<SingleResponse<PermitteeDetail>>(
        'GET',
        `/permittees/${encodeURIComponent(permitNumber)}`
      );
      return result.data.data;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw new NotFoundError('Permittee', permitNumber);
      }
      throw error;
    }
  }

  /**
   * Get a single permittee with rate limit information
   * @param permitNumber The unique permit number
   * @returns Permittee details with rate limit info
   */
  async getWithRateLimit(
    permitNumber: string
  ): Promise<FetchResult<PermitteeDetail>> {
    try {
      const result = await this.client.request<SingleResponse<PermitteeDetail>>(
        'GET',
        `/permittees/${encodeURIComponent(permitNumber)}`
      );
      return { data: result.data.data, rateLimit: result.rateLimit };
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw new NotFoundError('Permittee', permitNumber);
      }
      throw error;
    }
  }

  /**
   * Create an async iterator that automatically pages through all results
   * @param params Search and filter parameters (page is ignored)
   * @returns Async iterable that yields individual permittee summaries
   *
   * @example
   * ```typescript
   * for await (const permittee of client.permittees.iterate({ state: 'CA' })) {
   *   console.log(permittee.company_name);
   * }
   * ```
   */
  iterate(
    params: Omit<PermitteeListParams, 'page'> = {}
  ): AsyncIterable<PermitteeSummary> {
    return createPaginatedIterator<PermitteeSummary, Omit<PermitteeListParams, 'page'>>({
      params,
      fetchPage: async (p) => {
        const result = await this.client.request<
          PaginatedResponse<PermitteeSummary>
        >('GET', '/permittees', p as unknown as Record<string, unknown>);
        return { response: result.data, rateLimit: result.rateLimit };
      },
    });
  }
}

/**
 * Barcode lookup resource handler
 */
class BarcodesResource {
  constructor(private readonly client: ColaCloud) {}

  /**
   * Look up COLAs by barcode value
   * @param barcodeValue The barcode to search for (UPC, EAN, etc.)
   * @returns Barcode information and associated COLAs
   */
  async lookup(barcodeValue: string): Promise<BarcodeLookupResult> {
    try {
      const result = await this.client.request<
        SingleResponse<BarcodeLookupResult>
      >('GET', `/barcode/${encodeURIComponent(barcodeValue)}`);
      return result.data.data;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw new NotFoundError('Barcode', barcodeValue);
      }
      throw error;
    }
  }

  /**
   * Look up barcode with rate limit information
   * @param barcodeValue The barcode to search for
   * @returns Barcode lookup result with rate limit info
   */
  async lookupWithRateLimit(
    barcodeValue: string
  ): Promise<FetchResult<BarcodeLookupResult>> {
    try {
      const result = await this.client.request<
        SingleResponse<BarcodeLookupResult>
      >('GET', `/barcode/${encodeURIComponent(barcodeValue)}`);
      return { data: result.data.data, rateLimit: result.rateLimit };
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw new NotFoundError('Barcode', barcodeValue);
      }
      throw error;
    }
  }
}

/**
 * Usage statistics resource handler
 */
class UsageResource {
  constructor(private readonly client: ColaCloud) {}

  /**
   * Get API usage statistics for the current account
   * @returns Usage statistics including limits and current usage
   */
  async get(): Promise<UsageStats> {
    const result = await this.client.request<SingleResponse<UsageStats>>(
      'GET',
      '/usage'
    );
    return result.data.data;
  }

  /**
   * Get usage statistics with rate limit information
   * @returns Usage statistics with rate limit info
   */
  async getWithRateLimit(): Promise<FetchResult<UsageStats>> {
    const result = await this.client.request<SingleResponse<UsageStats>>(
      'GET',
      '/usage'
    );
    return { data: result.data.data, rateLimit: result.rateLimit };
  }
}
