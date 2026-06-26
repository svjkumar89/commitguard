import { Validator, ValidationContext, Violation } from '@commitguard/shared';
import { CommitGuardConfig } from '@commitguard/config';
import { createPassResult, createBlockResult, createWarningResult } from './utils.js';
import { execa } from 'execa';

const ZERO_SHA = '0000000000000000000000000000000000000000';

async function isAncestor(ancestor: string, descendant: string, cwd: string): Promise<boolean> {
  try {
    await execa('git', ['merge-base', '--is-ancestor', ancestor, descendant], { cwd });
    return true;
  } catch {
    return false;
  }
}

export class ForcePushValidator implements Validator {
  name = 'ForcePush';
  private config: CommitGuardConfig;

  constructor(config: CommitGuardConfig) {
    this.config = config;
  }

  async run(context: ValidationContext) {
    if (!context.pushInfoLines || context.pushInfoLines.length === 0) {
      return createPassResult('No push info (pre-push context not active).');
    }

    const protected_ = new Set(this.config.rules.protectedBranchesList);
    const violations: Violation[] = [];

    for (const push of context.pushInfoLines) {
      const { localRef, localSha, remoteRef, remoteSha } = push;

      // New branch — nothing to compare against
      if (remoteSha === ZERO_SHA) continue;

      // Deleted branch push — allow (handled by ProtectedBranches)
      if (localSha === ZERO_SHA) continue;

      const refName = remoteRef.replace('refs/heads/', '');
      const isProtectedBranch = protected_.has(refName);

      const fastForward = await isAncestor(remoteSha, localSha, context.cwd);

      if (!fastForward) {
        violations.push({
          file: refName,
          line: 0,
          match: `Force push / history rewrite detected on ${remoteRef}`,
          rule: 'force-push'
        });

        if (isProtectedBranch) {
          return createBlockResult(
            `🚫 Force push blocked on protected branch "${refName}".\n  Remote: ${remoteSha.slice(0, 8)}  →  Local: ${localSha.slice(0, 8)}\n  This would rewrite shared history and destroy other contributors' commits.`,
            `Rebase your branch on top of the current ${refName} instead:\n  git fetch origin\n  git rebase origin/${refName}\nNever use --force on shared/protected branches.`,
            50,
            violations
          );
        }

        // Non-protected branch: warn but allow with explanation
        return createWarningResult(
          `⚠️  History rewrite detected on "${refName}" (non-fast-forward push).\n  Remote: ${remoteSha.slice(0, 8)}  →  Local: ${localSha.slice(0, 8)}\n  If others are using this branch, their work may be lost.`,
          `Prefer rebasing over force-pushing on shared branches.\nIf you must, coordinate with your team first and use: git push --force-with-lease (safer than --force).`,
          10,
          violations
        );
      }
    }

    return createPassResult('No force push or history rewrite detected.');
  }
}
