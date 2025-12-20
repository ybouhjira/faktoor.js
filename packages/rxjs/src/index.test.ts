import { describe, it, expect, vi } from 'vitest';
import { firstValueFrom, toArray, take } from 'rxjs';
import { fromMailClient } from './index';
import type { MailClient, Email, SendResult } from '@faktoor/core';

// Mock email factory
function createMockEmail(id: string, subject: string): Email {
  return {
    id: { value: id, provider: 'mock' },
    threadId: { value: `thread-${id}`, provider: 'mock' },
    subject,
    from: { email: 'sender@example.com', name: 'Sender' },
    to: [{ email: 'recipient@example.com', name: 'Recipient' }],
    date: new Date(),
    folder: { name: 'inbox', type: 'inbox' },
    isRead: false,
    isStarred: false,
    labels: [],
  };
}

// Mock MailClient factory
function createMockClient(overrides: Partial<MailClient> = {}): MailClient {
  return {
    providerName: 'mock',
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    isConnected: vi.fn().mockReturnValue(true),
    list: vi.fn().mockResolvedValue([]),
    get: vi.fn().mockResolvedValue(createMockEmail('1', 'Test')),
    stream: vi.fn().mockImplementation(async function* () {}),
    send: vi.fn().mockResolvedValue({ id: { value: 'sent-1', provider: 'mock' } }),
    listFolders: vi.fn().mockResolvedValue([]),
    getFolder: vi.fn().mockResolvedValue({ name: 'inbox', type: 'inbox' }),
    createFolder: vi.fn().mockResolvedValue({ name: 'new', type: 'custom' }),
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
  } as unknown as MailClient;
}

describe('fromMailClient', () => {
  describe('list$', () => {
    it('should return an observable that emits email array', async () => {
      const mockEmails = [
        createMockEmail('1', 'Email 1'),
        createMockEmail('2', 'Email 2'),
      ];
      const client = createMockClient({
        list: vi.fn().mockResolvedValue(mockEmails),
      });

      const rx = fromMailClient(client);
      const result = await firstValueFrom(rx.list$());

      expect(result).toEqual(mockEmails);
      expect(client.list).toHaveBeenCalledTimes(1);
    });

    it('should pass options to the client', async () => {
      const client = createMockClient();
      const rx = fromMailClient(client);
      const options = { folder: 'inbox', limit: 10 };

      await firstValueFrom(rx.list$(options));

      expect(client.list).toHaveBeenCalledWith(options);
    });

    it('should be lazy (defer execution until subscribed)', async () => {
      const client = createMockClient();
      const rx = fromMailClient(client);

      // Create observable but don't subscribe
      const observable = rx.list$();
      expect(client.list).not.toHaveBeenCalled();

      // Now subscribe
      await firstValueFrom(observable);
      expect(client.list).toHaveBeenCalledTimes(1);
    });
  });

  describe('get$', () => {
    it('should return an observable that emits a single email', async () => {
      const mockEmail = createMockEmail('123', 'Test Email');
      const client = createMockClient({
        get: vi.fn().mockResolvedValue(mockEmail),
      });

      const rx = fromMailClient(client);
      const result = await firstValueFrom(rx.get$('123'));

      expect(result).toEqual(mockEmail);
      expect(client.get).toHaveBeenCalledWith('123');
    });

    it('should propagate errors', async () => {
      const client = createMockClient({
        get: vi.fn().mockRejectedValue(new Error('Not found')),
      });

      const rx = fromMailClient(client);

      await expect(firstValueFrom(rx.get$('invalid'))).rejects.toThrow('Not found');
    });
  });

  describe('send$', () => {
    it('should return an observable that emits send result', async () => {
      const mockResult: SendResult = {
        id: { value: 'sent-123', provider: 'mock' },
      };
      const client = createMockClient({
        send: vi.fn().mockResolvedValue(mockResult),
      });

      const rx = fromMailClient(client);
      const options = {
        to: [{ email: 'test@example.com' }],
        subject: 'Test',
        body: { text: 'Hello' },
      };

      const result = await firstValueFrom(rx.send$(options));

      expect(result).toEqual(mockResult);
      expect(client.send).toHaveBeenCalledWith(options);
    });
  });

  describe('stream$', () => {
    it('should emit emails one by one from async iterator', async () => {
      const mockEmails = [
        createMockEmail('1', 'Email 1'),
        createMockEmail('2', 'Email 2'),
        createMockEmail('3', 'Email 3'),
      ];

      const client = createMockClient({
        stream: vi.fn().mockImplementation(async function* () {
          for (const email of mockEmails) {
            yield email;
          }
        }),
      });

      const rx = fromMailClient(client);
      const results = await firstValueFrom(rx.stream$().pipe(toArray()));

      expect(results).toEqual(mockEmails);
    });

    it('should support taking limited items', async () => {
      const mockEmails = [
        createMockEmail('1', 'Email 1'),
        createMockEmail('2', 'Email 2'),
        createMockEmail('3', 'Email 3'),
      ];

      const client = createMockClient({
        stream: vi.fn().mockImplementation(async function* () {
          for (const email of mockEmails) {
            yield email;
          }
        }),
      });

      const rx = fromMailClient(client);
      const results = await firstValueFrom(rx.stream$().pipe(take(2), toArray()));

      expect(results).toHaveLength(2);
      expect(results[0].subject).toBe('Email 1');
      expect(results[1].subject).toBe('Email 2');
    });

    it('should propagate errors from stream', async () => {
      const client = createMockClient({
        stream: vi.fn().mockImplementation(async function* () {
          yield createMockEmail('1', 'Email 1');
          throw new Error('Stream error');
        }),
      });

      const rx = fromMailClient(client);

      await expect(
        firstValueFrom(rx.stream$().pipe(toArray()))
      ).rejects.toThrow('Stream error');
    });
  });
});

describe('re-exports', () => {
  it('should export RxJS utilities', async () => {
    const { retry, timer, from, defer, Observable, mergeMap, switchMap, catchError, take, filter, map } = await import('./index');

    expect(retry).toBeDefined();
    expect(timer).toBeDefined();
    expect(from).toBeDefined();
    expect(defer).toBeDefined();
    expect(Observable).toBeDefined();
    expect(mergeMap).toBeDefined();
    expect(switchMap).toBeDefined();
    expect(catchError).toBeDefined();
    expect(take).toBeDefined();
    expect(filter).toBeDefined();
    expect(map).toBeDefined();
  });
});
