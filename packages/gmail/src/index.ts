// Provider
export { gmail, GmailProvider } from './provider';

// Types
export type {
  GmailEmail,
  GmailLabel,
  GmailOAuthOptions,
  GmailOptions,
  GmailServiceAccountOptions,
} from './types';

// Re-export core types for convenience
export type {
  Email,
  EmailId,
  Folder,
  FolderName,
  ListOptions,
  SendOptions,
  GetOptions,
  MailProvider,
} from '@faktoor/core';
