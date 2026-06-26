import { Validator, ValidationContext } from '@commitguard/shared';
import { createPassResult, createWarningResult } from './utils.js';
import { GitOperations } from '@commitguard/git';
import { CommitGuardConfig } from '@commitguard/config';

export class BranchAgeValidator implements Validator {
  name = 'BranchAge';

  constructor(private config: CommitGuardConfig) {}

  async run(context: ValidationContext) {
    const git = new GitOperations(context.cwd);
    const ageDays = await git.getBranchAgeDays(context.branch);
    
    const maxAge = this.config.rules.maxBranchAgeDays;
    
    if (ageDays > maxAge) {
      return createWarningResult(
        `Branch is ${ageDays} days old, which exceeds the maximum of ${maxAge} days.`,
        'Consider rebasing, merging, or deleting stale branches.'
      );
    }
    return createPassResult();
  }
}
