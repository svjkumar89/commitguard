export enum Severity {
  PASS = 'PASS',
  WARNING = 'WARNING',
  BLOCK = 'BLOCK'
}

export interface Violation {
  file: string;
  line: number;
  match: string;
  rule: string;
}

export interface ValidationContext {
  cwd: string;
  files: string[];
  branch: string;
  isCI: boolean;
}

export interface ValidationResult {
  status: Severity;
  severity: Severity;
  scoreImpact: number;
  message: string;
  remediation: string;
  documentationLink: string;
  validatorName?: string;
  violations?: Violation[];
}

export interface Validator {
  name: string;
  run(context: ValidationContext): Promise<ValidationResult>;
}
