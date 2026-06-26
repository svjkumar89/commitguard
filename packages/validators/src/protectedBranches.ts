import { Validator, ValidationContext } from '@commitguard/shared';
import { createPassResult, createBlockResult } from './utils.js';
import { CommitGuardConfig } from '@commitguard/config';

export class ProtectedBranchesValidator implements Validator {
  name = 'ProtectedBranches';

  constructor(private config: CommitGuardConfig) {}

  async run(context: ValidationContext) {
    const protectedList = this.config.rules.protectedBranchesList;
    if (protectedList.includes(context.branch)) {
      // In a real scenario, this block prevents direct commits.
      return createBlockResult(
        `Direct commits to protected branch "${context.branch}" are not allowed.`,
        'Create a new branch and open a Pull Request.'
      );
    }
    return createPassResult('Branch is not protected.');
  }
}
