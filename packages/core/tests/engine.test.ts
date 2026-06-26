import { describe, it, expect } from 'vitest';
import { RiskEngine } from '../src/engine.js';
import { Validator, Severity, ValidationContext } from '@commitguard/shared';

describe('RiskEngine', () => {
  const dummyContext: ValidationContext = {
    cwd: '/test',
    files: [],
    branch: 'main',
    isCI: false
  };

  it('should run multiple validators and calculate score', async () => {
    const engine = new RiskEngine();
    
    const passValidator: Validator = {
      name: 'PassRule',
      run: async () => ({
        status: Severity.PASS,
        severity: Severity.PASS,
        scoreImpact: 0,
        message: 'All good',
        remediation: '',
        documentationLink: ''
      })
    };

    const warnValidator: Validator = {
      name: 'WarnRule',
      run: async () => ({
        status: Severity.WARNING,
        severity: Severity.WARNING,
        scoreImpact: 10,
        message: 'Warning!',
        remediation: '',
        documentationLink: ''
      })
    };

    engine.registerMany([passValidator, warnValidator]);

    const result = await engine.run(dummyContext);

    expect(result.score).toBe(90);
    expect(result.status).toBe(Severity.WARNING);
    expect(result.results.length).toBe(2);
  });

  it('should return block status if a validator blocks', async () => {
    const engine = new RiskEngine();
    
    const blockValidator: Validator = {
      name: 'BlockRule',
      run: async () => ({
        status: Severity.BLOCK,
        severity: Severity.BLOCK,
        scoreImpact: 50,
        message: 'Blocked!',
        remediation: '',
        documentationLink: ''
      })
    };

    engine.register(blockValidator);

    const result = await engine.run(dummyContext);

    expect(result.score).toBe(50);
    expect(result.status).toBe(Severity.BLOCK);
  });

  it('should not let score drop below 0', async () => {
    const engine = new RiskEngine();
    
    const harshValidator: Validator = {
      name: 'HarshRule',
      run: async () => ({
        status: Severity.BLOCK,
        severity: Severity.BLOCK,
        scoreImpact: 150,
        message: 'Blocked hard!',
        remediation: '',
        documentationLink: ''
      })
    };

    engine.register(harshValidator);

    const result = await engine.run(dummyContext);

    expect(result.score).toBe(0);
    expect(result.status).toBe(Severity.BLOCK);
  });
});
