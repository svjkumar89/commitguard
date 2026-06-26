import { describe, it, expect } from 'vitest';
import { CliReporter } from '../src/cliReporter.js';
import { EngineResult } from '@commitguard/core';
import { Severity } from '@commitguard/shared';

describe('CliReporter', () => {
  it('should format a clean report', () => {
    const reporter = new CliReporter();
    const mockResult: EngineResult = {
      score: 100,
      status: Severity.PASS,
      results: [
        {
          status: Severity.PASS,
          severity: Severity.PASS,
          scoreImpact: 0,
          message: 'Branch name ok',
          remediation: '',
          documentationLink: ''
        }
      ]
    };

    const output = reporter.report(mockResult);
    expect(output).toContain('CommitGuard');
    expect(output).toContain('100 / 100');
    expect(output).toContain('All checks passed');
  });

  it('should format a report with blocks', () => {
    const reporter = new CliReporter();
    const mockResult: EngineResult = {
      score: 50,
      status: Severity.BLOCK,
      results: [
        {
          status: Severity.BLOCK,
          severity: Severity.BLOCK,
          scoreImpact: 50,
          message: 'Secrets found',
          remediation: 'Remove secrets',
          documentationLink: ''
        }
      ]
    };

    const output = reporter.report(mockResult);
    expect(output).toContain('CommitGuard');
    expect(output).toContain('50 / 100');
    expect(output).toContain('Secrets found');
  });
});
