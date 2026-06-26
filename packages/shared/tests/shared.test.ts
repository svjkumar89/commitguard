import { describe, it, expect } from 'vitest';
import { Severity, INITIAL_RISK_SCORE } from '../src/index.js';

describe('Shared', () => {
  it('should have the correct severities', () => {
    expect(Severity.PASS).toBe('PASS');
    expect(Severity.WARNING).toBe('WARNING');
    expect(Severity.BLOCK).toBe('BLOCK');
  });

  it('should have the initial risk score of 100', () => {
    expect(INITIAL_RISK_SCORE).toBe(100);
  });
});
