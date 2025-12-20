import { describe, expect, it } from 'vitest';
import {
  decodeBase64Url,
  extractAttachments,
  extractBody,
  getHeader,
  parseAddress,
  parseAddresses,
  parseGmailMessage,
} from './parser';
import type { GmailMessagePart } from './types';

describe('parseAddress', () => {
  it('parses email with name in angle brackets', () => {
    const result = parseAddress('John Doe <john@example.com>');
    expect(result).toEqual({ email: 'john@example.com', name: 'John Doe' });
  });

  it('parses email with quoted name', () => {
    const result = parseAddress('"Jane Smith" <jane@example.com>');
    expect(result).toEqual({ email: 'jane@example.com', name: 'Jane Smith' });
  });

  it('handles email with no name in brackets', () => {
    const result = parseAddress('<noreply@example.com>');
    expect(result.email).toBe('noreply@example.com');
    expect(result.name).toBeUndefined();
  });
});

describe('parseAddresses', () => {
  it('parses multiple comma-separated addresses', () => {
    const result = parseAddresses('John <john@example.com>, Jane <jane@example.com>');
    expect(result).toHaveLength(2);
    expect(result[0].email).toBe('john@example.com');
    expect(result[1].email).toBe('jane@example.com');
  });

  it('parses addresses with names', () => {
    const result = parseAddresses('"John Doe" <john@example.com>, Jane <jane@example.com>');
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ email: 'john@example.com', name: 'John Doe' });
    expect(result[1]).toEqual({ email: 'jane@example.com', name: 'Jane' });
  });

  it('returns empty array for undefined input', () => {
    expect(parseAddresses(undefined)).toEqual([]);
  });

  it('returns empty array for empty string', () => {
    expect(parseAddresses('')).toEqual([]);
  });

  it('handles commas inside quoted names', () => {
    const result = parseAddresses('"Doe, John" <john@example.com>, Jane <jane@example.com>');
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('Doe, John');
  });
});

describe('getHeader', () => {
  const mockPayload: GmailMessagePart = {
    headers: [
      { name: 'From', value: 'sender@example.com' },
      { name: 'To', value: 'recipient@example.com' },
      { name: 'Subject', value: 'Test Subject' },
      { name: 'Content-Type', value: 'text/plain' },
    ],
    mimeType: 'text/plain',
  };

  it('finds header case-insensitively', () => {
    expect(getHeader(mockPayload, 'from')).toBe('sender@example.com');
    expect(getHeader(mockPayload, 'FROM')).toBe('sender@example.com');
    expect(getHeader(mockPayload, 'From')).toBe('sender@example.com');
  });

  it('returns undefined for missing header', () => {
    expect(getHeader(mockPayload, 'X-Custom')).toBeUndefined();
  });

  it('returns undefined for undefined payload', () => {
    expect(getHeader(undefined, 'From')).toBeUndefined();
  });

  it('returns undefined for payload without headers', () => {
    expect(getHeader({ mimeType: 'text/plain' }, 'From')).toBeUndefined();
  });
});

describe('decodeBase64Url', () => {
  it('decodes base64url encoded string', () => {
    // "Hello World" in base64url
    const encoded = 'SGVsbG8gV29ybGQ';
    expect(decodeBase64Url(encoded)).toBe('Hello World');
  });

  it('handles URL-safe characters', () => {
    // String with + and / replaced by - and _
    const encoded = 'YWJjLWRlZl9naGk';
    const result = decodeBase64Url(encoded);
    expect(result).toBeTruthy();
  });

  it('handles padding correctly', () => {
    // Various padding scenarios
    const encoded1 = 'YQ'; // "a"
    const encoded2 = 'YWI'; // "ab"
    const encoded3 = 'YWJj'; // "abc"
    expect(decodeBase64Url(encoded1)).toBe('a');
    expect(decodeBase64Url(encoded2)).toBe('ab');
    expect(decodeBase64Url(encoded3)).toBe('abc');
  });
});

describe('extractBody', () => {
  it('extracts text body from simple message', () => {
    const payload: GmailMessagePart = {
      mimeType: 'text/plain',
      body: { data: 'SGVsbG8gV29ybGQ' }, // "Hello World"
    };
    const result = extractBody(payload);
    expect(result.text).toBe('Hello World');
    expect(result.html).toBeNull();
  });

  it('extracts HTML body', () => {
    const payload: GmailMessagePart = {
      mimeType: 'text/html',
      body: { data: 'PGI-SGVsbG88L2I-' }, // "<b>Hello</b>"
    };
    const result = extractBody(payload);
    expect(result.html).toBeTruthy();
  });

  it('extracts both text and HTML from multipart', () => {
    const payload: GmailMessagePart = {
      mimeType: 'multipart/alternative',
      parts: [
        { mimeType: 'text/plain', body: { data: 'SGVsbG8' } },
        { mimeType: 'text/html', body: { data: 'PGI-SGVsbG88L2I-' } },
      ],
    };
    const result = extractBody(payload);
    expect(result.text).toBe('Hello');
    expect(result.html).toBeTruthy();
  });

  it('handles nested multipart messages', () => {
    const payload: GmailMessagePart = {
      mimeType: 'multipart/mixed',
      parts: [
        {
          mimeType: 'multipart/alternative',
          parts: [
            { mimeType: 'text/plain', body: { data: 'VGVzdA' } }, // "Test"
          ],
        },
      ],
    };
    const result = extractBody(payload);
    expect(result.text).toBe('Test');
  });

  it('returns empty body for undefined payload', () => {
    const result = extractBody(undefined);
    expect(result).toEqual({ html: null, text: '' });
  });
});

describe('extractAttachments', () => {
  it('extracts attachment metadata', () => {
    const payload: GmailMessagePart = {
      mimeType: 'multipart/mixed',
      parts: [
        { mimeType: 'text/plain', body: { data: 'VGVzdA' } },
        {
          mimeType: 'application/pdf',
          filename: 'document.pdf',
          body: { attachmentId: 'att-123', size: 1024 },
        },
      ],
    };
    const result = extractAttachments(payload, 'msg-1');
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: 'att-123',
      filename: 'document.pdf',
      mimeType: 'application/pdf',
      size: 1024,
    });
  });

  it('extracts multiple attachments', () => {
    const payload: GmailMessagePart = {
      mimeType: 'multipart/mixed',
      parts: [
        {
          mimeType: 'image/png',
          filename: 'image.png',
          body: { attachmentId: 'att-1', size: 500 },
        },
        {
          mimeType: 'application/pdf',
          filename: 'doc.pdf',
          body: { attachmentId: 'att-2', size: 2000 },
        },
      ],
    };
    const result = extractAttachments(payload, 'msg-1');
    expect(result).toHaveLength(2);
  });

  it('handles nested parts with attachments', () => {
    const payload: GmailMessagePart = {
      mimeType: 'multipart/mixed',
      parts: [
        {
          mimeType: 'multipart/alternative',
          parts: [{ mimeType: 'text/plain', body: { data: 'VGVzdA' } }],
        },
        {
          mimeType: 'application/zip',
          filename: 'archive.zip',
          body: { attachmentId: 'att-nested', size: 3000 },
        },
      ],
    };
    const result = extractAttachments(payload, 'msg-1');
    expect(result).toHaveLength(1);
    expect(result[0].filename).toBe('archive.zip');
  });

  it('returns empty array for undefined payload', () => {
    expect(extractAttachments(undefined, 'msg-1')).toEqual([]);
  });

  it('uses default mime type for missing mimeType', () => {
    const payload: GmailMessagePart = {
      mimeType: 'multipart/mixed',
      parts: [
        {
          filename: 'file.bin',
          body: { attachmentId: 'att-1', size: 100 },
        },
      ],
    };
    const result = extractAttachments(payload, 'msg-1');
    expect(result[0].mimeType).toBe('application/octet-stream');
  });
});

describe('parseGmailMessage', () => {
  const createMockMessage = (overrides: Record<string, unknown> = {}) => ({
    id: 'msg-123',
    threadId: 'thread-456',
    labelIds: ['INBOX', 'UNREAD'],
    snippet: 'This is a test...',
    internalDate: '1703001600000',
    sizeEstimate: 1500,
    payload: {
      headers: [
        { name: 'From', value: 'Sender <sender@example.com>' },
        { name: 'To', value: 'Recipient <recipient@example.com>' },
        { name: 'Subject', value: 'Test Email' },
        { name: 'Date', value: 'Wed, 20 Dec 2023 00:00:00 +0000' },
      ],
      mimeType: 'text/plain',
      body: { data: 'SGVsbG8gV29ybGQ' },
    },
    ...overrides,
  });

  it('parses basic email message', () => {
    const message = createMockMessage();
    const result = parseGmailMessage(message);

    expect(result.id).toBe('msg-123');
    expect(result.threadId).toBe('thread-456');
    expect(result.from.email).toBe('sender@example.com');
    expect(result.to).toHaveLength(1);
    expect(result.to[0].email).toBe('recipient@example.com');
    expect(result.subject).toBe('Test Email');
  });

  it('determines read status from labels', () => {
    const unreadMessage = createMockMessage({ labelIds: ['INBOX', 'UNREAD'] });
    const readMessage = createMockMessage({ labelIds: ['INBOX'] });

    expect(parseGmailMessage(unreadMessage).isRead).toBe(false);
    expect(parseGmailMessage(readMessage).isRead).toBe(true);
  });

  it('determines starred status from labels', () => {
    const starredMessage = createMockMessage({ labelIds: ['INBOX', 'STARRED'] });
    const normalMessage = createMockMessage({ labelIds: ['INBOX'] });

    expect(parseGmailMessage(starredMessage).isStarred).toBe(true);
    expect(parseGmailMessage(normalMessage).isStarred).toBe(false);
  });

  it('determines draft status from labels', () => {
    const draftMessage = createMockMessage({ labelIds: ['DRAFT'] });
    expect(parseGmailMessage(draftMessage).isDraft).toBe(true);
  });

  it('extracts folder from labels', () => {
    const inboxMessage = createMockMessage({ labelIds: ['INBOX'] });
    const sentMessage = createMockMessage({ labelIds: ['SENT'] });
    const trashMessage = createMockMessage({ labelIds: ['TRASH'] });

    expect(parseGmailMessage(inboxMessage).folder).toBe('INBOX');
    expect(parseGmailMessage(sentMessage).folder).toBe('SENT');
    expect(parseGmailMessage(trashMessage).folder).toBe('TRASH');
  });

  it('parses CC and BCC recipients', () => {
    const message = createMockMessage({
      payload: {
        headers: [
          { name: 'From', value: 'Sender <sender@example.com>' },
          { name: 'To', value: 'To <to@example.com>' },
          { name: 'Cc', value: 'CC1 <cc1@example.com>, CC2 <cc2@example.com>' },
          { name: 'Bcc', value: 'BCC <bcc@example.com>' },
          { name: 'Subject', value: 'Test' },
        ],
        mimeType: 'text/plain',
        body: { data: 'VGVzdA' },
      },
    });

    const result = parseGmailMessage(message);
    expect(result.cc).toHaveLength(2);
    expect(result.bcc).toHaveLength(1);
  });

  it('parses Reply-To header', () => {
    const message = createMockMessage({
      payload: {
        headers: [
          { name: 'From', value: 'Sender <sender@example.com>' },
          { name: 'To', value: 'To <to@example.com>' },
          { name: 'Reply-To', value: 'Reply <reply@example.com>' },
          { name: 'Subject', value: 'Test' },
        ],
        mimeType: 'text/plain',
        body: { data: 'VGVzdA' },
      },
    });

    const result = parseGmailMessage(message);
    expect(result.replyTo?.email).toBe('reply@example.com');
  });

  it('extracts gmail labels', () => {
    const message = createMockMessage({ labelIds: ['INBOX', 'Label_123', 'STARRED'] });
    const result = parseGmailMessage(message);

    expect(result.gmailLabels).toHaveLength(3);
    expect(result.gmailLabels.find((l) => l.id === 'Label_123')?.type).toBe('user');
    expect(result.gmailLabels.find((l) => l.id === 'INBOX')?.type).toBe('system');
  });

  it('handles missing payload gracefully', () => {
    const message = {
      id: 'msg-123',
      threadId: 'thread-456',
    };
    const result = parseGmailMessage(message);

    expect(result.id).toBe('msg-123');
    expect(result.subject).toBe('');
  });

  it('includes snippet and size estimate', () => {
    const message = createMockMessage({
      snippet: 'Preview text...',
      sizeEstimate: 5000,
    });
    const result = parseGmailMessage(message);

    expect(result.snippet).toBe('Preview text...');
    expect(result.sizeEstimate).toBe(5000);
  });

  it('preserves raw message when present', () => {
    const message = createMockMessage({ raw: 'base64-raw-content' });
    const result = parseGmailMessage(message);

    expect(result.raw).toBe('base64-raw-content');
  });
});
