<p align="center">
  <img src="./assets/logo.png" alt="faktoor.js logo" width="200" />
</p>

# faktoor.js

> **Universal TypeScript Email Library** - Read, send, and manage emails across Gmail, Outlook, IMAP with a single unified API.

[![npm version](https://img.shields.io/npm/v/@faktoor/core.svg?style=flat-square)](https://www.npmjs.com/package/@faktoor/core)
[![CI Status](https://img.shields.io/github/actions/workflow/status/ybouhjira/faktoor.js/ci.yml?branch=main&style=flat-square)](https://github.com/ybouhjira/faktoor.js/actions)
[![Coverage](https://img.shields.io/codecov/c/github/ybouhjira/faktoor.js?style=flat-square)](https://codecov.io/gh/ybouhjira/faktoor.js)
[![License: MIT](https://img.shields.io/npm/l/@faktoor/core.svg?style=flat-square)](https://github.com/ybouhjira/faktoor.js/blob/main/LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue?style=flat-square)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green?style=flat-square)](https://nodejs.org/)

---

## What is faktoor.js?

**faktoor.js** is a TypeScript email library that provides a unified API for working with multiple email providers. Instead of learning different APIs for Gmail, Outlook, and IMAP, you learn one API that works everywhere.

### Key Capabilities

| Feature | Description |
|---------|-------------|
| **Read Emails** | List, search, filter, and stream emails from any provider |
| **Send Emails** | Send plain text, HTML, and emails with attachments |
| **Manage Emails** | Mark read/unread, star, move, delete, add labels |
| **Folder Operations** | List, create, delete folders/labels |
| **Streaming** | Process large mailboxes with async iterators |
| **Auto-Retry** | Built-in exponential backoff for API failures |

### Supported Providers

| Provider | Package | Status |
|----------|---------|--------|
| Gmail | `@faktoor/gmail` | ✅ Ready |
| Outlook | `@faktoor/outlook` | 🚧 Planned |
| IMAP | `@faktoor/imap` | 🚧 Planned |
| SendGrid | `@faktoor/sendgrid` | 🚧 Planned |
| Resend | `@faktoor/resend` | 🚧 Planned |

---

## Installation

```bash
# Using pnpm (recommended)
pnpm add @faktoor/core @faktoor/gmail

# Using npm
npm install @faktoor/core @faktoor/gmail

# Using yarn
yarn add @faktoor/core @faktoor/gmail
```

**Requirements:** Node.js 18+ and TypeScript 5.0+

---

## Quick Start

```typescript
import { createMail } from '@faktoor/core';
import { gmail } from '@faktoor/gmail';

// Initialize client with Gmail provider
const mail = createMail({
  provider: gmail({
    accessToken: 'your-oauth-access-token',
  }),
});

// Connect to Gmail
await mail.connect();

// List recent inbox emails
const emails = await mail.list({
  folder: 'inbox',
  limit: 10,
  unreadOnly: true,
});

// Process emails
for (const email of emails) {
  console.log(`From: ${email.from.email}`);
  console.log(`Subject: ${email.subject}`);
  console.log(`Date: ${email.date}`);
}
```

---

## Core API Reference

### Creating a Client

```typescript
import { createMail } from '@faktoor/core';
import { gmail } from '@faktoor/gmail';

const mail = createMail({
  provider: gmail({ accessToken: 'token' }),
  retry: {
    attempts: 3,
    backoff: 'exponential',
    initialDelay: 1000,
    maxDelay: 30000,
  },
});
```

### Reading Emails

```typescript
// List with filters
const emails = await mail.list({
  folder: 'inbox',
  from: 'sender@example.com',
  after: new Date('2024-01-01'),
  hasAttachment: true,
  unreadOnly: true,
  limit: 50,
});

// Get single email
const email = await mail.get('email-id');

// Stream large mailboxes (memory efficient)
for await (const email of mail.stream({ folder: 'inbox' })) {
  processEmail(email);
}
```

### Sending Emails

```typescript
const result = await mail.send({
  to: ['recipient@example.com'],
  cc: ['cc@example.com'],
  subject: 'Hello from faktoor.js',
  text: 'Plain text version',
  html: '<h1>HTML version</h1>',
  attachments: [
    { filename: 'doc.pdf', content: pdfBuffer },
  ],
});

console.log(`Email sent with ID: ${result.id}`);
```

### Managing Emails

```typescript
// Read status
await mail.markAsRead(emailId);
await mail.markAsUnread(emailId);

// Starring
await mail.star(emailId);
await mail.unstar(emailId);

// Organization
await mail.move(emailId, 'archive');
await mail.delete(emailId);
await mail.addLabel(emailId, 'important');
await mail.removeLabel(emailId, 'todo');
```

### Folder Operations

```typescript
const folders = await mail.listFolders();
const inbox = await mail.getFolder('inbox');
await mail.createFolder('Projects');
await mail.deleteFolder('Old');
```

---

## TypeScript Types

faktoor.js is fully typed with branded types for type safety:

```typescript
import type {
  Email,
  EmailId,
  Address,
  Folder,
  SendOptions,
  ListOptions,
  MailProvider,
} from '@faktoor/core';
```

### Email Interface

```typescript
interface Email {
  id: EmailId;
  threadId: ThreadId;
  folder: FolderName;
  from: Address;
  to: Address[];
  cc: Address[];
  bcc: Address[];
  subject: string;
  body: { html: string | null; text: string };
  date: Date;
  isRead: boolean;
  isStarred: boolean;
  attachments: AttachmentMeta[];
  labels: Label[];
}
```

---

## Packages

| Package | Description | npm |
|---------|-------------|-----|
| `@faktoor/core` | Core types, client, error classes | [![npm](https://img.shields.io/npm/v/@faktoor/core.svg?style=flat-square)](https://www.npmjs.com/package/@faktoor/core) |
| `@faktoor/gmail` | Gmail API provider | [![npm](https://img.shields.io/npm/v/@faktoor/gmail.svg?style=flat-square)](https://www.npmjs.com/package/@faktoor/gmail) |
| `@faktoor/parser` | Email parsing utilities | [![npm](https://img.shields.io/npm/v/@faktoor/parser.svg?style=flat-square)](https://www.npmjs.com/package/@faktoor/parser) |

---

## Error Handling

```typescript
import {
  FaktoorError,
  AuthenticationError,
  RateLimitError,
  NotFoundError,
  NetworkError,
} from '@faktoor/core';

try {
  await mail.list();
} catch (error) {
  if (error instanceof AuthenticationError) {
    // Token expired or invalid
  } else if (error instanceof RateLimitError) {
    // API rate limit hit, retry after error.retryAfter
  } else if (error instanceof NotFoundError) {
    // Email or folder not found
  }
}
```

---

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `provider` | `MailProvider` | required | Email provider instance |
| `retry.attempts` | `number` | `3` | Max retry attempts |
| `retry.backoff` | `string` | `'exponential'` | `'exponential'`, `'fixed'`, or `'none'` |
| `retry.initialDelay` | `number` | `1000` | Initial retry delay (ms) |
| `retry.maxDelay` | `number` | `30000` | Maximum retry delay (ms) |

---

## Contributing

```bash
git clone https://github.com/ybouhjira/faktoor.js.git
cd faktoor.js
pnpm install
pnpm build
pnpm test
```

See [CONTRIBUTING.md](./CONTRIBUTING.md) for details.

---

## License

MIT © Youssef Bouhjira

---

## Keywords

`email` `mail` `gmail` `outlook` `imap` `smtp` `typescript` `nodejs` `email-client` `email-api` `gmail-api` `microsoft-graph` `email-parser` `email-sending` `mailbox` `inbox` `email-library` `unified-api`
