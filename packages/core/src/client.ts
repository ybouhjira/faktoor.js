import type { MailProvider } from './provider';
import type { Email, EmailId, Folder, FolderName, SendResult } from './types';
import type {
  GetOptions,
  ListOptions,
  SendOptions,
  StreamOptions,
  WatchHandle,
  WatchOptions,
} from './provider';

/**
 * Retry configuration
 */
export interface RetryConfig {
  attempts: number;
  backoff: 'exponential' | 'fixed' | 'none';
  initialDelay: number;
  maxDelay: number;
}

/**
 * Mail client configuration
 */
export interface MailConfig {
  provider: MailProvider;
  retry?: Partial<RetryConfig> | false;
  timeout?: number;
}

const DEFAULT_RETRY: RetryConfig = {
  attempts: 3,
  backoff: 'exponential',
  initialDelay: 1000,
  maxDelay: 30000,
};

/**
 * Sleep helper
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate delay for retry
 */
function getDelay(attempt: number, config: RetryConfig): number {
  if (config.backoff === 'none') return 0;
  if (config.backoff === 'fixed') return config.initialDelay;

  // Exponential backoff with jitter
  const delay = Math.min(config.initialDelay * 2 ** attempt, config.maxDelay);
  const jitter = delay * 0.1 * Math.random();
  return delay + jitter;
}

/**
 * Wrap function with retry logic
 */
async function withRetry<T>(fn: () => Promise<T>, config: RetryConfig | false): Promise<T> {
  if (config === false) return fn();

  let lastError: Error | undefined;

  for (let attempt = 0; attempt < config.attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Don't retry on non-retryable errors
      if (error instanceof Error && 'retryable' in error && !error.retryable) {
        throw error;
      }

      if (attempt < config.attempts - 1) {
        await sleep(getDelay(attempt, config));
      }
    }
  }

  throw lastError;
}

/**
 * Mail client - wrapper around provider with retry logic
 */
export class MailClient {
  private readonly provider: MailProvider;
  private readonly retryConfig: RetryConfig | false;

  constructor(config: MailConfig) {
    this.provider = config.provider;
    this.retryConfig =
      config.retry === false ? false : { ...DEFAULT_RETRY, ...(config.retry ?? {}) };
  }

  get providerName(): string {
    return this.provider.name;
  }

  // Connection
  async connect(): Promise<void> {
    return withRetry(() => this.provider.connect(), this.retryConfig);
  }

  async disconnect(): Promise<void> {
    return this.provider.disconnect();
  }

  isConnected(): boolean {
    return this.provider.isConnected();
  }

  // Reading
  async list(options?: ListOptions): Promise<Email[]> {
    return withRetry(() => this.provider.list(options), this.retryConfig);
  }

  async get(id: EmailId | string, options?: GetOptions): Promise<Email> {
    return withRetry(() => this.provider.get(id, options), this.retryConfig);
  }

  async *stream(options?: StreamOptions): AsyncIterable<Email> {
    yield* this.provider.stream(options);
  }

  // Sending
  async send(options: SendOptions): Promise<SendResult> {
    return withRetry(() => this.provider.send(options), this.retryConfig);
  }

  // Folders
  async listFolders(): Promise<Folder[]> {
    return withRetry(() => this.provider.listFolders(), this.retryConfig);
  }

  async getFolder(name: FolderName | string): Promise<Folder> {
    return withRetry(() => this.provider.getFolder(name), this.retryConfig);
  }

  async createFolder(name: string): Promise<Folder> {
    return withRetry(() => this.provider.createFolder(name), this.retryConfig);
  }

  async deleteFolder(name: FolderName | string): Promise<void> {
    return withRetry(() => this.provider.deleteFolder(name), this.retryConfig);
  }

  // Mutations
  async markAsRead(id: EmailId | string): Promise<void> {
    return withRetry(() => this.provider.markAsRead(id), this.retryConfig);
  }

  async markAsUnread(id: EmailId | string): Promise<void> {
    return withRetry(() => this.provider.markAsUnread(id), this.retryConfig);
  }

  async star(id: EmailId | string): Promise<void> {
    return withRetry(() => this.provider.star(id), this.retryConfig);
  }

  async unstar(id: EmailId | string): Promise<void> {
    return withRetry(() => this.provider.unstar(id), this.retryConfig);
  }

  async move(id: EmailId | string, folder: FolderName | string): Promise<void> {
    return withRetry(() => this.provider.move(id, folder), this.retryConfig);
  }

  async delete(id: EmailId | string): Promise<void> {
    return withRetry(() => this.provider.delete(id), this.retryConfig);
  }

  async addLabel(id: EmailId | string, label: string): Promise<void> {
    return withRetry(() => this.provider.addLabel(id, label), this.retryConfig);
  }

  async removeLabel(id: EmailId | string, label: string): Promise<void> {
    return withRetry(() => this.provider.removeLabel(id, label), this.retryConfig);
  }

  // Watch
  watch(options?: WatchOptions): WatchHandle {
    if (!this.provider.watch) {
      throw new Error(`Provider ${this.provider.name} does not support watch`);
    }
    return this.provider.watch(options);
  }
}

/**
 * Create a mail client
 */
export function createMail(config: MailConfig): MailClient {
  return new MailClient(config);
}
