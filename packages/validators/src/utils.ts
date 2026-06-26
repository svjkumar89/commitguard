import { ValidationResult, Severity, Violation } from '@commitguard/shared';

export function createPassResult(message: string = 'Validation passed.'): ValidationResult {
  return {
    status: Severity.PASS,
    severity: Severity.PASS,
    scoreImpact: 0,
    message,
    remediation: '',
    documentationLink: ''
  };
}

export function createWarningResult(
  message: string,
  remediation: string,
  impact: number = 10,
  violations?: Violation[]
): ValidationResult {
  return {
    status: Severity.WARNING,
    severity: Severity.WARNING,
    scoreImpact: impact,
    message,
    remediation,
    documentationLink: 'https://github.com/svjkumar89/commitguard/blob/main/docs/warnings.md',
    violations
  };
}

export function createBlockResult(
  message: string,
  remediation: string,
  impact: number = 50,
  violations?: Violation[]
): ValidationResult {
  return {
    status: Severity.BLOCK,
    severity: Severity.BLOCK,
    scoreImpact: impact,
    message,
    remediation,
    documentationLink: 'https://github.com/svjkumar89/commitguard/blob/main/docs/blocks.md',
    violations
  };
}
