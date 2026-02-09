# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
# Install dependencies
pnpm install

# Build all packages (runs tsup via turbo)
pnpm build

# Run all tests
pnpm test

# Run tests in watch mode (per-package)
cd packages/core && pnpm test:watch

# Run tests with coverage
pnpm test:coverage

# Lint with Biome
pnpm lint

# Lint and fix
pnpm lint:fix

# Format code
pnpm format

# Type check all packages
pnpm typecheck

# Clean all build artifacts
pnpm clean
```

### Running a Single Test File

```bash
# From package directory
cd packages/core
pnpm vitest run src/errors.test.ts
```

## Architecture Overview

faktoor.js is a **provider-pattern email library** with a unified API across email services.

```
┌─────────────────────────────────────────────────────┐
│                   User Code                         │
│  const mail = createMail({ provider: gmail(...) })  │
└──────────────────────────┬──────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────┐
│                    MailClient                       │
│  - Wraps any MailProvider                          │
│  - Adds retry logic with exponential backoff       │
│  - Uniform API regardless of provider              │
└──────────────────────────┬──────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────┐
│                  MailProvider                       │
│  Interface all providers must implement:           │
│  connect/disconnect, list/get/stream, send,        │
│  listFolders/createFolder, markAsRead/star/move... │
└──────────────────────────┬──────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
   ┌────▼────┐        ┌────▼────┐        ┌────▼────┐
   │ Gmail   │        │ Outlook │        │  IMAP   │
   │Provider │        │Provider │        │Provider │
   │(ready)  │        │(planned)│        │(planned)│
   └─────────┘        └─────────┘        └─────────┘
```

### Package Responsibilities

| Package | Purpose |
|---------|---------|
| `@faktoor/core` | Types, `MailClient`, `MailProvider` interface, error classes |
| `@faktoor/gmail` | Gmail API provider implementation |
| `@faktoor/parser` | Email parsing utilities (addresses, base64url, HTML-to-text) |

### Key Design Patterns

1. **Branded Types**: `EmailId`, `ThreadId`, `FolderName` use TypeScript branded types for type safety
2. **Error Hierarchy**: All errors extend `FaktoorError` with `code`, `retryable`, and `cause` properties
3. **Retry Decorator**: `MailClient` wraps providers with configurable retry logic; non-retryable errors bypass retries
4. **Async Iterators**: `stream()` uses generators for memory-efficient mailbox traversal

### Adding a New Provider

1. Create `packages/my-provider/`
2. Implement `MailProvider` interface from `@faktoor/core`
3. Export a factory function: `export function myProvider(opts): MyProvider`
4. Handle provider-specific auth, API calls, and data transformation

## Code Style

- **Biome** for linting and formatting (semicolons, single quotes, 2-space indent)
- **Strict TypeScript** - avoid `any`
- **Conventional Commits**: `feat(scope)`, `fix(scope)`, `docs`, `test`, `chore`
- **Changesets** for versioning: run `pnpm changeset` before PRs with package changes

## Tooling

- **pnpm 9.x** workspaces with **Turborepo** for task orchestration
- **tsup** for building ESM/CJS dual-format packages
- **Vitest** for testing with workspace configuration
