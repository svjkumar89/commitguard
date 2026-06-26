import { Validator, ValidationContext } from '@commitguard/shared';
import { createPassResult, createWarningResult } from './utils.js';
import fs from 'node:fs/promises';
import path from 'node:path';

export class OwnershipDetectionValidator implements Validator {
  name = 'OwnershipDetection';

  async run(context: ValidationContext) {
    try {
      await fs.readFile(path.join(context.cwd, 'CODEOWNERS'), 'utf-8');
      return createPassResult();
    } catch {
      return createWarningResult(
        'No CODEOWNERS file found in repository.',
        'Create a CODEOWNERS file to explicitly define repository ownership.',
        5
      );
    }
  }
}
