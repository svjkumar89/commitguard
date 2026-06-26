import { Validator, ValidationContext } from '@commitguard/shared';
import { createPassResult, createWarningResult } from './utils.js';
import { execa } from 'execa';

export class BuildVerificationValidator implements Validator {
  name = 'BuildVerification';

  async run(context: ValidationContext) {
    // Only run expensive verifications in CI or if explicitly configured
    if (!context.isCI) return createPassResult();

    try {
      // Assuming a generic build script
      await execa('npm', ['run', 'build'], { cwd: context.cwd });
      return createPassResult();
    } catch (e) {
      return createWarningResult(
        'Build failed during verification.',
        'Fix compilation errors.'
      );
    }
  }
}
