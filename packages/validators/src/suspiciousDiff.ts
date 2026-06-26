import { Validator, ValidationContext, Violation } from '@commitguard/shared';
import { CommitGuardConfig } from '@commitguard/config';
import { createPassResult, createBlockResult, createWarningResult } from './utils.js';
import { execa } from 'execa';

const IGNORED_GENERATED = [/package-lock\.json/, /pnpm-lock\.yaml/, /yarn\.lock/, /dist\//, /build\//];

export class SuspiciousDiffValidator implements Validator {
  name = 'SuspiciousDiff';
  private config: CommitGuardConfig;

  constructor(config: CommitGuardConfig) {
    this.config = config;
  }

  async run(context: ValidationContext) {
    let numstat: string;
    try {
      const result = await execa('git', ['diff', '--staged', '--numstat'], { cwd: context.cwd });
      numstat = result.stdout;
    } catch {
      return createPassResult('Could not read staged diff.');
    }

    if (!numstat.trim()) return createPassResult('No staged changes to analyse.');

    let totalAdded = 0;
    let totalDeleted = 0;
    const heavyFiles: Violation[] = [];

    for (const line of numstat.trim().split('\n')) {
      const parts = line.split('\t');
      if (parts.length < 3) continue;
      const [addStr, delStr, file] = parts;

      // Skip binary files and lock files
      if (addStr === '-' || delStr === '-') continue;
      if (IGNORED_GENERATED.some(r => r.test(file))) continue;

      const added = parseInt(addStr, 10);
      const deleted = parseInt(delStr, 10);
      totalAdded += added;
      totalDeleted += deleted;

      // Flag individual files with extreme deletion ratios
      if (deleted > 100 && deleted > added * 5) {
        heavyFiles.push({ file, line: 0, match: `-${deleted} lines (+${added})`, rule: 'file-wipe' });
      }
    }

    const ratio = totalDeleted / Math.max(totalAdded, 1);
    const { maxDeletionLines } = this.config.rules;

    // Hard block: massive net deletion (>configured threshold) with extreme ratio
    if (totalDeleted > maxDeletionLines && ratio > 10) {
      return createBlockResult(
        `Suspicious diff: −${totalDeleted} lines deleted vs +${totalAdded} added (${ratio.toFixed(0)}× ratio).\nThis commit removes ${totalDeleted} lines of code — possible accidental wipe.\nAffected files:\n${heavyFiles.slice(0, 5).map(v => `  ${v.file}  ${v.match}`).join('\n')}`,
        `Review your staged diff with:\n  git diff --staged\nIf intentional, split into a separate "chore: cleanup" commit with an explanation in the message.',`,
        50,
        heavyFiles
      );
    }

    // Soft warning: high deletion ratio even if below hard threshold
    if (totalDeleted > 100 && ratio > 5 && heavyFiles.length > 0) {
      return createWarningResult(
        `High deletion ratio: −${totalDeleted} lines deleted vs +${totalAdded} added.\nFiles with large deletions:\n${heavyFiles.slice(0, 3).map(v => `  ${v.file}  ${v.match}`).join('\n')}`,
        `Verify this is intentional. Use:\n  git diff --staged\nConsider splitting cleanup commits from feature commits.`,
        10,
        heavyFiles
      );
    }

    return createPassResult(`Diff ratio acceptable (−${totalDeleted} / +${totalAdded}).`);
  }
}
