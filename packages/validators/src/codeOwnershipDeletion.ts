import { Validator, ValidationContext, Violation } from '@commitguard/shared';
import { createPassResult, createWarningResult } from './utils.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import { execa } from 'execa';

interface OwnerRule {
  pattern: RegExp;
  owners: string[];
}

async function parseCodeOwners(cwd: string): Promise<OwnerRule[]> {
  const locations = ['CODEOWNERS', '.github/CODEOWNERS', 'docs/CODEOWNERS'];
  for (const loc of locations) {
    try {
      const content = await fs.readFile(path.join(cwd, loc), 'utf-8');
      return content
        .split('\n')
        .map(l => l.trim())
        .filter(l => l && !l.startsWith('#'))
        .map(line => {
          const [pattern, ...owners] = line.split(/\s+/);
          const reStr = pattern
            .replace(/\./g, '\\.')
            .replace(/\*\*/g, '§§')
            .replace(/\*/g, '[^/]*')
            .replace(/§§/g, '.*');
          return { pattern: new RegExp(`^${reStr}`), owners };
        });
    } catch { /* file not found */ }
  }
  return [];
}

function ownersForFile(filePath: string, rules: OwnerRule[]): string[] {
  // CODEOWNERS: last matching rule wins
  let owners: string[] = [];
  for (const rule of rules) {
    if (rule.pattern.test(filePath)) owners = rule.owners;
  }
  return owners;
}

async function getCurrentUserEmail(cwd: string): Promise<string> {
  try {
    const { stdout } = await execa('git', ['config', 'user.email'], { cwd });
    return stdout.trim().toLowerCase();
  } catch {
    return '';
  }
}

async function getDeletedFiles(cwd: string): Promise<string[]> {
  try {
    const { stdout } = await execa('git', ['diff', '--staged', '--name-only', '--diff-filter=D'], { cwd });
    return stdout.trim().split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

export class CodeOwnershipDeletionValidator implements Validator {
  name = 'CodeOwnershipDeletion';

  async run(context: ValidationContext) {
    const [ownerRules, deletedFiles, currentUser] = await Promise.all([
      parseCodeOwners(context.cwd),
      getDeletedFiles(context.cwd),
      getCurrentUserEmail(context.cwd)
    ]);

    if (ownerRules.length === 0 || deletedFiles.length === 0) {
      return createPassResult('No ownership rules or no deleted files.');
    }

    const violations: Violation[] = [];

    for (const file of deletedFiles) {
      const owners = ownersForFile(file, ownerRules);
      if (owners.length === 0) continue;

      const normalised = owners.map(o => o.replace('@', '').toLowerCase());
      const isOwner = normalised.some(o => currentUser.includes(o) || o.includes(currentUser));

      if (!isOwner) {
        violations.push({
          file,
          line: 0,
          match: `Owned by: ${owners.join(', ')}`,
          rule: 'ownership-deletion'
        });
      }
    }

    if (violations.length > 0) {
      const preview = violations.slice(0, 5).map(v => `  ${v.file}  →  ${v.match}`).join('\n');
      const extra = violations.length > 5 ? `\n  ...and ${violations.length - 5} more` : '';
      return createWarningResult(
        `Deleting ${violations.length} file(s) owned by other team members:\n${preview}${extra}`,
        `Review these deletions with the listed owners before merging.\nIf intentional, get explicit approval and document it in your PR description.`,
        15,
        violations
      );
    }

    return createPassResult('All deleted files are owned by the committer or unowned.');
  }
}
