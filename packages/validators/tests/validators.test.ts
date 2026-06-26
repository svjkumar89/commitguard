import { describe, it, expect, vi } from 'vitest';
import { BranchNamingValidator } from '../src/branchNaming.js';
import { ProtectedBranchesValidator } from '../src/protectedBranches.js';
import { Severity, ValidationContext } from '@commitguard/shared';
import { CommitGuardConfig } from '@commitguard/config';

const mockConfig: CommitGuardConfig = {
  validators: {} as any,
  rules: {
    maxBranchAgeDays: 30,
    protectedBranchesList: ['main', 'master', 'production'],
    allowedBinaryExtensions: ['.png'],
    maxDeletionLines: 500,
    maxDeletedFiles: 5,
    allowedBranchPrefixes: ['feature', 'bugfix', 'hotfix', 'release', 'chore', 'fix', 'docs'],
    scanDepth: 50,
  }
};

describe('Validators', () => {
  const dummyContext: ValidationContext = {
    cwd: '/test',
    files: [],
    branch: 'main',
    isCI: false
  };

  it('BranchNaming should pass main', async () => {
    const val = new BranchNamingValidator(mockConfig);
    const res = await val.run(dummyContext);
    expect(res.status).toBe(Severity.PASS);
  });

  it('BranchNaming should block arbitrary branch name', async () => {
    const val = new BranchNamingValidator(mockConfig);
    const res = await val.run({ ...dummyContext, branch: 'foo-bar' });
    expect(res.status).toBe(Severity.BLOCK);
  });

  it('BranchNaming should pass valid feature branch', async () => {
    const val = new BranchNamingValidator(mockConfig);
    const res = await val.run({ ...dummyContext, branch: 'feature/foo-bar' });
    expect(res.status).toBe(Severity.PASS);
  });

  it('BranchNaming should pass custom regex pattern', async () => {
    const customConfig = { ...mockConfig, rules: { ...mockConfig.rules, branchNamingPattern: '^jira/[A-Z]+-\\d+$' } };
    const val = new BranchNamingValidator(customConfig);
    expect((await val.run({ ...dummyContext, branch: 'jira/PROJ-123' })).status).toBe(Severity.PASS);
    expect((await val.run({ ...dummyContext, branch: 'feature/foo' })).status).toBe(Severity.BLOCK);
  });

  it('ProtectedBranches should block main', async () => {
    const val = new ProtectedBranchesValidator(mockConfig);
    const res = await val.run(dummyContext);
    expect(res.status).toBe(Severity.BLOCK);
  });

  it('ProtectedBranches should pass feature branch', async () => {
    const val = new ProtectedBranchesValidator(mockConfig);
    const res = await val.run({ ...dummyContext, branch: 'feature/my-feature' });
    expect(res.status).toBe(Severity.PASS);
  });
});
