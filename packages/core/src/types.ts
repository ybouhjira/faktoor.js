/**
 * Branded type for Email IDs
 */
export type EmailId = string & { readonly __brand: 'EmailId' };

/**
 * Branded type for Thread IDs
 */
export type ThreadId = string & { readonly __brand: 'ThreadId' };

/**
 * Branded type for Folder names
 */
export type FolderName = string & { readonly __brand: 'FolderName' };

/**
 * Email address with optional display name
 */
export interface Address {
  email: string;
  name?: string;
}

/**
 * Email label/tag
 */
export interface Label {
  id: string;
  name: string;
  color?: string;
}

/**
 * Attachment metadata (without content)
 */
export interface AttachmentMeta {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
}

/**
 * Full attachment with download capability
 */
export interface Attachment extends AttachmentMeta {
  download(): Promise<ArrayBuffer>;
  stream(): ReadableStream<Uint8Array>;
}

/**
 * Email body content
 */
export interface EmailBody {
  html: string | null;
  text: string;
}

/**
 * Core Email interface
 */
export interface Email {
  id: EmailId;
  threadId: ThreadId;
  folder: FolderName;
  from: Address;
  to: Address[];
  cc: Address[];
  bcc: Address[];
  replyTo?: Address;
  subject: string;
  body: EmailBody;
  date: Date;
  receivedAt: Date;
  isRead: boolean;
  isStarred: boolean;
  isDraft: boolean;
  labels: Label[];
  attachments: AttachmentMeta[];
  headers: Map<string, string>;
  inReplyTo?: EmailId;
  references?: EmailId[];
  raw?: string;
}

/**
 * Folder/Mailbox info
 */
export interface Folder {
  name: FolderName;
  path: string;
  type: 'inbox' | 'sent' | 'drafts' | 'trash' | 'spam' | 'archive' | 'custom';
  unreadCount: number;
  totalCount: number;
  children?: Folder[];
}

/**
 * Send result
 */
export interface SendResult {
  id: EmailId;
  threadId?: ThreadId;
  timestamp: Date;
}
