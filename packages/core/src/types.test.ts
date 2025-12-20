import { describe, it, expect } from 'vitest';
import type {
  EmailId,
  ThreadId,
  FolderName,
  Address,
  Label,
  AttachmentMeta,
  Attachment,
  EmailBody,
  Email,
  Folder,
  SendResult,
} from './types';

/**
 * These tests verify that the type definitions work correctly at runtime.
 * Since TypeScript types are erased at compile time, we test the shape
 * of objects that conform to these types.
 */

describe('Type definitions', () => {
  describe('Branded types', () => {
    it('EmailId should accept string values', () => {
      const emailId = 'email-123' as EmailId;
      expect(typeof emailId).toBe('string');
      expect(emailId).toBe('email-123');
    });

    it('ThreadId should accept string values', () => {
      const threadId = 'thread-456' as ThreadId;
      expect(typeof threadId).toBe('string');
      expect(threadId).toBe('thread-456');
    });

    it('FolderName should accept string values', () => {
      const folderName = 'INBOX' as FolderName;
      expect(typeof folderName).toBe('string');
      expect(folderName).toBe('INBOX');
    });
  });

  describe('Address interface', () => {
    it('should accept email only', () => {
      const address: Address = {
        email: 'test@example.com',
      };
      expect(address.email).toBe('test@example.com');
      expect(address.name).toBeUndefined();
    });

    it('should accept email with name', () => {
      const address: Address = {
        email: 'test@example.com',
        name: 'Test User',
      };
      expect(address.email).toBe('test@example.com');
      expect(address.name).toBe('Test User');
    });
  });

  describe('Label interface', () => {
    it('should accept required fields', () => {
      const label: Label = {
        id: 'label-1',
        name: 'Important',
      };
      expect(label.id).toBe('label-1');
      expect(label.name).toBe('Important');
      expect(label.color).toBeUndefined();
    });

    it('should accept optional color', () => {
      const label: Label = {
        id: 'label-1',
        name: 'Important',
        color: '#ff0000',
      };
      expect(label.color).toBe('#ff0000');
    });
  });

  describe('AttachmentMeta interface', () => {
    it('should have all required fields', () => {
      const meta: AttachmentMeta = {
        id: 'attach-1',
        filename: 'document.pdf',
        mimeType: 'application/pdf',
        size: 1024,
      };
      expect(meta.id).toBe('attach-1');
      expect(meta.filename).toBe('document.pdf');
      expect(meta.mimeType).toBe('application/pdf');
      expect(meta.size).toBe(1024);
    });
  });

  describe('Attachment interface', () => {
    it('should extend AttachmentMeta with methods', () => {
      const attachment: Attachment = {
        id: 'attach-1',
        filename: 'document.pdf',
        mimeType: 'application/pdf',
        size: 1024,
        download: async () => new ArrayBuffer(0),
        stream: () => new ReadableStream(),
      };
      expect(attachment.id).toBe('attach-1');
      expect(typeof attachment.download).toBe('function');
      expect(typeof attachment.stream).toBe('function');
    });
  });

  describe('EmailBody interface', () => {
    it('should accept html and text', () => {
      const body: EmailBody = {
        html: '<p>Hello</p>',
        text: 'Hello',
      };
      expect(body.html).toBe('<p>Hello</p>');
      expect(body.text).toBe('Hello');
    });

    it('should accept null html', () => {
      const body: EmailBody = {
        html: null,
        text: 'Plain text only',
      };
      expect(body.html).toBeNull();
      expect(body.text).toBe('Plain text only');
    });
  });

  describe('Email interface', () => {
    it('should have all required fields', () => {
      const email: Email = {
        id: 'email-1' as EmailId,
        threadId: 'thread-1' as ThreadId,
        folder: 'INBOX' as FolderName,
        from: { email: 'sender@example.com' },
        to: [{ email: 'recipient@example.com' }],
        cc: [],
        bcc: [],
        subject: 'Test Subject',
        body: { html: '<p>Hello</p>', text: 'Hello' },
        date: new Date('2024-01-01'),
        receivedAt: new Date('2024-01-01'),
        isRead: false,
        isStarred: false,
        isDraft: false,
        labels: [],
        attachments: [],
        headers: new Map(),
      };

      expect(email.id).toBe('email-1');
      expect(email.threadId).toBe('thread-1');
      expect(email.folder).toBe('INBOX');
      expect(email.from.email).toBe('sender@example.com');
      expect(email.to).toHaveLength(1);
      expect(email.subject).toBe('Test Subject');
      expect(email.isRead).toBe(false);
    });

    it('should accept optional fields', () => {
      const email: Email = {
        id: 'email-1' as EmailId,
        threadId: 'thread-1' as ThreadId,
        folder: 'INBOX' as FolderName,
        from: { email: 'sender@example.com' },
        to: [{ email: 'recipient@example.com' }],
        cc: [],
        bcc: [],
        replyTo: { email: 'reply@example.com' },
        subject: 'Test',
        body: { html: null, text: 'Hello' },
        date: new Date(),
        receivedAt: new Date(),
        isRead: false,
        isStarred: false,
        isDraft: false,
        labels: [],
        attachments: [],
        headers: new Map(),
        inReplyTo: 'email-0' as EmailId,
        references: ['email-0' as EmailId],
        raw: 'raw email content',
      };

      expect(email.replyTo?.email).toBe('reply@example.com');
      expect(email.inReplyTo).toBe('email-0');
      expect(email.references).toHaveLength(1);
      expect(email.raw).toBe('raw email content');
    });

    it('should support headers Map', () => {
      const headers = new Map<string, string>();
      headers.set('X-Custom-Header', 'custom-value');
      headers.set('Message-ID', '<abc@example.com>');

      const email: Email = {
        id: 'email-1' as EmailId,
        threadId: 'thread-1' as ThreadId,
        folder: 'INBOX' as FolderName,
        from: { email: 'sender@example.com' },
        to: [],
        cc: [],
        bcc: [],
        subject: 'Test',
        body: { html: null, text: '' },
        date: new Date(),
        receivedAt: new Date(),
        isRead: true,
        isStarred: false,
        isDraft: false,
        labels: [],
        attachments: [],
        headers,
      };

      expect(email.headers.get('X-Custom-Header')).toBe('custom-value');
      expect(email.headers.size).toBe(2);
    });
  });

  describe('Folder interface', () => {
    it('should have all required fields', () => {
      const folder: Folder = {
        name: 'INBOX' as FolderName,
        path: 'INBOX',
        type: 'inbox',
        unreadCount: 5,
        totalCount: 100,
      };

      expect(folder.name).toBe('INBOX');
      expect(folder.path).toBe('INBOX');
      expect(folder.type).toBe('inbox');
      expect(folder.unreadCount).toBe(5);
      expect(folder.totalCount).toBe(100);
    });

    it('should accept all folder types', () => {
      const types: Folder['type'][] = [
        'inbox',
        'sent',
        'drafts',
        'trash',
        'spam',
        'archive',
        'custom',
      ];

      types.forEach((type) => {
        const folder: Folder = {
          name: 'Test' as FolderName,
          path: 'Test',
          type,
          unreadCount: 0,
          totalCount: 0,
        };
        expect(folder.type).toBe(type);
      });
    });

    it('should accept children folders', () => {
      const folder: Folder = {
        name: 'Work' as FolderName,
        path: 'Work',
        type: 'custom',
        unreadCount: 10,
        totalCount: 50,
        children: [
          {
            name: 'Projects' as FolderName,
            path: 'Work/Projects',
            type: 'custom',
            unreadCount: 3,
            totalCount: 20,
          },
          {
            name: 'Clients' as FolderName,
            path: 'Work/Clients',
            type: 'custom',
            unreadCount: 7,
            totalCount: 30,
          },
        ],
      };

      expect(folder.children).toHaveLength(2);
      expect(folder.children?.[0].name).toBe('Projects');
      expect(folder.children?.[1].path).toBe('Work/Clients');
    });
  });

  describe('SendResult interface', () => {
    it('should have required fields', () => {
      const result: SendResult = {
        id: 'sent-1' as EmailId,
        timestamp: new Date('2024-01-01T12:00:00Z'),
      };

      expect(result.id).toBe('sent-1');
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.threadId).toBeUndefined();
    });

    it('should accept optional threadId', () => {
      const result: SendResult = {
        id: 'sent-1' as EmailId,
        threadId: 'thread-1' as ThreadId,
        timestamp: new Date(),
      };

      expect(result.threadId).toBe('thread-1');
    });
  });
});
