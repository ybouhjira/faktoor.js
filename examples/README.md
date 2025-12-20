# faktoor.js Examples

This directory contains practical examples for using faktoor.js with Gmail.

## Prerequisites

1. **Install dependencies:**

   ```bash
   pnpm install
   ```

2. **Set up Gmail OAuth:**
   - Create a project in [Google Cloud Console](https://console.cloud.google.com/)
   - Enable the Gmail API
   - Create OAuth 2.0 credentials
   - Get an access token

3. **Set environment variable:**

   ```bash
   export GMAIL_ACCESS_TOKEN="your-oauth-access-token"
   ```

## Examples

### `gmail-basic.ts` - List and Get Emails

Learn the fundamentals of faktoor.js:

- Initialize the client with Gmail provider
- Connect to Gmail
- List emails from inbox
- Get a single email by ID
- Access email properties (subject, from, date, body)

```bash
npx tsx examples/gmail-basic.ts
```

### `gmail-send.ts` - Send Emails with Attachments

Learn how to send emails:

- Send simple text emails
- Send HTML emails with styling
- Add CC/BCC recipients
- Attach files (text, PDF, images)
- Handle send results

```bash
npx tsx examples/gmail-send.ts
```

### `gmail-streaming.ts` - Process Large Mailboxes

Learn memory-efficient email processing:

- Stream emails using async iterators
- Process emails one at a time
- Handle large mailboxes without memory issues
- Implement batch processing
- Early termination of streams

```bash
npx tsx examples/gmail-streaming.ts
```

### `gmail-search.ts` - Filter and Search Emails

Learn powerful search capabilities:

- Search by sender (`from`)
- Filter by date range (`after`, `before`)
- Find emails with attachments (`hasAttachment`)
- Filter unread emails (`unreadOnly`)
- Combine multiple filters
- Search across different folders

```bash
npx tsx examples/gmail-search.ts
```

## Running Examples

All examples use [tsx](https://github.com/privatenumber/tsx) for TypeScript execution:

```bash
# Install tsx globally (optional)
npm install -g tsx

# Run any example
npx tsx examples/gmail-basic.ts
```

## Common Patterns

### Error Handling

```typescript
import { AuthenticationError, RateLimitError } from '@faktoor/core';

try {
  await mail.list();
} catch (error) {
  if (error instanceof AuthenticationError) {
    // Token expired - refresh it
  } else if (error instanceof RateLimitError) {
    // Wait and retry
    await sleep(error.retryAfter);
  }
}
```

### Cleanup

Always disconnect when done:

```typescript
try {
  await mail.connect();
  // ... operations
} finally {
  await mail.disconnect();
}
```

### Environment Variables

Create a `.env` file for local development:

```env
GMAIL_ACCESS_TOKEN=your-access-token
```

Then load it:

```typescript
import 'dotenv/config';
```

## Need Help?

- [API Documentation](../README.md)
- [GitHub Issues](https://github.com/ybouhjira/faktoor.js/issues)
