import { Validator, ValidationContext } from '@commitguard/shared';
import { createPassResult, createBlockResult } from './utils.js';
import fs from 'node:fs/promises';
import path from 'node:path';

export class MergeMarkersValidator implements Validator {
  name = 'MergeMarkers';

  async run(context: ValidationContext) {
    const markerRegex = /^(<<<<<<<|=======|>>>>>>>)/m;
    const filesWithMarkers: string[] = [];

    for (const file of context.files) {
      try {
        const content = await fs.readFile(path.join(context.cwd, file), 'utf-8');
        if (markerRegex.test(content)) {
          filesWithMarkers.push(file);
        }
      } catch (e) {
        // Skip files that can't be read (binary, deleted, etc.)
      }
    }

    if (filesWithMarkers.length > 0) {
      return createBlockResult(
        `Unresolved merge markers found in: ${filesWithMarkers.join(', ')}`,
        'Resolve merge conflicts and remove all <<<<<<<, =======, >>>>>>> markers.'
      );
    }
    return createPassResult();
  }
}
