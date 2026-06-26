import { describe, it, expect, vi } from 'vitest';
import { PRSummaryGenerator } from '../src/prSummary.js';
import { AnnotationsGenerator } from '../src/annotations.js';
import { Severity } from '@commitguard/shared';
import { EngineResult } from '@commitguard/core';

describe('GitHub Generators', () => {
  const dummyResult: EngineResult = {
    score: 80,
    status: Severity.WARNING,
    results: [
      {
        status: Severity.WARNING,
        severity: Severity.WARNING,
        scoreImpact: 20,
        message: 'Something is wrong',
        remediation: 'Fix it',
        documentationLink: ''
      }
    ]
  };

  it('PRSummaryGenerator should create markdown', () => {
    const summary = PRSummaryGenerator.generate(dummyResult);
    expect(summary).toContain('CommitGuard Policy Report');
    expect(summary).toContain('80 / 100');
    expect(summary).toContain('Something is wrong');
  });

  it('AnnotationsGenerator should create annotations', () => {
    const annotations = AnnotationsGenerator.generate(dummyResult);
    expect(annotations.length).toBe(1);
    expect(annotations[0].annotation_level).toBe('warning');
    expect(annotations[0].title).toBe('CommitGuard: WARNING');
    expect(annotations[0].message).toContain('Something is wrong');
  });
});
