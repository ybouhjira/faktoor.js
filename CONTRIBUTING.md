# Contributing to faktoor.js

Thanks for your interest in contributing!

## Development Setup

```bash
# Clone the repo
git clone https://github.com/youssef-bouhjira/faktoor.js.git
cd faktoor.js

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Lint & format
pnpm lint
pnpm format
```

## Project Structure

```
faktoor.js/
├── packages/
│   ├── core/       # Core types, client, errors
│   ├── gmail/      # Gmail provider
│   └── parser/     # Email parsing utilities
├── apps/           # Example applications
├── examples/       # Usage examples
└── benchmarks/     # Performance tests
```

## Branch Protection Rules

The `main` branch has the following protection rules enabled:

| Rule | Status | Description |
|------|--------|-------------|
| **Require PR reviews** | ✅ 1 approval | All changes must be reviewed before merging |
| **Require status checks** | ✅ `build` | CI must pass before merging |
| **Require up-to-date branch** | ✅ Strict | Branch must be current with `main` |
| **No direct pushes** | ✅ Enabled | All changes must go through PRs |

### Why These Rules?

- **Code quality** - Reviews catch bugs and ensure code consistency
- **CI validation** - Automated tests prevent breaking changes
- **Clean history** - Up-to-date requirement prevents merge conflicts
- **Audit trail** - PRs document the reasoning behind changes

## Pull Request Workflow

1. **Fork** the repository
2. **Create branch** from `main`:
   ```bash
   git checkout -b feat/my-feature
   ```
3. **Make changes** and add tests
4. **Run checks**:
   ```bash
   pnpm build && pnpm test && pnpm lint
   ```
5. **Commit** with conventional commits
6. **Push** and open a PR
7. **Wait for review** - At least 1 approval required
8. **Ensure CI passes** - The `build` check must be green

## Commit Convention

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]
```

### Types

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `refactor` | Code change (no new features) |
| `test` | Adding tests |
| `chore` | Build, deps, config |
| `perf` | Performance improvement |

### Examples

```
feat(gmail): add batch message fetching
fix(core): handle undefined headers in parse
docs: update README examples
test(gmail): add service account auth tests
chore: bump typescript to 5.7
```

## Adding a New Provider

1. Create package in `packages/`:
   ```bash
   mkdir packages/my-provider
   ```

2. Implement `MailProvider` interface:
   ```typescript
   import type { MailProvider } from '@faktoor/core';

   export class MyProvider implements MailProvider {
     readonly name = 'my-provider';
     // ... implement all methods
   }
   ```

3. Export factory function:
   ```typescript
   export function myProvider(options: MyOptions): MyProvider {
     return new MyProvider(options);
   }
   ```

4. Add tests covering:
   - Authentication
   - List/get/send operations
   - Error handling
   - Edge cases

## Code Style

- **TypeScript** - Strict mode enabled
- **Biome** - Linting and formatting
- **No `any`** - Use proper types
- **Document exports** - JSDoc for public API

## Testing

```bash
# Run all tests
pnpm test

# Watch mode
pnpm test:watch

# Coverage report
pnpm test:coverage
```

Tests should:
- Cover happy path and error cases
- Use mocks for external APIs
- Be fast and deterministic

## Questions?

Open an issue for:
- Bug reports
- Feature requests
- Questions about the codebase

---

Thanks for contributing!
