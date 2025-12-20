import { AuthenticationError, NetworkError, RateLimitError, ProviderError } from '@faktoor/core';
import type { GmailOptions, GmailOAuthOptions, GmailServiceAccountOptions, GmailMessagePart } from './types';
import { isOAuthOptions, isServiceAccountOptions } from './types';

const GMAIL_API_BASE = 'https://gmail.googleapis.com/gmail/v1';

/**
 * Gmail API client
 */
export class GmailApi {
  private accessToken: string;
  private refreshToken?: string;
  private expiresAt?: Date;
  private onTokenRefresh?: GmailOAuthOptions['onTokenRefresh'];
  private userId = 'me';

  constructor(private readonly options: GmailOptions) {
    if (isOAuthOptions(options)) {
      this.accessToken = options.accessToken;
      this.refreshToken = options.refreshToken;
      this.expiresAt = options.expiresAt;
      this.onTokenRefresh = options.onTokenRefresh;
    } else if (isServiceAccountOptions(options)) {
      // Service account tokens will be fetched on connect
      this.accessToken = '';
    } else {
      throw new Error('Invalid Gmail options');
    }
  }

  /**
   * Initialize the API client
   */
  async init(): Promise<void> {
    if (isServiceAccountOptions(this.options)) {
      await this.fetchServiceAccountToken();
    }
  }

  /**
   * Fetch token for service account
   */
  private async fetchServiceAccountToken(): Promise<void> {
    const options = this.options as GmailServiceAccountOptions;
    const now = Math.floor(Date.now() / 1000);
    const exp = now + 3600;

    // Create JWT header and claims
    const header = { alg: 'RS256', typ: 'JWT' };
    const claims = {
      iss: options.serviceAccount.client_email,
      sub: options.delegateEmail,
      scope: 'https://mail.google.com/',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp,
    };

    // Note: In a real implementation, we'd sign this JWT with the private key
    // For now, we'll throw an error indicating this needs the crypto implementation
    throw new ProviderError(
      'gmail',
      'Service account authentication requires additional crypto setup. Use OAuth tokens for now.',
    );
  }

  /**
   * Make authenticated request to Gmail API
   */
  async request<T>(
    method: string,
    path: string,
    options?: {
      body?: unknown;
      params?: Record<string, string | number | boolean | undefined>;
    },
  ): Promise<T> {
    // Check if token is expired
    if (this.expiresAt && this.expiresAt < new Date()) {
      if (this.refreshToken) {
        // Token refresh would happen here
        throw new AuthenticationError('Token expired. Refresh token flow not yet implemented.');
      }
      throw new AuthenticationError('Token expired');
    }

    const url = new URL(`${GMAIL_API_BASE}${path}`);
    if (options?.params) {
      for (const [key, value] of Object.entries(options.params)) {
        if (value !== undefined) {
          url.searchParams.set(key, String(value));
        }
      }
    }

    try {
      const response = await fetch(url.toString(), {
        method,
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: options?.body ? JSON.stringify(options.body) : undefined,
      });

      if (!response.ok) {
        await this.handleError(response);
      }

      // Handle empty responses
      if (response.status === 204) {
        return undefined as T;
      }

      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof FaktoorApiError) {
        throw error;
      }
      throw new NetworkError('Failed to connect to Gmail API', error as Error);
    }
  }

  /**
   * Handle API errors
   */
  private async handleError(response: Response): Promise<never> {
    let errorData: { error?: { message?: string; code?: number } } = {};
    try {
      errorData = await response.json();
    } catch {
      // Ignore JSON parse errors
    }

    const message = errorData.error?.message || response.statusText;

    switch (response.status) {
      case 401:
        throw new AuthenticationError(message);
      case 429:
        const retryAfter = response.headers.get('Retry-After');
        throw new RateLimitError(
          message,
          retryAfter ? Number.parseInt(retryAfter, 10) * 1000 : undefined,
        );
      case 403:
        throw new AuthenticationError(`Access denied: ${message}`);
      case 404:
        throw new ProviderError('gmail', `Not found: ${message}`);
      default:
        throw new ProviderError('gmail', message, { retryable: response.status >= 500 });
    }
  }

  // Messages API
  messages = {
    list: (params: {
      labelIds?: string[];
      q?: string;
      maxResults?: number;
      pageToken?: string;
      includeSpamTrash?: boolean;
    }) =>
      this.request<{
        messages?: Array<{ id: string; threadId: string }>;
        nextPageToken?: string;
        resultSizeEstimate?: number;
      }>('GET', `/users/${this.userId}/messages`, {
        params: {
          ...params,
          labelIds: params.labelIds?.join(','),
        },
      }),

    get: (id: string, format: 'full' | 'metadata' | 'minimal' | 'raw' = 'full') =>
      this.request<{
        id: string;
        threadId: string;
        labelIds?: string[];
        snippet?: string;
        historyId?: string;
        internalDate?: string;
        sizeEstimate?: number;
        payload?: GmailMessagePart;
        raw?: string;
      }>('GET', `/users/${this.userId}/messages/${id}`, { params: { format } }),

    send: (raw: string) =>
      this.request<{ id: string; threadId: string; labelIds?: string[] }>(
        'POST',
        `/users/${this.userId}/messages/send`,
        { body: { raw } },
      ),

    trash: (id: string) =>
      this.request<{ id: string; threadId: string }>(
        'POST',
        `/users/${this.userId}/messages/${id}/trash`,
      ),

    untrash: (id: string) =>
      this.request<{ id: string; threadId: string }>(
        'POST',
        `/users/${this.userId}/messages/${id}/untrash`,
      ),

    modify: (
      id: string,
      modifications: { addLabelIds?: string[]; removeLabelIds?: string[] },
    ) =>
      this.request<{ id: string; threadId: string; labelIds?: string[] }>(
        'POST',
        `/users/${this.userId}/messages/${id}/modify`,
        { body: modifications },
      ),

    delete: (id: string) =>
      this.request<void>('DELETE', `/users/${this.userId}/messages/${id}`),
  };

  // Labels API
  labels = {
    list: () =>
      this.request<{
        labels?: Array<{
          id: string;
          name: string;
          type: string;
          messageListVisibility?: string;
          labelListVisibility?: string;
          messagesTotal?: number;
          messagesUnread?: number;
          color?: { textColor?: string; backgroundColor?: string };
        }>;
      }>('GET', `/users/${this.userId}/labels`),

    get: (id: string) =>
      this.request<{
        id: string;
        name: string;
        type: string;
        messageListVisibility?: string;
        labelListVisibility?: string;
        messagesTotal?: number;
        messagesUnread?: number;
        color?: { textColor?: string; backgroundColor?: string };
      }>('GET', `/users/${this.userId}/labels/${id}`),

    create: (name: string) =>
      this.request<{ id: string; name: string; type: string }>(
        'POST',
        `/users/${this.userId}/labels`,
        { body: { name } },
      ),

    delete: (id: string) =>
      this.request<void>('DELETE', `/users/${this.userId}/labels/${id}`),
  };

  // Attachments API
  attachments = {
    get: (messageId: string, attachmentId: string) =>
      this.request<{ size: number; data: string }>(
        'GET',
        `/users/${this.userId}/messages/${messageId}/attachments/${attachmentId}`,
      ),
  };
}

// Helper class for API errors
class FaktoorApiError extends Error {}
