// V8 stack trace capture (Node.js specific)
declare const Error: ErrorConstructor & {
  captureStackTrace?(targetObject: object, constructorOpt?: Function): void;
};

/**
 * Base error class for faktoor
 */
export class FaktoorError extends Error {
  readonly code: string;
  readonly retryable: boolean;
  readonly cause?: Error;

  constructor(message: string, options: { code: string; retryable?: boolean; cause?: Error }) {
    super(message);
    this.name = 'FaktoorError';
    this.code = options.code;
    this.retryable = options.retryable ?? false;
    this.cause = options.cause;

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, FaktoorError);
    }
  }
}

/**
 * Authentication error
 */
export class AuthenticationError extends FaktoorError {
  constructor(message: string, cause?: Error) {
    super(message, { code: 'AUTH_ERROR', retryable: false, cause });
    this.name = 'AuthenticationError';
  }
}

/**
 * Rate limit error
 */
export class RateLimitError extends FaktoorError {
  readonly retryAfter?: number;

  constructor(message: string, retryAfter?: number, cause?: Error) {
    super(message, { code: 'RATE_LIMIT', retryable: true, cause });
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

/**
 * Not found error
 */
export class NotFoundError extends FaktoorError {
  readonly resourceType: string;
  readonly resourceId: string;

  constructor(resourceType: string, resourceId: string) {
    super(`${resourceType} not found: ${resourceId}`, {
      code: 'NOT_FOUND',
      retryable: false,
    });
    this.name = 'NotFoundError';
    this.resourceType = resourceType;
    this.resourceId = resourceId;
  }
}

/**
 * Network error
 */
export class NetworkError extends FaktoorError {
  constructor(message: string, cause?: Error) {
    super(message, { code: 'NETWORK_ERROR', retryable: true, cause });
    this.name = 'NetworkError';
  }
}

/**
 * Validation error
 */
export class ValidationError extends FaktoorError {
  readonly field?: string;

  constructor(message: string, field?: string) {
    super(message, { code: 'VALIDATION_ERROR', retryable: false });
    this.name = 'ValidationError';
    this.field = field;
  }
}

/**
 * Provider error
 */
export class ProviderError extends FaktoorError {
  readonly provider: string;

  constructor(provider: string, message: string, options?: { retryable?: boolean; cause?: Error }) {
    super(message, {
      code: 'PROVIDER_ERROR',
      retryable: options?.retryable ?? false,
      cause: options?.cause,
    });
    this.name = 'ProviderError';
    this.provider = provider;
  }
}
