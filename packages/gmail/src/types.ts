import type { Email, Label } from '@faktoor/core';

/**
 * Gmail-specific email extensions
 */
export interface GmailEmail extends Email {
  gmailLabels: GmailLabel[];
  snippet: string;
  sizeEstimate: number;
}

/**
 * Gmail label
 */
export interface GmailLabel extends Label {
  type: 'system' | 'user';
  messageListVisibility?: 'show' | 'hide';
  labelListVisibility?: 'labelShow' | 'labelShowIfUnread' | 'labelHide';
  messagesTotal?: number;
  messagesUnread?: number;
}

/**
 * Gmail authentication options - OAuth tokens
 */
export interface GmailOAuthOptions {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  onTokenRefresh?: (tokens: { accessToken: string; expiresAt?: Date }) => void | Promise<void>;
}

/**
 * Gmail authentication options - Service Account
 */
export interface GmailServiceAccountOptions {
  serviceAccount: {
    client_email: string;
    private_key: string;
    project_id?: string;
  };
  delegateEmail: string;
}

/**
 * Gmail provider options
 */
export type GmailOptions = GmailOAuthOptions | GmailServiceAccountOptions;

/**
 * Gmail API message format
 */
export interface GmailMessage {
  id: string;
  threadId: string;
  labelIds?: string[];
  snippet?: string;
  historyId?: string;
  internalDate?: string;
  sizeEstimate?: number;
  payload?: GmailMessagePart;
  raw?: string;
}

/**
 * Gmail API message part
 */
export interface GmailMessagePart {
  partId?: string;
  mimeType?: string;
  filename?: string;
  headers?: Array<{ name: string; value: string }>;
  body?: {
    attachmentId?: string;
    size?: number;
    data?: string;
  };
  parts?: GmailMessagePart[];
}

/**
 * Check if options are OAuth
 */
export function isOAuthOptions(options: GmailOptions): options is GmailOAuthOptions {
  return 'accessToken' in options;
}

/**
 * Check if options are Service Account
 */
export function isServiceAccountOptions(
  options: GmailOptions,
): options is GmailServiceAccountOptions {
  return 'serviceAccount' in options;
}
