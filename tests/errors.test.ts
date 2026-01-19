/**
 * Tests for COLA Cloud SDK Error Classes
 */

import { describe, it, expect } from 'vitest';
import {
  ColaCloudError,
  AuthenticationError,
  RateLimitError,
  NotFoundError,
  ValidationError,
  ServerError,
  TimeoutError,
  NetworkError,
} from '../src/errors.js';

describe('ColaCloudError', () => {
  it('should create an error with message', () => {
    const error = new ColaCloudError('Something went wrong');
    expect(error.message).toBe('Something went wrong');
    expect(error.name).toBe('ColaCloudError');
  });

  it('should include status code and details', () => {
    const error = new ColaCloudError('Bad request', 400, 'validation_error', {
      field: 'name',
    });
    expect(error.statusCode).toBe(400);
    expect(error.code).toBe('validation_error');
    expect(error.details).toEqual({ field: 'name' });
  });

  it('should create from API response', () => {
    const error = ColaCloudError.fromResponse(
      { error: 'API Error', code: 'test_code' },
      500
    );
    expect(error.message).toBe('API Error');
    expect(error.statusCode).toBe(500);
    expect(error.code).toBe('test_code');
  });

  it('should be an instance of Error', () => {
    const error = new ColaCloudError('Test');
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ColaCloudError);
  });
});

describe('AuthenticationError', () => {
  it('should create with default message', () => {
    const error = new AuthenticationError();
    expect(error.message).toBe('Invalid or missing API key');
    expect(error.name).toBe('AuthenticationError');
    expect(error.statusCode).toBe(401);
    expect(error.code).toBe('authentication_error');
  });

  it('should create with custom message', () => {
    const error = new AuthenticationError('API key expired');
    expect(error.message).toBe('API key expired');
  });

  it('should be an instance of ColaCloudError', () => {
    const error = new AuthenticationError();
    expect(error).toBeInstanceOf(ColaCloudError);
    expect(error).toBeInstanceOf(AuthenticationError);
  });
});

describe('RateLimitError', () => {
  it('should create with default message', () => {
    const error = new RateLimitError();
    expect(error.message).toBe('Rate limit exceeded');
    expect(error.name).toBe('RateLimitError');
    expect(error.statusCode).toBe(429);
    expect(error.code).toBe('rate_limit_exceeded');
  });

  it('should include rate limit info', () => {
    const rateLimit = { limit: 60, remaining: 0, reset: 1704067260 };
    const error = new RateLimitError('Too many requests', rateLimit, 30);
    expect(error.rateLimit).toEqual(rateLimit);
    expect(error.retryAfter).toBe(30);
  });

  it('should handle null rate limit info', () => {
    const error = new RateLimitError('Too many requests', null, null);
    expect(error.rateLimit).toBeNull();
    expect(error.retryAfter).toBeNull();
  });
});

describe('NotFoundError', () => {
  it('should create with resource info', () => {
    const error = new NotFoundError('COLA', '12345678');
    expect(error.message).toBe('COLA not found: 12345678');
    expect(error.name).toBe('NotFoundError');
    expect(error.statusCode).toBe(404);
    expect(error.code).toBe('not_found');
    expect(error.resourceType).toBe('COLA');
    expect(error.resourceId).toBe('12345678');
  });
});

describe('ValidationError', () => {
  it('should create with default message', () => {
    const error = new ValidationError();
    expect(error.message).toBe('Invalid request parameters');
    expect(error.name).toBe('ValidationError');
    expect(error.statusCode).toBe(400);
    expect(error.code).toBe('validation_error');
  });

  it('should include field errors', () => {
    const fieldErrors = {
      abv_min: ['Must be a number'],
      q: ['Cannot be empty'],
    };
    const error = new ValidationError('Validation failed', fieldErrors);
    expect(error.fieldErrors).toEqual(fieldErrors);
  });
});

describe('ServerError', () => {
  it('should create with default values', () => {
    const error = new ServerError();
    expect(error.message).toBe('Internal server error');
    expect(error.name).toBe('ServerError');
    expect(error.statusCode).toBe(500);
  });

  it('should accept custom status code', () => {
    const error = new ServerError('Service unavailable', 503);
    expect(error.message).toBe('Service unavailable');
    expect(error.statusCode).toBe(503);
  });
});

describe('TimeoutError', () => {
  it('should create with timeout value', () => {
    const error = new TimeoutError(30000);
    expect(error.message).toBe('Request timed out after 30000ms');
    expect(error.name).toBe('TimeoutError');
    expect(error.code).toBe('timeout');
    expect(error.timeoutMs).toBe(30000);
  });
});

describe('NetworkError', () => {
  it('should create with default message', () => {
    const error = new NetworkError();
    expect(error.message).toBe('Network error');
    expect(error.name).toBe('NetworkError');
    expect(error.code).toBe('network_error');
  });

  it('should include cause error', () => {
    const cause = new Error('Connection refused');
    const error = new NetworkError('Failed to connect', cause);
    expect(error.message).toBe('Failed to connect');
    expect(error.cause).toBe(cause);
  });
});
