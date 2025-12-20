# @faktoor/gmail

Gmail provider for faktoor.js using the Gmail REST API.

## Installation

```bash
pnpm add @faktoor/core @faktoor/gmail
```

## Authentication Options

### OAuth 2.0 (Recommended)

```typescript
import { createMail } from '@faktoor/core';
import { gmail } from '@faktoor/gmail';

const mail = createMail({
  provider: gmail({
    accessToken: 'ya29.xxx...',
    refreshToken: 'optional-refresh-token',
    expiresAt: new Date('2024-12-31'),

    // Called when token is refreshed
    onTokenRefresh: async (tokens) => {
      await saveToDatabase(tokens);
    },
  }),
});
```

### Service Account (Server-to-Server)

For backend services with domain-wide delegation:

```typescript
const mail = createMail({
  provider: gmail({
    serviceAccount: {
      client_email: 'myapp@project.iam.gserviceaccount.com',
      private_key: '-----BEGIN PRIVATE KEY-----\n...',
      project_id: 'my-gcp-project',
    },
    delegateEmail: 'user@yourdomain.com', // Impersonate this user
  }),
});
```

## Gmail-Specific Features

### Gmail Labels

```typescript
import type { GmailEmail } from '@faktoor/gmail';

const emails = await mail.list({ folder: 'inbox' }) as GmailEmail[];

for (const email of emails) {
  console.log(email.snippet);        // Gmail snippet
  console.log(email.sizeEstimate);   // Size in bytes
  console.log(email.gmailLabels);    // Full label objects
}
```

### Search Queries

Supports Gmail search operators:

```typescript
// Using native Gmail query syntax
const emails = await mail.list({
  query: 'from:github.com has:attachment larger:1M',
});

// Or use structured options
const emails = await mail.list({
  from: 'notifications@github.com',
  hasAttachment: true,
  after: new Date('2024-01-01'),
});
```

## Folder Mapping

| faktoor.js | Gmail Label |
|------------|-------------|
| `inbox` | `INBOX` |
| `sent` | `SENT` |
| `drafts` | `DRAFT` |
| `trash` | `TRASH` |
| `spam` | `SPAM` |
| `starred` | `STARRED` |
| `important` | `IMPORTANT` |
| `all` | `ALL` |

## Getting OAuth Tokens

1. Create credentials in [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Enable Gmail API
3. Use OAuth flow to get access token

Example with googleapis:

```typescript
import { google } from 'googleapis';

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

// After user authorization
const { tokens } = await oauth2Client.getToken(code);

const mail = createMail({
  provider: gmail({
    accessToken: tokens.access_token!,
    refreshToken: tokens.refresh_token,
  }),
});
```

## Required Scopes

```
https://www.googleapis.com/auth/gmail.readonly    # Read emails
https://www.googleapis.com/auth/gmail.send        # Send emails
https://www.googleapis.com/auth/gmail.modify      # Modify labels
https://www.googleapis.com/auth/gmail.labels      # Manage labels
```

## License

MIT
