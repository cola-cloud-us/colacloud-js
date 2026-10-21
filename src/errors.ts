/**
 * COLA Cloud SDK Custom Error Classes
 */

import type { ApiErrorResponse, QuotaInfo } from './types.js';

export interface ApiErrorMetadata {
  code?: string;
  details?: Record<string, unknown>;
  upgradeUrl?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function nonemptyString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

export function normalizeApiErrorResponse(
  response: unknown,
  fallbackMessage = 'Unknown error'
): ApiErrorMetadata & { message: string } {
  const body = isRecord(response) ? response : {};
  const error = isRecord(body.error) ? body.error : body;
  return {
    message:
      nonemptyString(isRecord(body.error) ? error.message : body.error) ?? fallbackMessage,
    code: nonemptyString(error.code),
    details: isRecord(error.details) ? error.details : undefined,
    upgradeUrl: nonemptyString(error.upgrade_url),
  };
}

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
  /** Upgrade URL supplied by the API, when relevant. */
  public readonly upgradeUrl: string | undefined;

  constructor(
    message: string,
    statusCode?: number,
    code?: string,
    details?: Record<string, unknown>,
    upgradeUrl?: string
  ) {
    super(message);
    this.name = 'ColaCloudError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.upgradeUrl = upgradeUrl;

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
    const error = normalizeApiErrorResponse(response);
    return new ColaCloudError(
      error.message, statusCode, error.code, error.details, error.upgradeUrl
    );
  }
}

/**
 * Error thrown when authentication fails (401 Unauthorized)
 */
export class AuthenticationError extends ColaCloudError {
  constructor(
    message: string = 'Invalid or missing API key',
    metadata: ApiErrorMetadata = {}
  ) {
    super(
      message, 401, metadata.code ?? 'authentication_error', metadata.details, metadata.upgradeUrl
    );
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
  /** Quota information from headers */
  public readonly quota: QuotaInfo | null;
  /** Seconds until the rate limit resets */
  public readonly retryAfter: number | null;

  constructor(
    message: string = 'Rate limit exceeded',
    quota: QuotaInfo | null = null,
    retryAfter: number | null = null,
    metadata: ApiErrorMetadata = {}
  ) {
    super(
      message, 429, metadata.code ?? 'rate_limit_exceeded', metadata.details, metadata.upgradeUrl
    );
    this.name = 'RateLimitError';
    this.quota = quota;
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

  constructor(
    resourceType: string,
    resourceId: string,
    message = `${resourceType} not found: ${resourceId}`,
    metadata: ApiErrorMetadata = {}
  ) {
    super(
      message, 404, metadata.code ?? 'not_found', metadata.details, metadata.upgradeUrl
    );
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
    fieldErrors?: Record<string, string[]>,
    metadata: ApiErrorMetadata = {}
  ) {
    super(
      message, 400, metadata.code ?? 'validation_error',
      metadata.details ?? fieldErrors, metadata.upgradeUrl
    );
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
  constructor(
    message: string = 'Internal server error',
    statusCode: number = 500,
    metadata: ApiErrorMetadata = {}
  ) {
    super(
      message, statusCode, metadata.code ?? 'server_error', metadata.details, metadata.upgradeUrl
    );
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
