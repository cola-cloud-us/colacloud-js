/**
 * Tests for the COLA Cloud SDK Client
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ColaCloud } from '../src/client.js';
import {
  AuthenticationError,
  NetworkError,
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
          'X-Detail-Views-Limit': '60',
          'X-Detail-Views-Remaining': '0',
          'X-Quota-Reset': '1704067260',
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
        expect(rateLimitError.quota?.remaining).toBe(0);
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

    it('should throw NetworkError for network failures', async () => {
      mockFetch.mockRejectedValueOnce(new Error('ECONNREFUSED'));

      const client = new ColaCloud({ apiKey: 'test-key' });

      await expect(client.colas.list()).rejects.toThrow('ECONNREFUSED');
    });

    it('should include original error as cause in NetworkError', async () => {
      const originalError = new Error('Connection refused');
      mockFetch.mockRejectedValueOnce(originalError);

      const client = new ColaCloud({ apiKey: 'test-key' });

      try {
        await client.colas.list();
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(NetworkError);
        const networkError = error as NetworkError;
        expect(networkError.cause).toBe(originalError);
      }
    });
  });

  describe('quota headers', () => {
    it('should parse detail view quota headers', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { data: {} } }),
        headers: new Headers({
          'X-Detail-Views-Limit': '200',
          'X-Detail-Views-Remaining': '150',
          'X-Quota-Reset': '1704067260',
        }),
      });

      const client = new ColaCloud({ apiKey: 'test-key' });
      const result = await client.colas.getWithQuota('12345');

      expect(result.quota).toEqual({
        meter: 'detail_views',
        limit: 200,
        remaining: 150,
        reset: 1704067260,
      });
    });

    it('should parse list record quota headers', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [], pagination: {} }),
        headers: new Headers({
          'X-List-Records-Limit': '10000',
          'X-List-Records-Remaining': '9900',
          'X-Quota-Reset': '1704067260',
        }),
      });

      const client = new ColaCloud({ apiKey: 'test-key' });
      const result = await client.colas.listWithQuota();

      expect(result.quota).toEqual({
        meter: 'list_records',
        limit: 10000,
        remaining: 9900,
        reset: 1704067260,
      });
    });
  });

  describe('processingTimes.list', () => {
    it('should fetch processing times', async () => {
      const mockResponse = {
        data: [
          { commodity: 'Wine', avg_days: 12 },
          { commodity: 'Spirits', avg_days: 15 },
        ],
        meta: { total: 2 },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
        headers: new Headers(),
      });

      const client = new ColaCloud({ apiKey: 'test-key' });
      const result = await client.processingTimes.list();

      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
    });

    it('should pass commodity filter', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [], meta: { total: 0 } }),
        headers: new Headers(),
      });

      const client = new ColaCloud({ apiKey: 'test-key' });
      await client.processingTimes.list({ commodity: 'Wine' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('commodity=Wine'),
        expect.any(Object)
      );
    });
  });

  describe('processingTimes.formula', () => {
    it('should fetch formula processing times', async () => {
      const mockResponse = {
        data: [{ formula_type: 'Domestic', avg_days: 10 }],
        meta: { total: 1 },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
        headers: new Headers(),
      });

      const client = new ColaCloud({ apiKey: 'test-key' });
      const result = await client.processingTimes.formula();

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('should pass filter parameters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [], meta: { total: 0 } }),
        headers: new Headers(),
      });

      const client = new ColaCloud({ apiKey: 'test-key' });
      await client.processingTimes.formula({
        formulaType: 'Domestic',
        commodity: 'Wine',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('formula_type=Domestic'),
        expect.any(Object)
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('commodity=Wine'),
        expect.any(Object)
      );
    });
  });

  describe('processingTimes.registration', () => {
    it('should fetch registration processing times', async () => {
      const mockResponse = {
        data: [{ category: 'Beverage', avg_days: 8 }],
        meta: { total: 1 },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
        headers: new Headers(),
      });

      const client = new ColaCloud({ apiKey: 'test-key' });
      const result = await client.processingTimes.registration();

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('should pass filter parameters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [], meta: { total: 0 } }),
        headers: new Headers(),
      });

      const client = new ColaCloud({ apiKey: 'test-key' });
      await client.processingTimes.registration({
        category: 'Beverage',
        applicationType: 'New',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('category=Beverage'),
        expect.any(Object)
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('application_type=New'),
        expect.any(Object)
      );
    });
  });

  describe('productionReports.list', () => {
    it('should fetch production reports', async () => {
      const mockResponse = {
        data: [
          { commodity: 'Wine', year: 2024, month: 1, volume: 1000 },
        ],
        meta: { total: 50, page: 1, per_page: 100, has_more: false },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
        headers: new Headers(),
      });

      const client = new ColaCloud({ apiKey: 'test-key' });
      const result = await client.productionReports.list();

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(50);
      expect(result.meta.has_more).toBe(false);
    });

    it('should pass filter and pagination parameters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [],
          meta: { total: 0, page: 2, per_page: 50, has_more: false },
        }),
        headers: new Headers(),
      });

      const client = new ColaCloud({ apiKey: 'test-key' });
      await client.productionReports.list({
        commodity: 'Wine',
        year: 2024,
        month: 1,
        reportType: 'summary',
        statisticalGroup: 'table',
        page: 2,
        perPage: 50,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('commodity=Wine'),
        expect.any(Object)
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('year=2024'),
        expect.any(Object)
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('month=1'),
        expect.any(Object)
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('report_type=summary'),
        expect.any(Object)
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('statistical_group=table'),
        expect.any(Object)
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('page=2'),
        expect.any(Object)
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('per_page=50'),
        expect.any(Object)
      );
    });
  });

  describe('avas.list', () => {
    it('should fetch AVAs', async () => {
      const mockResponse = {
        data: [
          { id: 'napa-valley', name: 'Napa Valley', state: 'CA' },
          { id: 'willamette-valley', name: 'Willamette Valley', state: 'OR' },
        ],
        meta: { total: 2 },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
        headers: new Headers(),
      });

      const client = new ColaCloud({ apiKey: 'test-key' });
      const result = await client.avas.list();

      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
    });

    it('should pass filter parameters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [], meta: { total: 0 } }),
        headers: new Headers(),
      });

      const client = new ColaCloud({ apiKey: 'test-key' });
      await client.avas.list({ state: 'CA', q: 'napa' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('state=CA'),
        expect.any(Object)
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('q=napa'),
        expect.any(Object)
      );
    });
  });

  describe('avas.get', () => {
    it('should fetch a single AVA', async () => {
      const mockAva = {
        id: 'napa-valley',
        name: 'Napa Valley',
        state: 'CA',
        established: '1981-02-27',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockAva }),
        headers: new Headers(),
      });

      const client = new ColaCloud({ apiKey: 'test-key' });
      const result = await client.avas.get('napa-valley');

      expect(result).toEqual(mockAva);
    });

    it('should throw NotFoundError for 404', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({ error: 'AVA not found' }),
        headers: new Headers(),
      });

      const client = new ColaCloud({ apiKey: 'test-key' });

      await expect(client.avas.get('nonexistent')).rejects.toThrow(
        NotFoundError
      );

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: 'AVA not found' }),
        headers: new Headers(),
      });

      await expect(client.avas.get('nonexistent')).rejects.toMatchObject({
        resourceType: 'AVA',
        resourceId: 'nonexistent',
      });
    });
  });
});
