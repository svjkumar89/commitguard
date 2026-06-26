import { Validator, ValidationContext } from '@commitguard/shared';
import { createPassResult, createWarningResult } from './utils.js';
import { GitOperations } from '@commitguard/git';

export class BranchBehindRemoteValidator implements Validator {
  name = 'BranchBehindRemote';

  async run(context: ValidationContext) {
    const git = new GitOperations(context.cwd);
    const behindCount = await git.getCommitsBehindRemote(context.branch);
    
    if (behindCount > 10) {
      return createWarningResult(
        `Branch is ${behindCount} commits behind remote origin.`,
        'Pull latest changes or rebase to avoid merge conflicts.',
        15
      );
    }
    return createPassResult();
  }
}
