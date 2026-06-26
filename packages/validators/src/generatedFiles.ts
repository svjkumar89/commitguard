import { Validator, ValidationContext } from '@commitguard/shared';
import { createPassResult, createWarningResult } from './utils.js';

export class GeneratedFilesValidator implements Validator {
  name = 'GeneratedFiles';

  async run(context: ValidationContext) {
    const generatedPatterns = ['package-lock.json', 'pnpm-lock.yaml', 'yarn.lock', 'dist/', 'build/'];
    
    // We only warn if *only* generated files are modified (which is weird) 
    // or if they are modified without source files.
    // For a simple enterprise rule, let's just warn if dist/ or build/ are manually committed.
    
    const hasDistFiles = context.files.some(f => f.startsWith('dist/') || f.startsWith('build/'));
    if (hasDistFiles) {
      return createWarningResult(
        'Committing files in dist/ or build/ directories.',
        'Ensure build artifacts are generated in CI/CD, not committed directly.'
      );
    }
    return createPassResult();
  }
}
