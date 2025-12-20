import type {
  Address,
  AttachmentMeta,
  Email,
  EmailBody,
  EmailId,
  Folder,
  FolderName,
  ThreadId,
} from '@faktoor/core';
import type { GmailEmail, GmailLabel, GmailMessagePart } from './types';

/**
 * Parse email address string into Address object
 */
export function parseAddress(raw: string): Address {
  // Format: "Name <email@example.com>" or "email@example.com"
  const match = raw.match(/^(?:"?([^"<]*)"?\s*)?<?([^>]+)>?$/);
  if (!match) {
    return { email: raw.trim() };
  }

  const [, name, email] = match;
  return {
    email: email?.trim() ?? raw.trim(),
    name: name?.trim() || undefined,
  };
}

/**
 * Parse multiple addresses from a comma-separated string
 */
export function parseAddresses(raw: string | undefined): Address[] {
  if (!raw) return [];
  // Split by comma but not inside quotes
  const parts = raw.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/);
  return parts.map((part) => parseAddress(part.trim())).filter((addr) => addr.email);
}

/**
 * Get header value from Gmail message
 */
export function getHeader(
  payload: GmailMessagePart | undefined,
  name: string,
): string | undefined {
  return payload?.headers?.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value;
}

/**
 * Decode base64url encoded data
 */
export function decodeBase64Url(data: string): string {
  // Replace URL-safe characters with standard base64
  const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
  // Handle padding
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);

  if (typeof atob !== 'undefined') {
    // Browser
    return atob(padded);
  }
  // Node.js
  return Buffer.from(padded, 'base64').toString('utf-8');
}

/**
 * Extract body from Gmail message parts
 */
export function extractBody(payload: GmailMessagePart | undefined): EmailBody {
  let html: string | null = null;
  let text = '';

  function processpart(part: GmailMessagePart): void {
    if (part.mimeType === 'text/html' && part.body?.data) {
      html = decodeBase64Url(part.body.data);
    } else if (part.mimeType === 'text/plain' && part.body?.data) {
      text = decodeBase64Url(part.body.data);
    } else if (part.parts) {
      for (const subpart of part.parts) {
        processpart(subpart);
      }
    }
  }

  if (payload) {
    processpart(payload);
  }

  return { html, text };
}

/**
 * Extract attachments metadata from Gmail message
 */
export function extractAttachments(
  payload: GmailMessagePart | undefined,
  messageId: string,
): AttachmentMeta[] {
  const attachments: AttachmentMeta[] = [];

  function processPart(part: GmailMessagePart): void {
    if (part.body?.attachmentId && part.filename) {
      attachments.push({
        id: part.body.attachmentId,
        filename: part.filename,
        mimeType: part.mimeType ?? 'application/octet-stream',
        size: part.body.size ?? 0,
      });
    }
    if (part.parts) {
      for (const subpart of part.parts) {
        processPart(subpart);
      }
    }
  }

  if (payload) {
    processPart(payload);
  }

  return attachments;
}

/**
 * Map Gmail label ID to folder type
 */
export function labelToFolderType(
  labelId: string,
): 'inbox' | 'sent' | 'drafts' | 'trash' | 'spam' | 'archive' | 'custom' {
  switch (labelId) {
    case 'INBOX':
      return 'inbox';
    case 'SENT':
      return 'sent';
    case 'DRAFT':
      return 'drafts';
    case 'TRASH':
      return 'trash';
    case 'SPAM':
      return 'spam';
    default:
      return 'custom';
  }
}

/**
 * Map Gmail labels to folder
 */
export function labelToFolder(label: {
  id: string;
  name: string;
  type: string;
  messagesTotal?: number;
  messagesUnread?: number;
}): Folder {
  return {
    name: label.name as FolderName,
    path: label.id,
    type: labelToFolderType(label.id),
    totalCount: label.messagesTotal ?? 0,
    unreadCount: label.messagesUnread ?? 0,
  };
}

/**
 * Parse Gmail API message to Email
 */
export function parseGmailMessage(message: {
  id: string;
  threadId: string;
  labelIds?: string[];
  snippet?: string;
  internalDate?: string;
  sizeEstimate?: number;
  payload?: GmailMessagePart;
  raw?: string;
}): GmailEmail {
  const { payload } = message;
  const headers = new Map<string, string>();

  // Parse headers
  if (payload?.headers) {
    for (const { name, value } of payload.headers) {
      headers.set(name.toLowerCase(), value);
    }
  }

  const from = parseAddress(getHeader(payload, 'From') ?? '');
  const to = parseAddresses(getHeader(payload, 'To'));
  const cc = parseAddresses(getHeader(payload, 'Cc'));
  const bcc = parseAddresses(getHeader(payload, 'Bcc'));
  const replyTo = getHeader(payload, 'Reply-To');
  const subject = getHeader(payload, 'Subject') ?? '';
  const date = new Date(getHeader(payload, 'Date') ?? message.internalDate ?? Date.now());
  const receivedAt = new Date(Number(message.internalDate ?? Date.now()));

  const labelIds = message.labelIds ?? [];

  // Determine folder from labels
  const folderLabel =
    labelIds.find((l) => ['INBOX', 'SENT', 'DRAFT', 'TRASH', 'SPAM'].includes(l)) ?? 'INBOX';

  const body = extractBody(payload);
  const attachments = extractAttachments(payload, message.id);

  // Parse labels
  const gmailLabels: GmailLabel[] = labelIds.map((id) => ({
    id,
    name: id,
    type: id.startsWith('Label_') ? 'user' : ('system' as 'system' | 'user'),
  }));

  return {
    id: message.id as EmailId,
    threadId: message.threadId as ThreadId,
    folder: folderLabel as FolderName,
    from,
    to,
    cc,
    bcc,
    replyTo: replyTo ? parseAddress(replyTo) : undefined,
    subject,
    body,
    date,
    receivedAt,
    isRead: !labelIds.includes('UNREAD'),
    isStarred: labelIds.includes('STARRED'),
    isDraft: labelIds.includes('DRAFT'),
    labels: gmailLabels,
    attachments,
    headers,
    raw: message.raw,
    snippet: message.snippet ?? '',
    sizeEstimate: message.sizeEstimate ?? 0,
    gmailLabels,
  };
}
