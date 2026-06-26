# Contributing to CommitGuard

Thank you for helping make CommitGuard better!

## Setup

```bash
git clone https://github.com/svjkumar89/commitguard.git
cd commitguard
pnpm install
pnpm build
pnpm test
```

## Adding a New Validator

1. Create `packages/validators/src/yourValidator.ts`:

```typescript
import { Validator, ValidationContext } from '@commitguard/shared';
import { createPassResult, createWarningResult, createBlockResult } from './utils.js';

export class YourValidator implements Validator {
  name = 'YourValidator';

  async run(context: ValidationContext) {
    // your logic here
    return createPassResult();
  }
}
```

2. Export it from `packages/validators/src/index.ts`
3. Add a boolean toggle to `packages/config/src/schema.ts`
4. Register it in the `getValidators()` function in `packages/validators/src/index.ts`
5. Add tests in `packages/validators/tests/`

## Validator Guidelines

- **BLOCK** for security issues and hard policy violations (secrets, protected branches)
- **WARNING** for code quality and best-practice violations (stale branches, large deletions)
- Always include `remediation` with a clear fix
- Report violations with `{ file, line, match, rule }` for line-level output
- Respect `// commitguard:ignore` inline suppression
- Check `IGNORED_EXTENSIONS` for binary files where applicable

## Pull Request Checklist

- [ ] Tests added/updated
- [ ] `pnpm test` passes
- [ ] `pnpm build` passes
- [ ] Validator toggle added to config schema (if adding a validator)
- [ ] README validator table updated (if adding a validator)

## Commit Message Format

This repo uses [Conventional Commits](https://www.conventionalcommits.org):

```
feat: add license header validator
fix: secrets validator missing JWT pattern
docs: update GitHub Actions example
```

## Questions?

Open an issue at [github.com/svjkumar89/commitguard/issues](https://github.com/svjkumar89/commitguard/issues).
