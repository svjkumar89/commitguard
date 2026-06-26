import { Validator, ValidationContext } from '@commitguard/shared';
import { createPassResult, createWarningResult } from './utils.js';
import { GitOperations } from '@commitguard/git';
import { CommitGuardConfig } from '@commitguard/config';

export class LargeDeletionsValidator implements Validator {
  name = 'LargeDeletions';

  constructor(private config: CommitGuardConfig) {}

  async run(context: ValidationContext) {
    const git = new GitOperations(context.cwd);
    let totalDeleted = 0;

    for (const file of context.files) {
      const stats = await git.getDiffLinesCount(file);
      totalDeleted += stats.deleted;
    }

    if (totalDeleted > this.config.rules.maxDeletionLines) {
      return createWarningResult(
        `Large deletion detected: ${totalDeleted} lines removed.`,
        'Ensure this code deletion is intentional and reviewed.'
      );
    }
    return createPassResult();
  }
}
