# @faktoor/core

Core types, interfaces, and client for faktoor.js.

## Installation

```bash
pnpm add @faktoor/core
```

## Overview

This package provides:

- **`createMail()`** - Factory function to create mail clients
- **`MailClient`** - Client wrapper with retry logic
- **`MailProvider`** - Interface for implementing providers
- **Core types** - `Email`, `Folder`, `Address`, `Attachment`, etc.
- **Error classes** - `FaktoorError`, `AuthenticationError`, `RateLimitError`, etc.

## Usage

```typescript
import { createMail, MailProvider } from '@faktoor/core';
import type { Email, ListOptions } from '@faktoor/core';

// Use with a provider
const mail = createMail({
  provider: yourProvider,
  retry: { attempts: 3 },
});
```

## Types

| Type | Description |
|------|-------------|
| `Email` | Full email object with body, headers, attachments |
| `EmailId` | Branded string type for email IDs |
| `ThreadId` | Branded string type for thread IDs |
| `Address` | Email address with optional name |
| `Folder` | Folder/mailbox information |
| `Attachment` | Attachment with download methods |
| `SendResult` | Result of sending an email |

## Errors

| Error | Description |
|-------|-------------|
| `FaktoorError` | Base error class |
| `AuthenticationError` | Auth failed |
| `RateLimitError` | Rate limit exceeded |
| `NetworkError` | Network issues |
| `NotFoundError` | Resource not found |
| `ValidationError` | Invalid input |
| `ProviderError` | Provider-specific error |

## License

MIT
