import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MailClient, createMail } from './client';
import type { MailProvider } from './provider';
import type { Email, Folder, SendResult, EmailId, FolderName } from './types';
import { FaktoorError, NetworkError, AuthenticationError } from './errors';

// Mock email for testing
const mockEmail: Email = {
  id: 'email-1' as EmailId,
  threadId: 'thread-1' as any,
  folder: 'INBOX' as FolderName,
  from: { email: 'sender@example.com' },
  to: [{ email: 'recipient@example.com' }],
  cc: [],
  bcc: [],
  subject: 'Test Email',
  body: { html: '<p>Hello</p>', text: 'Hello' },
  date: new Date(),
  receivedAt: new Date(),
  isRead: false,
  isStarred: false,
  isDraft: false,
  labels: [],
  attachments: [],
  headers: new Map(),
};

// Mock folder for testing
const mockFolder: Folder = {
  name: 'INBOX' as FolderName,
  path: 'INBOX',
  type: 'inbox',
  unreadCount: 5,
  totalCount: 100,
};

// Mock send result
const mockSendResult: SendResult = {
  id: 'sent-1' as EmailId,
  threadId: 'thread-1' as any,
  timestamp: new Date(),
};

// Create mock provider
function createMockProvider(overrides: Partial<MailProvider> = {}): MailProvider {
  return {
    name: 'mock',
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    isConnected: vi.fn().mockReturnValue(true),
    list: vi.fn().mockResolvedValue([mockEmail]),
    get: vi.fn().mockResolvedValue(mockEmail),
    stream: vi.fn().mockImplementation(async function* () {
      yield mockEmail;
    }),
    send: vi.fn().mockResolvedValue(mockSendResult),
    listFolders: vi.fn().mockResolvedValue([mockFolder]),
    getFolder: vi.fn().mockResolvedValue(mockFolder),
    createFolder: vi.fn().mockResolvedValue(mockFolder),
    deleteFolder: vi.fn().mockResolvedValue(undefined),
    markAsRead: vi.fn().mockResolvedValue(undefined),
    markAsUnread: vi.fn().mockResolvedValue(undefined),
    star: vi.fn().mockResolvedValue(undefined),
    unstar: vi.fn().mockResolvedValue(undefined),
    move: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    addLabel: vi.fn().mockResolvedValue(undefined),
    removeLabel: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('MailClient', () => {
  let mockProvider: MailProvider;
  let client: MailClient;

  beforeEach(() => {
    vi.clearAllMocks();
    mockProvider = createMockProvider();
    client = new MailClient({ provider: mockProvider });
  });

  describe('constructor', () => {
    it('should create client with default retry config', () => {
      const client = new MailClient({ provider: mockProvider });
      expect(client).toBeInstanceOf(MailClient);
    });

    it('should create client with custom retry config', () => {
      const client = new MailClient({
        provider: mockProvider,
        retry: { attempts: 5, initialDelay: 500 },
      });
      expect(client).toBeInstanceOf(MailClient);
    });

    it('should create client with retry disabled', () => {
      const client = new MailClient({
        provider: mockProvider,
        retry: false,
      });
      expect(client).toBeInstanceOf(MailClient);
    });
  });

  describe('providerName', () => {
    it('should return the provider name', () => {
      expect(client.providerName).toBe('mock');
    });
  });

  describe('connect', () => {
    it('should call provider connect', async () => {
      await client.connect();
      expect(mockProvider.connect).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure', async () => {
      let attempts = 0;
      const failingProvider = createMockProvider({
        connect: vi.fn().mockImplementation(() => {
          attempts++;
          if (attempts < 3) {
            return Promise.reject(new NetworkError('connection failed'));
          }
          return Promise.resolve();
        }),
      });
      const client = new MailClient({
        provider: failingProvider,
        retry: { attempts: 3, backoff: 'none', initialDelay: 0, maxDelay: 0 },
      });

      await client.connect();
      expect(failingProvider.connect).toHaveBeenCalledTimes(3);
    });
  });

  describe('disconnect', () => {
    it('should call provider disconnect without retry', async () => {
      await client.disconnect();
      expect(mockProvider.disconnect).toHaveBeenCalledTimes(1);
    });
  });

  describe('isConnected', () => {
    it('should return provider connection status', () => {
      expect(client.isConnected()).toBe(true);
    });

    it('should return false when not connected', () => {
      const provider = createMockProvider({
        isConnected: vi.fn().mockReturnValue(false),
      });
      const client = new MailClient({ provider });
      expect(client.isConnected()).toBe(false);
    });
  });

  describe('list', () => {
    it('should call provider list with options', async () => {
      const options = { folder: 'INBOX', limit: 10 };
      const result = await client.list(options);

      expect(mockProvider.list).toHaveBeenCalledWith(options);
      expect(result).toEqual([mockEmail]);
    });

    it('should call provider list without options', async () => {
      const result = await client.list();

      expect(mockProvider.list).toHaveBeenCalledWith(undefined);
      expect(result).toEqual([mockEmail]);
    });
  });

  describe('get', () => {
    it('should call provider get with id and options', async () => {
      const options = { includeAttachments: true };
      const result = await client.get('email-1', options);

      expect(mockProvider.get).toHaveBeenCalledWith('email-1', options);
      expect(result).toEqual(mockEmail);
    });

    it('should call provider get without options', async () => {
      const result = await client.get('email-1');

      expect(mockProvider.get).toHaveBeenCalledWith('email-1', undefined);
      expect(result).toEqual(mockEmail);
    });
  });

  describe('stream', () => {
    it('should yield emails from provider stream', async () => {
      const emails: Email[] = [];
      for await (const email of client.stream()) {
        emails.push(email);
      }

      expect(emails).toHaveLength(1);
      expect(emails[0]).toEqual(mockEmail);
    });

    it('should pass options to provider stream', async () => {
      const options = { folder: 'INBOX', batchSize: 50 };
      const emails: Email[] = [];
      for await (const email of client.stream(options)) {
        emails.push(email);
      }

      expect(mockProvider.stream).toHaveBeenCalledWith(options);
    });
  });

  describe('send', () => {
    it('should call provider send with options', async () => {
      const options = {
        to: 'test@example.com',
        subject: 'Test',
        text: 'Hello',
      };
      const result = await client.send(options);

      expect(mockProvider.send).toHaveBeenCalledWith(options);
      expect(result).toEqual(mockSendResult);
    });
  });

  describe('folder operations', () => {
    it('should list folders', async () => {
      const result = await client.listFolders();

      expect(mockProvider.listFolders).toHaveBeenCalled();
      expect(result).toEqual([mockFolder]);
    });

    it('should get folder by name', async () => {
      const result = await client.getFolder('INBOX');

      expect(mockProvider.getFolder).toHaveBeenCalledWith('INBOX');
      expect(result).toEqual(mockFolder);
    });

    it('should create folder', async () => {
      const result = await client.createFolder('Custom');

      expect(mockProvider.createFolder).toHaveBeenCalledWith('Custom');
      expect(result).toEqual(mockFolder);
    });

    it('should delete folder', async () => {
      await client.deleteFolder('Custom');

      expect(mockProvider.deleteFolder).toHaveBeenCalledWith('Custom');
    });
  });

  describe('email mutations', () => {
    it('should mark as read', async () => {
      await client.markAsRead('email-1');
      expect(mockProvider.markAsRead).toHaveBeenCalledWith('email-1');
    });

    it('should mark as unread', async () => {
      await client.markAsUnread('email-1');
      expect(mockProvider.markAsUnread).toHaveBeenCalledWith('email-1');
    });

    it('should star email', async () => {
      await client.star('email-1');
      expect(mockProvider.star).toHaveBeenCalledWith('email-1');
    });

    it('should unstar email', async () => {
      await client.unstar('email-1');
      expect(mockProvider.unstar).toHaveBeenCalledWith('email-1');
    });

    it('should move email to folder', async () => {
      await client.move('email-1', 'Archive');
      expect(mockProvider.move).toHaveBeenCalledWith('email-1', 'Archive');
    });

    it('should delete email', async () => {
      await client.delete('email-1');
      expect(mockProvider.delete).toHaveBeenCalledWith('email-1');
    });

    it('should add label', async () => {
      await client.addLabel('email-1', 'important');
      expect(mockProvider.addLabel).toHaveBeenCalledWith('email-1', 'important');
    });

    it('should remove label', async () => {
      await client.removeLabel('email-1', 'important');
      expect(mockProvider.removeLabel).toHaveBeenCalledWith('email-1', 'important');
    });
  });

  describe('watch', () => {
    it('should call provider watch when available', () => {
      const mockHandle = {
        stop: vi.fn(),
        [Symbol.asyncIterator]: vi.fn(),
      };
      const provider = createMockProvider({
        watch: vi.fn().mockReturnValue(mockHandle),
      });
      const client = new MailClient({ provider });

      const result = client.watch({ folder: 'INBOX' });

      expect(provider.watch).toHaveBeenCalledWith({ folder: 'INBOX' });
      expect(result).toBe(mockHandle);
    });

    it('should throw when provider does not support watch', () => {
      const provider = createMockProvider();
      // Remove watch method
      delete (provider as any).watch;
      const client = new MailClient({ provider });

      expect(() => client.watch()).toThrow('Provider mock does not support watch');
    });
  });
});

describe('Retry logic', () => {
  it('should not retry when retry is disabled', async () => {
    const provider = createMockProvider({
      list: vi.fn().mockRejectedValue(new NetworkError('failed')),
    });
    const client = new MailClient({ provider, retry: false });

    await expect(client.list()).rejects.toThrow('failed');
    expect(provider.list).toHaveBeenCalledTimes(1);
  });

  it('should retry on retryable errors', async () => {
    let attempts = 0;
    const provider = createMockProvider({
      list: vi.fn().mockImplementation(() => {
        attempts++;
        if (attempts < 2) {
          return Promise.reject(new NetworkError('network failed'));
        }
        return Promise.resolve([mockEmail]);
      }),
    });
    const client = new MailClient({
      provider,
      retry: { attempts: 3, backoff: 'none', initialDelay: 0, maxDelay: 0 },
    });

    const result = await client.list();

    expect(result).toEqual([mockEmail]);
    expect(provider.list).toHaveBeenCalledTimes(2);
  });

  it('should not retry on non-retryable errors', async () => {
    const provider = createMockProvider({
      list: vi.fn().mockRejectedValue(new AuthenticationError('invalid token')),
    });
    const client = new MailClient({
      provider,
      retry: { attempts: 3, backoff: 'none', initialDelay: 0, maxDelay: 0 },
    });

    await expect(client.list()).rejects.toThrow('invalid token');
    expect(provider.list).toHaveBeenCalledTimes(1);
  });

  it('should throw after max attempts', async () => {
    const provider = createMockProvider({
      list: vi.fn().mockRejectedValue(new NetworkError('always fails')),
    });
    const client = new MailClient({
      provider,
      retry: { attempts: 3, backoff: 'none', initialDelay: 0, maxDelay: 0 },
    });

    await expect(client.list()).rejects.toThrow('always fails');
    expect(provider.list).toHaveBeenCalledTimes(3);
  });

  it('should use exponential backoff', async () => {
    const delays: number[] = [];
    const originalSetTimeout = global.setTimeout;
    vi.spyOn(global, 'setTimeout').mockImplementation((fn: any, delay?: number) => {
      if (delay !== undefined) delays.push(delay);
      return originalSetTimeout(fn, 0);
    });

    let attempts = 0;
    const provider = createMockProvider({
      list: vi.fn().mockImplementation(() => {
        attempts++;
        if (attempts < 3) {
          return Promise.reject(new NetworkError('failed'));
        }
        return Promise.resolve([mockEmail]);
      }),
    });
    const client = new MailClient({
      provider,
      retry: { attempts: 3, backoff: 'exponential', initialDelay: 100, maxDelay: 1000 },
    });

    await client.list();

    // Should have delays for first and second retry
    expect(delays.length).toBe(2);
    // First delay should be around 100ms (initial * 2^0 + jitter)
    expect(delays[0]).toBeGreaterThanOrEqual(100);
    expect(delays[0]).toBeLessThanOrEqual(110);
    // Second delay should be around 200ms (initial * 2^1 + jitter)
    expect(delays[1]).toBeGreaterThanOrEqual(200);
    expect(delays[1]).toBeLessThanOrEqual(220);

    vi.restoreAllMocks();
  });

  it('should use fixed backoff', async () => {
    const delays: number[] = [];
    const originalSetTimeout = global.setTimeout;
    vi.spyOn(global, 'setTimeout').mockImplementation((fn: any, delay?: number) => {
      if (delay !== undefined) delays.push(delay);
      return originalSetTimeout(fn, 0);
    });

    let attempts = 0;
    const provider = createMockProvider({
      list: vi.fn().mockImplementation(() => {
        attempts++;
        if (attempts < 3) {
          return Promise.reject(new NetworkError('failed'));
        }
        return Promise.resolve([mockEmail]);
      }),
    });
    const client = new MailClient({
      provider,
      retry: { attempts: 3, backoff: 'fixed', initialDelay: 100, maxDelay: 1000 },
    });

    await client.list();

    // All delays should be the initial delay
    expect(delays.length).toBe(2);
    expect(delays[0]).toBe(100);
    expect(delays[1]).toBe(100);

    vi.restoreAllMocks();
  });

  it('should cap delay at maxDelay', async () => {
    const delays: number[] = [];
    const originalSetTimeout = global.setTimeout;
    vi.spyOn(global, 'setTimeout').mockImplementation((fn: any, delay?: number) => {
      if (delay !== undefined) delays.push(delay);
      return originalSetTimeout(fn, 0);
    });

    let attempts = 0;
    const provider = createMockProvider({
      list: vi.fn().mockImplementation(() => {
        attempts++;
        if (attempts < 5) {
          return Promise.reject(new NetworkError('failed'));
        }
        return Promise.resolve([mockEmail]);
      }),
    });
    const client = new MailClient({
      provider,
      retry: { attempts: 5, backoff: 'exponential', initialDelay: 100, maxDelay: 300 },
    });

    await client.list();

    // Later delays should be capped at maxDelay (with some jitter)
    delays.forEach((delay) => {
      expect(delay).toBeLessThanOrEqual(330); // maxDelay + 10% jitter
    });

    vi.restoreAllMocks();
  });

  it('should use no delay with backoff none', async () => {
    const delays: number[] = [];
    const originalSetTimeout = global.setTimeout;
    vi.spyOn(global, 'setTimeout').mockImplementation((fn: any, delay?: number) => {
      if (delay !== undefined) delays.push(delay);
      return originalSetTimeout(fn, 0);
    });

    let attempts = 0;
    const provider = createMockProvider({
      list: vi.fn().mockImplementation(() => {
        attempts++;
        if (attempts < 3) {
          return Promise.reject(new NetworkError('failed'));
        }
        return Promise.resolve([mockEmail]);
      }),
    });
    const client = new MailClient({
      provider,
      retry: { attempts: 3, backoff: 'none', initialDelay: 100, maxDelay: 1000 },
    });

    await client.list();

    // All delays should be 0
    expect(delays.length).toBe(2);
    expect(delays[0]).toBe(0);
    expect(delays[1]).toBe(0);

    vi.restoreAllMocks();
  });

  it('should retry regular errors (without retryable property)', async () => {
    let attempts = 0;
    const provider = createMockProvider({
      list: vi.fn().mockImplementation(() => {
        attempts++;
        if (attempts < 2) {
          return Promise.reject(new Error('generic error'));
        }
        return Promise.resolve([mockEmail]);
      }),
    });
    const client = new MailClient({
      provider,
      retry: { attempts: 3, backoff: 'none', initialDelay: 0, maxDelay: 0 },
    });

    const result = await client.list();

    expect(result).toEqual([mockEmail]);
    expect(provider.list).toHaveBeenCalledTimes(2);
  });
});

describe('createMail', () => {
  it('should create a MailClient instance', () => {
    const provider = createMockProvider();
    const client = createMail({ provider });

    expect(client).toBeInstanceOf(MailClient);
    expect(client.providerName).toBe('mock');
  });

  it('should pass config to MailClient', () => {
    const provider = createMockProvider();
    const client = createMail({
      provider,
      retry: { attempts: 5 },
      timeout: 30000,
    });

    expect(client).toBeInstanceOf(MailClient);
  });
});
