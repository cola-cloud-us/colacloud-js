import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ColaCloud } from '../src/client.js';
import {
  AuthenticationError,
  ColaCloudError,
  NotFoundError,
  RateLimitError,
  ServerError,
  ValidationError,
} from '../src/errors.js';

describe('API error response contract', () => {
  const fetch = vi.fn();
  const client = new ColaCloud({ apiKey: 'test-key' });

  beforeEach(() => {
    fetch.mockReset();
    vi.stubGlobal('fetch', fetch);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('preserves a monthly quota rejection so a job can pause until reset', async () => {
    const details = { meter: 'detail_views', used: 200, limit: 200 };
    fetch.mockResolvedValueOnce(new Response(JSON.stringify({
      error: {
        code: 'quota_exceeded',
        message: 'Monthly detail view limit exceeded.',
        details,
        upgrade_url: 'https://app.colacloud.us/pricing',
      },
    }), {
      status: 429,
      headers: {
        'X-Detail-Views-Limit': '200',
        'X-Detail-Views-Remaining': '0',
        'X-Quota-Reset': '1793491200',
      },
    }));

    const error = await client.colas.get('fixture').catch(error => error);
    expect(error).toBeInstanceOf(RateLimitError);
    expect(error).toBeInstanceOf(ColaCloudError);
    expect(error).toMatchObject({
      statusCode: 429,
      code: 'quota_exceeded',
      message: 'Monthly detail view limit exceeded.',
      details,
      upgradeUrl: 'https://app.colacloud.us/pricing',
      quota: { meter: 'detail_views', remaining: 0, reset: 1793491200 },
      retryAfter: null,
    });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('keeps a burst rejection distinct and does not retry it', async () => {
    fetch.mockResolvedValueOnce(new Response(JSON.stringify({
      error: {
        code: 'rate_limit_exceeded',
        message: 'Please wait before making more requests.',
        details: { limit_per_minute: 10, retry_after: 60 },
      },
    }), { status: 429, headers: { 'Retry-After': '60' } }));
    const error = await client.colas.list().catch(error => error);
    expect(error).toBeInstanceOf(RateLimitError);
    expect(error).toMatchObject({
      code: 'rate_limit_exceeded',
      message: 'Please wait before making more requests.',
      retryAfter: 60,
      quota: null,
      details: { limit_per_minute: 10, retry_after: 60 },
    });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('keeps validation details without mislabeling them as field error arrays', async () => {
    fetch.mockResolvedValueOnce(new Response(JSON.stringify({
      error: {
        code: 'invalid_request',
        message: 'volume_unit is required.',
        details: { parameter: 'volume_unit' },
      },
    }), { status: 400 }));
    const error = await client.colas.list().catch(error => error);
    expect(error).toBeInstanceOf(ValidationError);
    expect(error).toMatchObject({
      code: 'invalid_request',
      message: 'volume_unit is required.',
      details: { parameter: 'volume_unit' },
    });
    expect(error.fieldErrors).toBeUndefined();
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it.each([
    [401, 'unauthorized', AuthenticationError],
    [404, 'not_found', NotFoundError],
    [503, 'search_unavailable', ServerError],
    [403, 'insufficient_scope', ColaCloudError],
  ])('preserves server error information for status %s', async (status, code, errorClass) => {
    fetch.mockResolvedValueOnce(new Response(JSON.stringify({
      error: { code, message: 'Fixture error message', details: { reason: 'fixture' } },
    }), { status }));
    const error = await client.colas.list().catch(error => error);
    expect(error).toBeInstanceOf(errorClass);
    expect(error).toMatchObject({ statusCode: status, code, message: 'Fixture error message', details: { reason: 'fixture' } });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('continues to accept the legacy flat envelope and field errors', async () => {
    fetch.mockResolvedValueOnce(new Response(JSON.stringify({
      error: 'Check the request.', code: 'invalid_request', details: { q: ['Invalid format'] },
    }), { status: 400 }));
    const error = await client.colas.list().catch(error => error);
    expect(error).toBeInstanceOf(ValidationError);
    expect(error).toMatchObject({ message: 'Check the request.', code: 'invalid_request', fieldErrors: { q: ['Invalid format'] } });
  });

  it.each([null, [], 'unexpected', { error: {} }, { error: { message: [], code: 10, details: [] } }])(
    'uses a readable fallback for a malformed JSON envelope: %j', async body => {
      fetch.mockResolvedValueOnce(new Response(JSON.stringify(body), { status: 429, statusText: 'Too Many Requests', headers: { 'Retry-After': 'invalid' } }));
      const error = await client.colas.list().catch(error => error);
      expect(error).toBeInstanceOf(RateLimitError);
      expect(error.message).toBe('Too Many Requests');
      expect(error.details).toBeUndefined();
      expect(error.retryAfter).toBeNull();
      expect(fetch).toHaveBeenCalledTimes(1);
    }
  );

  it('does not turn a non-JSON HTTP failure into a network error', async () => {
    fetch.mockResolvedValueOnce(new Response('<html>fixture</html>', { status: 503, statusText: 'Service Unavailable' }));
    const error = await client.colas.list().catch(error => error);
    expect(error).toBeInstanceOf(ServerError);
    expect(error.message).toBe('Service Unavailable');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('normalizes the public error factory too', () => {
    const error = ColaCloudError.fromResponse({ error: { code: 'invalid_request', message: 'Check the request.', details: { parameter: 'fixture' } } }, 400);
    expect(error).toMatchObject({ code: 'invalid_request', message: 'Check the request.', details: { parameter: 'fixture' } });
  });
});
