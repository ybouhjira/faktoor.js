import { describe, it, expect } from 'vitest';
import {
  FaktoorError,
  AuthenticationError,
  RateLimitError,
  NotFoundError,
  NetworkError,
  ValidationError,
  ProviderError,
} from './errors';

describe('FaktoorError', () => {
  it('should create error with message and code', () => {
    const error = new FaktoorError('test message', { code: 'TEST_CODE' });

    expect(error.message).toBe('test message');
    expect(error.code).toBe('TEST_CODE');
    expect(error.name).toBe('FaktoorError');
    expect(error.retryable).toBe(false);
    expect(error.cause).toBeUndefined();
  });

  it('should set retryable to true when specified', () => {
    const error = new FaktoorError('test', { code: 'TEST', retryable: true });

    expect(error.retryable).toBe(true);
  });

  it('should include cause when provided', () => {
    const cause = new Error('original error');
    const error = new FaktoorError('wrapped', { code: 'WRAP', cause });

    expect(error.cause).toBe(cause);
  });

  it('should extend Error', () => {
    const error = new FaktoorError('test', { code: 'TEST' });

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(FaktoorError);
  });

  it('should have a stack trace', () => {
    const error = new FaktoorError('test', { code: 'TEST' });

    expect(error.stack).toBeDefined();
  });
});

describe('AuthenticationError', () => {
  it('should create with message only', () => {
    const error = new AuthenticationError('invalid credentials');

    expect(error.message).toBe('invalid credentials');
    expect(error.code).toBe('AUTH_ERROR');
    expect(error.name).toBe('AuthenticationError');
    expect(error.retryable).toBe(false);
    expect(error.cause).toBeUndefined();
  });

  it('should include cause when provided', () => {
    const cause = new Error('token expired');
    const error = new AuthenticationError('auth failed', cause);

    expect(error.cause).toBe(cause);
  });

  it('should extend FaktoorError', () => {
    const error = new AuthenticationError('test');

    expect(error).toBeInstanceOf(FaktoorError);
    expect(error).toBeInstanceOf(Error);
  });
});

describe('RateLimitError', () => {
  it('should create with message only', () => {
    const error = new RateLimitError('too many requests');

    expect(error.message).toBe('too many requests');
    expect(error.code).toBe('RATE_LIMIT');
    expect(error.name).toBe('RateLimitError');
    expect(error.retryable).toBe(true);
    expect(error.retryAfter).toBeUndefined();
    expect(error.cause).toBeUndefined();
  });

  it('should include retryAfter when provided', () => {
    const error = new RateLimitError('rate limited', 60);

    expect(error.retryAfter).toBe(60);
  });

  it('should include cause when provided', () => {
    const cause = new Error('429 error');
    const error = new RateLimitError('rate limited', 30, cause);

    expect(error.retryAfter).toBe(30);
    expect(error.cause).toBe(cause);
  });

  it('should be retryable by default', () => {
    const error = new RateLimitError('test');

    expect(error.retryable).toBe(true);
  });

  it('should extend FaktoorError', () => {
    const error = new RateLimitError('test');

    expect(error).toBeInstanceOf(FaktoorError);
  });
});

describe('NotFoundError', () => {
  it('should create with resource type and id', () => {
    const error = new NotFoundError('Email', 'abc123');

    expect(error.message).toBe('Email not found: abc123');
    expect(error.code).toBe('NOT_FOUND');
    expect(error.name).toBe('NotFoundError');
    expect(error.retryable).toBe(false);
    expect(error.resourceType).toBe('Email');
    expect(error.resourceId).toBe('abc123');
  });

  it('should work with different resource types', () => {
    const error = new NotFoundError('Folder', 'inbox');

    expect(error.message).toBe('Folder not found: inbox');
    expect(error.resourceType).toBe('Folder');
    expect(error.resourceId).toBe('inbox');
  });

  it('should extend FaktoorError', () => {
    const error = new NotFoundError('Email', 'id');

    expect(error).toBeInstanceOf(FaktoorError);
  });
});

describe('NetworkError', () => {
  it('should create with message only', () => {
    const error = new NetworkError('connection failed');

    expect(error.message).toBe('connection failed');
    expect(error.code).toBe('NETWORK_ERROR');
    expect(error.name).toBe('NetworkError');
    expect(error.retryable).toBe(true);
    expect(error.cause).toBeUndefined();
  });

  it('should include cause when provided', () => {
    const cause = new Error('ECONNREFUSED');
    const error = new NetworkError('connection refused', cause);

    expect(error.cause).toBe(cause);
  });

  it('should be retryable by default', () => {
    const error = new NetworkError('test');

    expect(error.retryable).toBe(true);
  });

  it('should extend FaktoorError', () => {
    const error = new NetworkError('test');

    expect(error).toBeInstanceOf(FaktoorError);
  });
});

describe('ValidationError', () => {
  it('should create with message only', () => {
    const error = new ValidationError('invalid email format');

    expect(error.message).toBe('invalid email format');
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.name).toBe('ValidationError');
    expect(error.retryable).toBe(false);
    expect(error.field).toBeUndefined();
  });

  it('should include field when provided', () => {
    const error = new ValidationError('email is required', 'to');

    expect(error.field).toBe('to');
  });

  it('should not be retryable', () => {
    const error = new ValidationError('test');

    expect(error.retryable).toBe(false);
  });

  it('should extend FaktoorError', () => {
    const error = new ValidationError('test');

    expect(error).toBeInstanceOf(FaktoorError);
  });
});

describe('ProviderError', () => {
  it('should create with provider and message', () => {
    const error = new ProviderError('gmail', 'API quota exceeded');

    expect(error.message).toBe('API quota exceeded');
    expect(error.code).toBe('PROVIDER_ERROR');
    expect(error.name).toBe('ProviderError');
    expect(error.provider).toBe('gmail');
    expect(error.retryable).toBe(false);
    expect(error.cause).toBeUndefined();
  });

  it('should include options when provided', () => {
    const cause = new Error('original');
    const error = new ProviderError('outlook', 'sync failed', {
      retryable: true,
      cause,
    });

    expect(error.retryable).toBe(true);
    expect(error.cause).toBe(cause);
    expect(error.provider).toBe('outlook');
  });

  it('should default retryable to false', () => {
    const error = new ProviderError('imap', 'error');

    expect(error.retryable).toBe(false);
  });

  it('should allow retryable without cause', () => {
    const error = new ProviderError('gmail', 'temp error', { retryable: true });

    expect(error.retryable).toBe(true);
    expect(error.cause).toBeUndefined();
  });

  it('should extend FaktoorError', () => {
    const error = new ProviderError('test', 'error');

    expect(error).toBeInstanceOf(FaktoorError);
  });
});

describe('Error hierarchy', () => {
  it('all errors should be instanceof Error', () => {
    const errors = [
      new FaktoorError('test', { code: 'TEST' }),
      new AuthenticationError('test'),
      new RateLimitError('test'),
      new NotFoundError('Email', 'id'),
      new NetworkError('test'),
      new ValidationError('test'),
      new ProviderError('provider', 'test'),
    ];

    errors.forEach((error) => {
      expect(error).toBeInstanceOf(Error);
    });
  });

  it('all specialized errors should be instanceof FaktoorError', () => {
    const errors = [
      new AuthenticationError('test'),
      new RateLimitError('test'),
      new NotFoundError('Email', 'id'),
      new NetworkError('test'),
      new ValidationError('test'),
      new ProviderError('provider', 'test'),
    ];

    errors.forEach((error) => {
      expect(error).toBeInstanceOf(FaktoorError);
    });
  });
});
