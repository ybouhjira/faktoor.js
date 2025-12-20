import type { Email, EmailId, Folder, FolderName, SendResult } from './types';

/**
 * Options for listing emails
 */
export interface ListOptions {
  folder?: FolderName | string;
  limit?: number;
  offset?: number;
  unreadOnly?: boolean;
  from?: string;
  to?: string;
  subject?: string;
  after?: Date;
  before?: Date;
  hasAttachment?: boolean;
  labels?: string[];
  query?: string;
}

/**
 * Options for getting a single email
 */
export interface GetOptions {
  includeAttachments?: boolean;
  includeRaw?: boolean;
  format?: 'full' | 'metadata' | 'minimal';
}

/**
 * Options for streaming emails
 */
export interface StreamOptions extends ListOptions {
  batchSize?: number;
}

/**
 * Attachment input for sending
 */
export interface AttachmentInput {
  filename: string;
  content?: ArrayBuffer | Uint8Array | string;
  path?: string;
  mimeType?: string;
  contentId?: string;
}

/**
 * Options for sending an email
 */
export interface SendOptions {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
  subject: string;
  text?: string;
  html?: string;
  attachments?: AttachmentInput[];
  inReplyTo?: EmailId | string;
  references?: (EmailId | string)[];
  headers?: Record<string, string>;
}

/**
 * Options for watching/syncing emails
 */
export interface WatchOptions {
  folder?: FolderName | string;
  interval?: number;
  includeExisting?: boolean;
}

/**
 * Watch event types
 */
export type WatchEvent =
  | { type: 'new'; email: Email }
  | { type: 'updated'; email: Email }
  | { type: 'deleted'; id: EmailId }
  | { type: 'error'; error: Error };

/**
 * Watch handle for stopping
 */
export interface WatchHandle {
  stop(): void;
  [Symbol.asyncIterator](): AsyncIterableIterator<WatchEvent>;
}

/**
 * Mail provider interface
 * All providers must implement this interface
 */
export interface MailProvider {
  readonly name: string;

  // Connection
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;

  // Reading
  list(options?: ListOptions): Promise<Email[]>;
  get(id: EmailId | string, options?: GetOptions): Promise<Email>;
  stream(options?: StreamOptions): AsyncIterable<Email>;

  // Sending
  send(options: SendOptions): Promise<SendResult>;

  // Folders
  listFolders(): Promise<Folder[]>;
  getFolder(name: FolderName | string): Promise<Folder>;
  createFolder(name: string): Promise<Folder>;
  deleteFolder(name: FolderName | string): Promise<void>;

  // Mutations
  markAsRead(id: EmailId | string): Promise<void>;
  markAsUnread(id: EmailId | string): Promise<void>;
  star(id: EmailId | string): Promise<void>;
  unstar(id: EmailId | string): Promise<void>;
  move(id: EmailId | string, folder: FolderName | string): Promise<void>;
  delete(id: EmailId | string): Promise<void>;
  addLabel(id: EmailId | string, label: string): Promise<void>;
  removeLabel(id: EmailId | string, label: string): Promise<void>;

  // Sync (optional)
  watch?(options?: WatchOptions): WatchHandle;
}
