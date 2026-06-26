import { Validator, ValidationContext } from '@commitguard/shared';
import { createPassResult, createWarningResult } from './utils.js';
import { GitOperations } from '@commitguard/git';

export class MergeConflictPredictionValidator implements Validator {
  name = 'MergeConflictPrediction';

  async run(context: ValidationContext) {
    const git = new GitOperations(context.cwd);
    const conflict = await git.checkMergeConflictWithTarget('main');

    if (conflict) {
      return createWarningResult(
        'Potential merge conflict with target branch (main) detected.',
        'Rebase or merge target branch locally to resolve conflicts before pushing.'
      );
    }
    return createPassResult();
  }
}
