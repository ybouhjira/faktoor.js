import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GmailApi } from './api';
import type { GmailServiceAccountOptions, GmailOAuthOptions } from './types';

// Mock jose module
vi.mock('jose', () => ({
  importPKCS8: vi.fn().mockResolvedValue('mock-private-key'),
  SignJWT: vi.fn().mockImplementation(() => ({
    setProtectedHeader: vi.fn().mockReturnThis(),
    setIssuedAt: vi.fn().mockReturnThis(),
    setExpirationTime: vi.fn().mockReturnThis(),
    setIssuer: vi.fn().mockReturnThis(),
    setSubject: vi.fn().mockReturnThis(),
    setAudience: vi.fn().mockReturnThis(),
    sign: vi.fn().mockResolvedValue('mock-jwt-token'),
  })),
}));

// Sample RSA private key for testing (not a real key)
const TEST_PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7Uq0W8q6WXNHS
dummykeyfordevelopmentpurposesonly1234567890abcdefghijklmnop
-----END PRIVATE KEY-----`;

const mockServiceAccountOptions: GmailServiceAccountOptions = {
  serviceAccount: {
    type: 'service_account',
    project_id: 'test-project',
    private_key_id: 'key-id-123',
    private_key: TEST_PRIVATE_KEY,
    client_email: 'test@test-project.iam.gserviceaccount.com',
    client_id: '123456789',
    auth_uri: 'https://accounts.google.com/o/oauth2/auth',
    token_uri: 'https://oauth2.googleapis.com/token',
    auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
    client_x509_cert_url: 'https://www.googleapis.com/robot/v1/metadata/x509/test',
  },
  delegateEmail: 'user@example.com',
};

const mockOAuthOptions: GmailOAuthOptions = {
  accessToken: 'mock-access-token',
  refreshToken: 'mock-refresh-token',
  clientId: 'client-id',
  clientSecret: 'client-secret',
};

describe('GmailApi', () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('constructor', () => {
    it('should create instance with OAuth options', () => {
      const api = new GmailApi(mockOAuthOptions);
      expect(api).toBeInstanceOf(GmailApi);
    });

    it('should create instance with service account options', () => {
      const api = new GmailApi(mockServiceAccountOptions);
      expect(api).toBeInstanceOf(GmailApi);
    });

    it('should throw error for invalid options', () => {
      expect(() => new GmailApi({} as any)).toThrow('Invalid Gmail options');
    });
  });

  describe('service account authentication', () => {
    it('should fetch token on init with service account', async () => {
      const mockTokenResponse = {
        access_token: 'sa-access-token',
        expires_in: 3600,
        token_type: 'Bearer',
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockTokenResponse),
      });

      const api = new GmailApi(mockServiceAccountOptions);
      await api.init();

      expect(global.fetch).toHaveBeenCalledWith(
        'https://oauth2.googleapis.com/token',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }),
      );

      // Verify the body contains correct grant type
      const fetchCall = (global.fetch as any).mock.calls[0];
      const body = fetchCall[1].body;
      expect(body.get('grant_type')).toBe('urn:ietf:params:oauth:grant-type:jwt-bearer');
      expect(body.get('assertion')).toBe('mock-jwt-token');
    });

    it('should throw AuthenticationError on token exchange failure', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        statusText: 'Bad Request',
        json: () => Promise.resolve({ error_description: 'Invalid JWT' }),
      });

      const api = new GmailApi(mockServiceAccountOptions);

      await expect(api.init()).rejects.toThrow('Service account token exchange failed: Invalid JWT');
    });

    it('should handle token exchange failure with no error description', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        statusText: 'Internal Server Error',
        json: () => Promise.reject(new Error('parse error')),
      });

      const api = new GmailApi(mockServiceAccountOptions);

      await expect(api.init()).rejects.toThrow('Service account token exchange failed: Internal Server Error');
    });

    it('should set access token and expiry after successful auth', async () => {
      const mockTokenResponse = {
        access_token: 'new-access-token',
        expires_in: 3600,
        token_type: 'Bearer',
      };

      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockTokenResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ labels: [] }),
        });

      const api = new GmailApi(mockServiceAccountOptions);
      await api.init();

      // Verify the token is used in subsequent requests
      await api.labels.list();

      expect(global.fetch).toHaveBeenCalledTimes(2);
      const labelsCall = (global.fetch as any).mock.calls[1];
      expect(labelsCall[1].headers.Authorization).toBe('Bearer new-access-token');
    });
  });

  describe('OAuth authentication', () => {
    it('should not fetch token on init with OAuth options', async () => {
      global.fetch = vi.fn();

      const api = new GmailApi(mockOAuthOptions);
      await api.init();

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should use provided access token', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ labels: [] }),
      });

      const api = new GmailApi(mockOAuthOptions);
      await api.labels.list();

      const fetchCall = (global.fetch as any).mock.calls[0];
      expect(fetchCall[1].headers.Authorization).toBe('Bearer mock-access-token');
    });
  });

  describe('JWT creation for service account', () => {
    it('should create JWT with correct claims', async () => {
      const jose = await import('jose');
      const mockTokenResponse = {
        access_token: 'test-token',
        expires_in: 3600,
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockTokenResponse),
      });

      const api = new GmailApi(mockServiceAccountOptions);
      await api.init();

      // Verify importPKCS8 was called with the private key
      expect(jose.importPKCS8).toHaveBeenCalledWith(
        mockServiceAccountOptions.serviceAccount.private_key,
        'RS256',
      );

      // Verify SignJWT was instantiated with correct scope
      expect(jose.SignJWT).toHaveBeenCalledWith({
        scope: 'https://mail.google.com/',
      });
    });
  });
});
