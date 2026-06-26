import { 
  INITIAL_RISK_SCORE, 
  ValidationContext, 
  ValidationResult, 
  Validator, 
  Severity 
} from '@commitguard/shared';

export interface EngineResult {
  score: number;
  status: Severity;
  results: ValidationResult[];
}

export class RiskEngine {
  private validators: Validator[] = [];

  register(validator: Validator): void {
    this.validators.push(validator);
  }

  registerMany(validators: Validator[]): void {
    this.validators.push(...validators);
  }

  async run(context: ValidationContext): Promise<EngineResult> {
    const results: ValidationResult[] = [];
    let score = INITIAL_RISK_SCORE;
    let globalStatus = Severity.PASS;

    const runPromises = this.validators.map(async (validator) => {
      try {
        const result = await validator.run(context);
        return { ...result, validatorName: validator.name };
      } catch (error: any) {
        return {
          status: Severity.WARNING,
          severity: Severity.WARNING,
          scoreImpact: 0,
          message: `Validator "${validator.name}" crashed: ${error.message}`,
          remediation: 'Check validator configuration or report at github.com/svjkumar89/commitguard/issues.',
          documentationLink: '',
          validatorName: validator.name
        };
      }
    });

    const completedResults = await Promise.all(runPromises);

    for (const result of completedResults) {
      results.push(result);
      score -= result.scoreImpact;

      if (result.status === Severity.BLOCK) {
        globalStatus = Severity.BLOCK;
      } else if (result.status === Severity.WARNING && globalStatus !== Severity.BLOCK) {
        globalStatus = Severity.WARNING;
      }
    }

    // Ensure score doesn't drop below 0
    score = Math.max(0, score);

    // If score drops to 0, automatically block
    if (score === 0) {
      globalStatus = Severity.BLOCK;
    }

    return {
      score,
      status: globalStatus,
      results
    };
  }
}
