# CommitGuard

**Enterprise-grade Git policy engine** — catches secrets, enforces branch conventions, blocks dangerous SQL, and gates CI/CD pipelines before damage reaches production.

[![npm version](https://img.shields.io/npm/v/commitguard?color=brightgreen&logo=npm)](https://www.npmjs.com/package/commitguard)
[![CI](https://github.com/svjkumar89/commitguard/actions/workflows/ci.yml/badge.svg)](https://github.com/svjkumar89/commitguard/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)](https://www.typescriptlang.org)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

---

## Why CommitGuard?

| Problem | CommitGuard Solution |
|---|---|
| Secrets accidentally committed | 50+ secret patterns + Shannon entropy detection |
| Dangerous SQL pushed to prod | Scans `.ts`, `.js`, `.py`, `.go`, `.java` + `.sql` files |
| Junior devs committing to `main` | Protected branches + pre-commit hooks |
| Unresolved merge conflicts | Blocks on `<<<<<<<` / `=======` / `>>>>>>>` markers |
| No commit message standards | Enforces [Conventional Commits](https://www.conventionalcommits.org) |
| No CI visibility | GitHub Annotations + PR summary tables |

---

## Quick Start

```bash
# Install globally
npm install -g @svjkumar89/commitguard

# Initialize in your repository (config + hooks + GitHub Actions)
cd your-repo
commitguard init

# That's it — every commit is now protected
git add .
git commit -m "feat: add user auth"
```

---

## Installation

```bash
# Global (recommended)
npm install -g @svjkumar89/commitguard

# Project-local
npm install --save-dev @svjkumar89/commitguard
# or
pnpm add -D commitguard
# or
yarn add -D commitguard
```

**Requirements:** Node.js ≥ 18, Git ≥ 2.9

---

## CLI Commands

| Command | Description |
|---|---|
| `commitguard init` | Create config file, install hooks, generate GitHub Actions workflow |
| `commitguard validate` | Run all validators against staged files |
| `commitguard push-check` | Run force-push + suspicious-diff checks (auto-called by pre-push hook) |
| `commitguard scan [--depth 50]` | Scan git history for secrets and dangerous SQL |
| `commitguard doctor` | Diagnose setup: config, hooks, git, node version |
| `commitguard status` | Show current risk score for staged changes |
| `commitguard report` | Full risk report (alias for validate) |
| `commitguard config` | Print resolved configuration with all defaults |
| `commitguard install` | Install git hooks only |

### Validate options

```bash
commitguard validate              # CLI output (default)
commitguard validate --format json  # JSON output (for tooling)
commitguard validate --ci         # CI mode (enables build/test validators)
```

### Scan a repository's history

```bash
commitguard scan               # Scan last 50 commits (default)
commitguard scan --depth 200   # Scan last 200 commits
```

---

## Validators

CommitGuard ships **16 validators** across two severity levels:

### 🚫 BLOCK — Commit is rejected

| Validator | What it catches |
|---|---|
| **Secrets** | 50+ secret patterns: AWS keys, GitHub tokens, Stripe keys, Google API keys, Slack tokens, JWTs, SSH private keys, DB connection strings, and more. Plus Shannon entropy detection for high-randomness strings. |
| **ProtectedBranches** | Direct commits to `main`, `master`, `production` (configurable) |
| **BranchNaming** | Branch names that don't follow prefix convention or custom regex |
| **MergeMarkers** | Unresolved merge conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`) |
| **SqlSafety** | `DROP TABLE`, `TRUNCATE`, `DELETE`/`UPDATE` without `WHERE` — across `.sql`, `.ts`, `.js`, `.py`, `.go`, `.java` and more |
| **CommitMessage** | Messages that don't follow [Conventional Commits](https://www.conventionalcommits.org) (`feat:`, `fix:`, `docs:`, etc.) |
| **ForcePush** | Force-push / history rewrites on protected branches — blocks `git push --force` that would destroy shared history. Warns on non-protected branches. |
| **SuspiciousDiff** | Commits where deletions vastly outweigh additions (e.g. 10× ratio, >500 lines) — catches accidental code wipes and branch resets. |

### ⚠️  WARNING — Commit is allowed, score deducted

| Validator | What it catches |
|---|---|
| **BranchAge** | Branches older than `maxBranchAgeDays` (default: 30 days) |
| **BranchBehindRemote** | Branch is behind its remote tracking branch |
| **LargeDeletions** | Diff deletions exceeding `maxDeletionLines` (default: 500) |
| **DeletedFiles** | Bulk file deletions exceeding `maxDeletedFiles` (default: 5) |
| **BinaryFiles** | Binary files not in `allowedBinaryExtensions` |
| **GeneratedFiles** | Build artifacts committed (`dist/`, `build/`, `out/`) |
| **OwnershipDetection** | Missing `CODEOWNERS` file |
| **MergeConflictPrediction** | Predicts merge conflicts before they happen |
| **BuildVerification** | Build failure detected (CI mode only) |
| **TestVerification** | Test failure detected (CI mode only) |
| **CodeOwnershipDeletion** | Deleting files that are owned (via CODEOWNERS) by another team member — requires explicit review |

---

## Risk Score

Every run produces a **0–100 risk score**:

- Start at **100**
- Each **WARNING** deducts **10 points**
- Each **BLOCK** deducts **50 points** and exits with code `1`
- Score **0** → automatic BLOCK regardless of individual results

```
  ✅ Score  : 90 / 100   → All good
  ⚠️  Score  : 60 / 100   → Warnings present, investigate
  🚫 Score  : 0  / 100   → Blocked — fix violations before committing
```

---

## Configuration

CommitGuard auto-discovers `.commitguard.yml`, `.commitguard.json`, or `.commitguard.yaml` in your project root.

```yaml
# .commitguard.yml

validators:
  branchNaming: true
  protectedBranches: true
  mergeMarkers: true
  secrets: true
  sqlSafety: true
  commitMessage: true
  largeDeletions: true
  binaryFiles: true
  generatedFiles: true
  ownershipDetection: true
  branchAge: true
  branchBehindRemote: true
  mergeConflictPrediction: true
  deletedFiles: true
  buildVerification: true   # CI mode only
  testVerification: true    # CI mode only
  forcePush: true           # block force-pushes on protected branches
  suspiciousDiff: true      # block extreme deletion:addition ratios
  codeOwnershipDeletion: true  # warn when deleting files owned by others

rules:
  maxBranchAgeDays: 30
  protectedBranchesList:
    - main
    - master
    - production
  allowedBranchPrefixes:
    - feature
    - bugfix
    - hotfix
    - release
    - chore
    - fix
    - docs
  # OR use a custom regex instead of prefixes:
  # branchNamingPattern: "^(feat|fix|chore)/.+"
  maxDeletionLines: 500
  maxDeletedFiles: 5
  allowedBinaryExtensions:
    - .png
    - .jpg
    - .jpeg
    - .pdf
    - .svg
  scanDepth: 50
  suspiciousDiffRatio: 10      # BLOCK if deletions/additions > 10×
  suspiciousDiffWarnRatio: 5   # WARN if deletions/additions > 5×
```

### Disable a specific validator

```yaml
validators:
  ownershipDetection: false   # don't require CODEOWNERS
  branchAge: false            # no branch age limit
```

---

## Suppressing False Positives

### File-level: `.commitguardignore`

Create a `.commitguardignore` file in your project root (supports globs):

```
# Ignore test fixtures
tests/fixtures/**
**/__mocks__/**

# Ignore generated files
src/generated/**
```

### Line-level: inline comment

Add `# commitguard:ignore` or `// commitguard:ignore` at the end of a line:

```typescript
const TEST_TOKEN = 'ghp_FAKE_TOKEN_FOR_TESTS'; // commitguard:ignore
```

---

## GitHub Actions Integration

`commitguard init` generates `.github/workflows/commitguard.yml` automatically. Or add it manually:

```yaml
name: CommitGuard

on:
  pull_request:
    branches: [main, master, production]
  push:
    branches: [main, master]

jobs:
  commitguard:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: actions/setup-node@v4
        with:
          node-version: '22'

      - run: npm install -g @svjkumar89/commitguard

      - name: Run CommitGuard
        run: commitguard validate --ci
```

In CI mode, CommitGuard also:
- Posts a **PR summary table** to `GITHUB_STEP_SUMMARY`
- Emits **GitHub Annotations** (notices/warnings/errors) on specific files and lines

---

## Monorepo Structure

```
commitguard/
├── apps/
│   └── cli/                    # CLI entry point (npm: commitguard)
├── packages/
│   ├── @commitguard/config     # Config schema (Zod) + loader
│   ├── @commitguard/core       # RiskEngine — validator orchestration
│   ├── @commitguard/git        # GitOperations + hook installer
│   ├── @commitguard/github     # GitHub Actions generator + PR summary
│   ├── @commitguard/reporters  # CLI + JSON reporters
│   ├── @commitguard/shared     # Types, enums, constants
│   └── @commitguard/validators # All 16 validators
└── ...
```

---

## Adding a Custom Validator

CommitGuard's plugin architecture makes it trivial to add validators:

```typescript
import { Validator, ValidationContext } from '@commitguard/shared';

export class LicenseHeaderValidator implements Validator {
  name = 'LicenseHeader';

  async run(context: ValidationContext) {
    const missing = context.files.filter(f =>
      f.endsWith('.ts') && !fs.readFileSync(f, 'utf-8').startsWith('// Copyright')
    );

    if (missing.length > 0) {
      return {
        status: 'WARNING',
        severity: 'WARNING',
        scoreImpact: 10,
        message: `Missing license header in: ${missing.join(', ')}`,
        remediation: 'Add "// Copyright (c) 2024 Your Company" to the top of each file.',
        documentationLink: ''
      };
    }

    return { status: 'PASS', severity: 'PASS', scoreImpact: 0, message: 'OK', remediation: '', documentationLink: '' };
  }
}
```

---

## Development

```bash
# Clone
git clone https://github.com/svjkumar89/commitguard.git
cd commitguard

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Run the CLI locally
node apps/cli/dist/index.js doctor
```

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). All contributions welcome — new validators, bug fixes, documentation improvements.

---

## License

[MIT](LICENSE) © svjkumar89
