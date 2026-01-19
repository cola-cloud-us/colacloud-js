/**
 * COLA Cloud SDK Custom Error Classes
 */

import type { ApiErrorResponse, RateLimitInfo } from './types.js';

/**
 * Base error class for all COLA Cloud SDK errors
 */
export class ColaCloudError extends Error {
  /** HTTP status code (if applicable) */
  public readonly statusCode: number | undefined;
  /** Error code from the API */
  public readonly code: string | undefined;
  /** Additional error details */
  public readonly details: Record<string, unknown> | undefined;

  constructor(
    message: string,
    statusCode?: number,
    code?: string,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ColaCloudError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;

    // Maintains proper stack trace for where error was thrown (only in V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ColaCloudError);
    }
  }

  /**
   * Create a ColaCloudError from an API error response
   */
  static fromResponse(
    response: ApiErrorResponse,
    statusCode: number
  ): ColaCloudError {
    return new ColaCloudError(
      response.error,
      statusCode,
      response.code,
      response.details
    );
  }
}

/**
 * Error thrown when authentication fails (401 Unauthorized)
 */
export class AuthenticationError extends ColaCloudError {
  constructor(message: string = 'Invalid or missing API key') {
    super(message, 401, 'authentication_error');
    this.name = 'AuthenticationError';

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AuthenticationError);
    }
  }
}

/**
 * Error thrown when rate limit is exceeded (429 Too Many Requests)
 */
export class RateLimitError extends ColaCloudError {
  /** Rate limit information from headers */
  public readonly rateLimit: RateLimitInfo | null;
  /** Seconds until the rate limit resets */
  public readonly retryAfter: number | null;

  constructor(
    message: string = 'Rate limit exceeded',
    rateLimit: RateLimitInfo | null = null,
    retryAfter: number | null = null
  ) {
    super(message, 429, 'rate_limit_exceeded');
    this.name = 'RateLimitError';
    this.rateLimit = rateLimit;
    this.retryAfter = retryAfter;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, RateLimitError);
    }
  }
}

/**
 * Error thrown when a requested resource is not found (404 Not Found)
 */
export class NotFoundError extends ColaCloudError {
  /** The resource type that was not found */
  public readonly resourceType: string;
  /** The identifier that was searched for */
  public readonly resourceId: string;

  constructor(resourceType: string, resourceId: string) {
    super(`${resourceType} not found: ${resourceId}`, 404, 'not_found');
    this.name = 'NotFoundError';
    this.resourceType = resourceType;
    this.resourceId = resourceId;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, NotFoundError);
    }
  }
}

/**
 * Error thrown when the request is invalid (400 Bad Request)
 */
export class ValidationError extends ColaCloudError {
  /** Field-level validation errors */
  public readonly fieldErrors: Record<string, string[]> | undefined;

  constructor(
    message: string = 'Invalid request parameters',
    fieldErrors?: Record<string, string[]>
  ) {
    super(message, 400, 'validation_error', fieldErrors as Record<string, unknown>);
    this.name = 'ValidationError';
    this.fieldErrors = fieldErrors;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ValidationError);
    }
  }
}

/**
 * Error thrown when the server encounters an error (500+ status codes)
 */
export class ServerError extends ColaCloudError {
  constructor(message: string = 'Internal server error', statusCode: number = 500) {
    super(message, statusCode, 'server_error');
    this.name = 'ServerError';

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ServerError);
    }
  }
}

/**
 * Error thrown when a request times out
 */
export class TimeoutError extends ColaCloudError {
  /** The timeout value in milliseconds */
  public readonly timeoutMs: number;

  constructor(timeoutMs: number) {
    super(`Request timed out after ${timeoutMs}ms`, undefined, 'timeout');
    this.name = 'TimeoutError';
    this.timeoutMs = timeoutMs;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, TimeoutError);
    }
  }
}

/**
 * Error thrown when there's a network connectivity issue
 */
export class NetworkError extends ColaCloudError {
  /** The original error that caused this */
  public readonly cause: Error | undefined;

  constructor(message: string = 'Network error', cause?: Error) {
    super(message, undefined, 'network_error');
    this.name = 'NetworkError';
    this.cause = cause;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, NetworkError);
    }
  }
}
