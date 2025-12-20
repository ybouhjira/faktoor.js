// Types
export type {
  Address,
  Attachment,
  AttachmentMeta,
  Email,
  EmailBody,
  EmailId,
  Folder,
  FolderName,
  Label,
  SendResult,
  ThreadId,
} from './types';

// Provider
export type {
  AttachmentInput,
  GetOptions,
  ListOptions,
  MailProvider,
  SendOptions,
  StreamOptions,
  WatchEvent,
  WatchHandle,
  WatchOptions,
} from './provider';

// Client
export { createMail, MailClient } from './client';
export type { MailConfig, RetryConfig } from './client';

// Errors
export {
  AuthenticationError,
  FaktoorError,
  NetworkError,
  NotFoundError,
  ProviderError,
  RateLimitError,
  ValidationError,
} from './errors';
