/**
 * Tests for the COLA Cloud SDK Client
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ColaCloud } from '../src/client.js';
import {
  AuthenticationError,
  NotFoundError,
  RateLimitError,
  ValidationError,
  ServerError,
  TimeoutError,
} from '../src/errors.js';

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('ColaCloud', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should create a client with required config', () => {
      const client = new ColaCloud({ apiKey: 'test-key' });
      expect(client).toBeInstanceOf(ColaCloud);
    });

    it('should throw if apiKey is missing', () => {
      expect(() => new ColaCloud({ apiKey: '' })).toThrow('API key is required');
    });

    it('should accept custom baseUrl', () => {
      const client = new ColaCloud({
        apiKey: 'test-key',
        baseUrl: 'https://custom.api.com/v1',
      });
      expect(client).toBeInstanceOf(ColaCloud);
    });
  });

  describe('colas.list', () => {
    it('should fetch COLAs list', async () => {
      const mockResponse = {
        data: [
          { ttb_id: '123', brand_name: 'Test Brand', image_count: 1 },
        ],
        pagination: { page: 1, per_page: 20, total: 1, pages: 1 },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
        headers: new Headers(),
      });

      const client = new ColaCloud({ apiKey: 'test-key' });
      const result = await client.colas.list();

      expect(result.data).toHaveLength(1);
      expect(result.data[0]?.ttb_id).toBe('123');
      expect(result.pagination.total).toBe(1);
    });

    it('should pass query parameters correctly', async () => {
      const mockResponse = {
        data: [],
        pagination: { page: 1, per_page: 20, total: 0, pages: 0 },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
        headers: new Headers(),
      });

      const client = new ColaCloud({ apiKey: 'test-key' });
      await client.colas.list({
        q: 'bourbon',
        productType: 'distilled spirits',
        abvMin: 40,
        page: 2,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('q=bourbon'),
        expect.any(Object)
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('product_type=distilled+spirits'),
        expect.any(Object)
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('abv_min=40'),
        expect.any(Object)
      );
    });

    it('should include API key header', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [], pagination: {} }),
        headers: new Headers(),
      });

      const client = new ColaCloud({ apiKey: 'my-secret-key' });
      await client.colas.list();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-API-Key': 'my-secret-key',
          }),
        })
      );
    });
  });

  describe('colas.get', () => {
    it('should fetch a single COLA', async () => {
      const mockCola = {
        ttb_id: '12345678',
        brand_name: 'Test Bourbon',
        images: [],
        barcodes: [],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockCola }),
        headers: new Headers(),
      });

      const client = new ColaCloud({ apiKey: 'test-key' });
      const result = await client.colas.get('12345678');

      expect(result.ttb_id).toBe('12345678');
      expect(result.brand_name).toBe('Test Bourbon');
    });

    it('should throw NotFoundError for 404', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({ error: 'COLA not found' }),
        headers: new Headers(),
      });

      const client = new ColaCloud({ apiKey: 'test-key' });

      await expect(client.colas.get('nonexistent')).rejects.toThrow(NotFoundError);

      // Reset the mock for the second assertion
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: 'COLA not found' }),
        headers: new Headers(),
      });

      await expect(client.colas.get('nonexistent')).rejects.toMatchObject({
        resourceType: 'COLA',
        resourceId: 'nonexistent',
      });
    });
  });

  describe('colas.iterate', () => {
    it('should iterate through paginated results', async () => {
      // First page
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [{ ttb_id: '1' }, { ttb_id: '2' }],
          pagination: { page: 1, per_page: 2, total: 3, pages: 2 },
        }),
        headers: new Headers(),
      });

      // Second page
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [{ ttb_id: '3' }],
          pagination: { page: 2, per_page: 2, total: 3, pages: 2 },
        }),
        headers: new Headers(),
      });

      const client = new ColaCloud({ apiKey: 'test-key' });
      const items = [];

      for await (const cola of client.colas.iterate({ perPage: 2 })) {
        items.push(cola);
      }

      expect(items).toHaveLength(3);
      expect(items.map(c => c.ttb_id)).toEqual(['1', '2', '3']);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('permittees.list', () => {
    it('should fetch permittees list', async () => {
      const mockResponse = {
        data: [
          { permit_number: 'NY-12345', company_name: 'Test Company' },
        ],
        pagination: { page: 1, per_page: 20, total: 1, pages: 1 },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
        headers: new Headers(),
      });

      const client = new ColaCloud({ apiKey: 'test-key' });
      const result = await client.permittees.list({ state: 'NY' });

      expect(result.data).toHaveLength(1);
      expect(result.data[0]?.permit_number).toBe('NY-12345');
    });
  });

  describe('permittees.get', () => {
    it('should fetch a single permittee', async () => {
      const mockPermittee = {
        permit_number: 'NY-12345',
        company_name: 'Test Distillery',
        recent_colas: [],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockPermittee }),
        headers: new Headers(),
      });

      const client = new ColaCloud({ apiKey: 'test-key' });
      const result = await client.permittees.get('NY-12345');

      expect(result.permit_number).toBe('NY-12345');
    });
  });

  describe('barcodes.lookup', () => {
    it('should lookup a barcode', async () => {
      const mockResult = {
        barcode_value: '012345678905',
        barcode_type: 'UPC-A',
        colas: [{ ttb_id: '123' }],
        total_colas: 1,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockResult }),
        headers: new Headers(),
      });

      const client = new ColaCloud({ apiKey: 'test-key' });
      const result = await client.barcodes.lookup('012345678905');

      expect(result.barcode_value).toBe('012345678905');
      expect(result.colas).toHaveLength(1);
    });
  });

  describe('usage.get', () => {
    it('should fetch usage stats', async () => {
      const mockUsage = {
        tier: 'pro',
        monthly_limit: 10000,
        current_period: '2024-01-01',
        requests_used: 500,
        requests_remaining: 9500,
        per_minute_limit: 60,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockUsage }),
        headers: new Headers(),
      });

      const client = new ColaCloud({ apiKey: 'test-key' });
      const result = await client.usage.get();

      expect(result.tier).toBe('pro');
      expect(result.requests_remaining).toBe(9500);
    });
  });

  describe('error handling', () => {
    it('should throw AuthenticationError for 401', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Invalid API key' }),
        headers: new Headers(),
      });

      const client = new ColaCloud({ apiKey: 'bad-key' });

      await expect(client.colas.list()).rejects.toThrow(AuthenticationError);
    });

    it('should throw RateLimitError for 429 with retry info', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({ error: 'Rate limit exceeded' }),
        headers: new Headers({
          'X-RateLimit-Limit': '60',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': '1704067260',
          'Retry-After': '30',
        }),
      });

      const client = new ColaCloud({ apiKey: 'test-key' });

      try {
        await client.colas.list();
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(RateLimitError);
        const rateLimitError = error as RateLimitError;
        expect(rateLimitError.retryAfter).toBe(30);
        expect(rateLimitError.rateLimit?.remaining).toBe(0);
      }
    });

    it('should throw ValidationError for 400', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Invalid parameter: abv_min must be a number' }),
        headers: new Headers(),
      });

      const client = new ColaCloud({ apiKey: 'test-key' });

      await expect(client.colas.list()).rejects.toThrow(ValidationError);
    });

    it('should throw ServerError for 500', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Internal server error' }),
        headers: new Headers(),
      });

      const client = new ColaCloud({ apiKey: 'test-key' });

      await expect(client.colas.list()).rejects.toThrow(ServerError);
    });

    it('should throw TimeoutError when request times out', async () => {
      mockFetch.mockImplementationOnce(
        () =>
          new Promise((_, reject) => {
            const error = new Error('Aborted');
            error.name = 'AbortError';
            reject(error);
          })
      );

      const client = new ColaCloud({ apiKey: 'test-key', timeout: 100 });

      await expect(client.colas.list()).rejects.toThrow(TimeoutError);
    });
  });

  describe('rate limit headers', () => {
    it('should parse rate limit headers', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [], pagination: {} }),
        headers: new Headers({
          'X-RateLimit-Limit': '60',
          'X-RateLimit-Remaining': '59',
          'X-RateLimit-Reset': '1704067260',
        }),
      });

      const client = new ColaCloud({ apiKey: 'test-key' });
      const result = await client.colas.listWithRateLimit();

      expect(result.rateLimit).toEqual({
        limit: 60,
        remaining: 59,
        reset: 1704067260,
      });
    });
  });
});
