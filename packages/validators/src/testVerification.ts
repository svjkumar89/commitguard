import { Validator, ValidationContext } from '@commitguard/shared';
import { createPassResult, createWarningResult } from './utils.js';
import { execa } from 'execa';

export class TestVerificationValidator implements Validator {
  name = 'TestVerification';

  async run(context: ValidationContext) {
    if (!context.isCI) return createPassResult();

    try {
      // Assuming a generic test script
      await execa('npm', ['run', 'test'], { cwd: context.cwd });
      return createPassResult();
    } catch (e) {
      return createWarningResult(
        'Tests failed during verification.',
        'Fix failing unit tests.'
      );
    }
  }
}
