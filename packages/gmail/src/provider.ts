import type {
  Email,
  EmailId,
  Folder,
  FolderName,
  GetOptions,
  ListOptions,
  MailProvider,
  SendOptions,
  SendResult,
  StreamOptions,
  WatchHandle,
  WatchOptions,
} from '@faktoor/core';
import { NotFoundError } from '@faktoor/core';
import { GmailApi } from './api';
import { labelToFolder, parseGmailMessage } from './parser';
import type { GmailEmail, GmailOptions } from './types';

/**
 * Map folder name to Gmail label ID
 */
function folderToLabelId(folder: string): string {
  const mapping: Record<string, string> = {
    inbox: 'INBOX',
    sent: 'SENT',
    drafts: 'DRAFT',
    trash: 'TRASH',
    spam: 'SPAM',
    starred: 'STARRED',
    important: 'IMPORTANT',
    all: 'ALL',
  };
  return mapping[folder.toLowerCase()] ?? folder;
}

/**
 * Build Gmail search query from options
 */
function buildQuery(options: ListOptions): string {
  const parts: string[] = [];

  if (options.from) parts.push(`from:${options.from}`);
  if (options.to) parts.push(`to:${options.to}`);
  if (options.subject) parts.push(`subject:${options.subject}`);
  if (options.after) parts.push(`after:${Math.floor(options.after.getTime() / 1000)}`);
  if (options.before) parts.push(`before:${Math.floor(options.before.getTime() / 1000)}`);
  if (options.hasAttachment) parts.push('has:attachment');
  if (options.unreadOnly) parts.push('is:unread');
  if (options.query) parts.push(options.query);

  return parts.join(' ');
}

/**
 * Encode email to RFC 2822 format
 */
function encodeEmail(options: SendOptions): string {
  const lines: string[] = [];

  // To
  const to = Array.isArray(options.to) ? options.to.join(', ') : options.to;
  lines.push(`To: ${to}`);

  // Cc
  if (options.cc) {
    const cc = Array.isArray(options.cc) ? options.cc.join(', ') : options.cc;
    lines.push(`Cc: ${cc}`);
  }

  // Bcc
  if (options.bcc) {
    const bcc = Array.isArray(options.bcc) ? options.bcc.join(', ') : options.bcc;
    lines.push(`Bcc: ${bcc}`);
  }

  // Reply-To
  if (options.replyTo) {
    lines.push(`Reply-To: ${options.replyTo}`);
  }

  // Subject
  lines.push(`Subject: ${options.subject}`);

  // In-Reply-To
  if (options.inReplyTo) {
    lines.push(`In-Reply-To: <${options.inReplyTo}>`);
  }

  // References
  if (options.references?.length) {
    lines.push(`References: ${options.references.map((r) => `<${r}>`).join(' ')}`);
  }

  // Custom headers
  if (options.headers) {
    for (const [name, value] of Object.entries(options.headers)) {
      lines.push(`${name}: ${value}`);
    }
  }

  // MIME type
  const hasHtml = !!options.html;
  const hasText = !!options.text;
  const hasAttachments = !!options.attachments?.length;

  if (hasAttachments || (hasHtml && hasText)) {
    // Multipart message
    const boundary = `----faktoor-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    lines.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
    lines.push('MIME-Version: 1.0');
    lines.push('');

    // Text part
    if (hasText) {
      lines.push(`--${boundary}`);
      lines.push('Content-Type: text/plain; charset=utf-8');
      lines.push('');
      lines.push(options.text!);
    }

    // HTML part
    if (hasHtml) {
      lines.push(`--${boundary}`);
      lines.push('Content-Type: text/html; charset=utf-8');
      lines.push('');
      lines.push(options.html!);
    }

    // Note: Attachments would need additional handling
    // This is a simplified implementation

    lines.push(`--${boundary}--`);
  } else if (hasHtml) {
    lines.push('Content-Type: text/html; charset=utf-8');
    lines.push('MIME-Version: 1.0');
    lines.push('');
    lines.push(options.html!);
  } else {
    lines.push('Content-Type: text/plain; charset=utf-8');
    lines.push('MIME-Version: 1.0');
    lines.push('');
    lines.push(options.text ?? '');
  }

  const message = lines.join('\r\n');

  // Base64url encode
  if (typeof btoa !== 'undefined') {
    return btoa(unescape(encodeURIComponent(message)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }
  return Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Gmail provider implementation
 */
export class GmailProvider implements MailProvider {
  readonly name = 'gmail';
  private api: GmailApi;
  private connected = false;

  constructor(options: GmailOptions) {
    this.api = new GmailApi(options);
  }

  async connect(): Promise<void> {
    await this.api.init();
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  async list(options: ListOptions = {}): Promise<GmailEmail[]> {
    const labelIds = options.folder ? [folderToLabelId(options.folder)] : undefined;
    const query = buildQuery(options);

    const response = await this.api.messages.list({
      labelIds,
      q: query || undefined,
      maxResults: options.limit ?? 50,
      includeSpamTrash: false,
    });

    if (!response.messages?.length) {
      return [];
    }

    // Fetch full message details
    const emails = await Promise.all(
      response.messages.map(async (msg) => {
        const full = await this.api.messages.get(msg.id, 'full');
        return parseGmailMessage(full);
      }),
    );

    return emails;
  }

  async get(id: EmailId | string, options: GetOptions = {}): Promise<Email> {
    const format = options.format ?? 'full';
    const message = await this.api.messages.get(id, format);

    if (!message) {
      throw new NotFoundError('Email', id);
    }

    return parseGmailMessage(message);
  }

  async *stream(options: StreamOptions = {}): AsyncIterable<Email> {
    const batchSize = options.batchSize ?? 50;
    const labelIds = options.folder ? [folderToLabelId(options.folder)] : undefined;
    const query = buildQuery(options);

    let pageToken: string | undefined;

    do {
      const response = await this.api.messages.list({
        labelIds,
        q: query || undefined,
        maxResults: batchSize,
        pageToken,
        includeSpamTrash: false,
      });

      if (!response.messages?.length) {
        break;
      }

      for (const msg of response.messages) {
        const full = await this.api.messages.get(msg.id, 'full');
        yield parseGmailMessage(full);
      }

      pageToken = response.nextPageToken;
    } while (pageToken);
  }

  async send(options: SendOptions): Promise<SendResult> {
    const raw = encodeEmail(options);
    const result = await this.api.messages.send(raw);

    return {
      id: result.id as EmailId,
      threadId: result.threadId as unknown as import('@faktoor/core').ThreadId,
      timestamp: new Date(),
    };
  }

  async listFolders(): Promise<Folder[]> {
    const response = await this.api.labels.list();
    if (!response.labels?.length) {
      return [];
    }

    return response.labels.map(labelToFolder);
  }

  async getFolder(name: FolderName | string): Promise<Folder> {
    const labelId = folderToLabelId(name);
    const label = await this.api.labels.get(labelId);

    if (!label) {
      throw new NotFoundError('Folder', name);
    }

    return labelToFolder(label);
  }

  async createFolder(name: string): Promise<Folder> {
    const label = await this.api.labels.create(name);
    return labelToFolder(label);
  }

  async deleteFolder(name: FolderName | string): Promise<void> {
    const labelId = folderToLabelId(name);
    await this.api.labels.delete(labelId);
  }

  async markAsRead(id: EmailId | string): Promise<void> {
    await this.api.messages.modify(id, { removeLabelIds: ['UNREAD'] });
  }

  async markAsUnread(id: EmailId | string): Promise<void> {
    await this.api.messages.modify(id, { addLabelIds: ['UNREAD'] });
  }

  async star(id: EmailId | string): Promise<void> {
    await this.api.messages.modify(id, { addLabelIds: ['STARRED'] });
  }

  async unstar(id: EmailId | string): Promise<void> {
    await this.api.messages.modify(id, { removeLabelIds: ['STARRED'] });
  }

  async move(id: EmailId | string, folder: FolderName | string): Promise<void> {
    const labelId = folderToLabelId(folder);
    // Remove from all folders and add to new one
    await this.api.messages.modify(id, {
      addLabelIds: [labelId],
      removeLabelIds: ['INBOX', 'SPAM', 'TRASH'],
    });
  }

  async delete(id: EmailId | string): Promise<void> {
    await this.api.messages.trash(id);
  }

  async addLabel(id: EmailId | string, label: string): Promise<void> {
    await this.api.messages.modify(id, { addLabelIds: [label] });
  }

  async removeLabel(id: EmailId | string, label: string): Promise<void> {
    await this.api.messages.modify(id, { removeLabelIds: [label] });
  }

  watch(_options?: WatchOptions): WatchHandle {
    // Gmail watch uses push notifications via Pub/Sub
    // This is a simplified polling implementation
    throw new Error('Watch not yet implemented. Use polling with list() instead.');
  }
}

/**
 * Create Gmail provider
 */
export function gmail(options: GmailOptions): GmailProvider {
  return new GmailProvider(options);
}
