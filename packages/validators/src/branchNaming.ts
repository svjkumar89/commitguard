import { Validator, ValidationContext } from '@commitguard/shared';
import { CommitGuardConfig } from '@commitguard/config';
import { createPassResult, createBlockResult } from './utils.js';

const ROOT_BRANCHES = new Set(['main', 'master', 'develop', 'development', 'production', 'staging', 'HEAD']);

export class BranchNamingValidator implements Validator {
  name = 'BranchNaming';
  private config: CommitGuardConfig;

  constructor(config: CommitGuardConfig) {
    this.config = config;
  }

  async run(context: ValidationContext) {
    const { branch } = context;

    if (!branch || ROOT_BRANCHES.has(branch)) {
      return createPassResult('Branch is a standard root branch.');
    }

    if (this.config.rules.branchNamingPattern) {
      const re = new RegExp(this.config.rules.branchNamingPattern);
      if (re.test(branch)) return createPassResult('Branch name matches configured pattern.');
      return createBlockResult(
        `Branch "${branch}" does not match required pattern: ${this.config.rules.branchNamingPattern}`,
        `Rename your branch to match the configured pattern.`
      );
    }

    const prefixes = this.config.rules.allowedBranchPrefixes;
    const prefixPattern = new RegExp(`^(${prefixes.map(p => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\/[a-zA-Z0-9._\\-]+$`);

    if (prefixPattern.test(branch)) return createPassResult('Branch name follows naming convention.');

    return createBlockResult(
      `Branch "${branch}" does not follow naming convention.`,
      `Rename using an allowed prefix: ${prefixes.map(p => `${p}/`).join(', ')}\nExample: feature/my-feature`
    );
  }
}
