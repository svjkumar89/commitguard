import { Validator, ValidationContext } from '@commitguard/shared';
import { createPassResult, createWarningResult } from './utils.js';
import { CommitGuardConfig } from '@commitguard/config';
import path from 'node:path';

export class BinaryFilesValidator implements Validator {
  name = 'BinaryFiles';

  constructor(private config: CommitGuardConfig) {}

  async run(context: ValidationContext) {
    const allowed = this.config.rules.allowedBinaryExtensions;
    // Simple heuristic: if extension is not in allowed list but is typically binary
    const commonBinaries = ['.dll', '.exe', '.so', '.dylib', '.class', '.zip', '.tar', '.gz'];
    
    const badBinaries = context.files.filter(f => {
      const ext = path.extname(f).toLowerCase();
      return commonBinaries.includes(ext) && !allowed.includes(ext);
    });

    if (badBinaries.length > 0) {
      return createWarningResult(
        `Unallowed binary files detected: ${badBinaries.join(', ')}`,
        'Store large binaries in Git LFS or external storage, or add to allowed list.'
      );
    }
    return createPassResult();
  }
}
