import { Validator, ValidationContext } from '@commitguard/shared';
import { createPassResult, createBlockResult } from './utils.js';
import fs from 'node:fs/promises';

export class CommitMessageValidator implements Validator {
  name = 'CommitMessage';

  constructor(private commitMsgFile?: string) {}

  async run(context: ValidationContext) {
    if (!this.commitMsgFile) return createPassResult();

    try {
      const msg = await fs.readFile(this.commitMsgFile, 'utf-8');
      const convention = /^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\(.+\))?:\s.+/;
      
      if (!convention.test(msg.trim().split('\n')[0])) {
        return createBlockResult(
          'Commit message does not follow Conventional Commits specification.',
          'Format: <type>[optional scope]: <description>'
        );
      }
    } catch {
      // If file can't be read, ignore
    }
    
    return createPassResult();
  }
}
