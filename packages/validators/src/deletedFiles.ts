import { Validator, ValidationContext } from '@commitguard/shared';
import { createPassResult, createWarningResult } from './utils.js';
import { GitOperations } from '@commitguard/git';

export class DeletedFilesValidator implements Validator {
  name = 'DeletedFiles';

  async run(context: ValidationContext) {
    const git = new GitOperations(context.cwd);
    const deleted = await git.getDeletedFiles();

    if (deleted.length > 5) {
      return createWarningResult(
        `${deleted.length} files are being deleted.`,
        'Verify that these file deletions are intentional.'
      );
    }
    return createPassResult();
  }
}
