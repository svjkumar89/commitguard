import { describe, it, expect, vi } from 'vitest';
import { BranchAgeValidator } from '../src/branchAge.js';
import { BranchBehindRemoteValidator } from '../src/branchBehindRemote.js';
import { MergeMarkersValidator } from '../src/mergeMarkers.js';
import { SecretsValidator } from '../src/secrets.js';
import { BinaryFilesValidator } from '../src/binaryFiles.js';
import { GeneratedFilesValidator } from '../src/generatedFiles.js';
import { LargeDeletionsValidator } from '../src/largeDeletions.js';
import { DeletedFilesValidator } from '../src/deletedFiles.js';
import { OwnershipDetectionValidator } from '../src/ownershipDetection.js';
import { MergeConflictPredictionValidator } from '../src/mergeConflictPrediction.js';
import { SqlSafetyValidator } from '../src/sqlSafety.js';
import { CommitMessageValidator } from '../src/commitMessage.js';
import { BuildVerificationValidator } from '../src/buildVerification.js';
import { TestVerificationValidator } from '../src/testVerification.js';

import { Severity, ValidationContext } from '@commitguard/shared';
import { CommitGuardConfig } from '@commitguard/config';
import fs from 'node:fs/promises';

// Mock execa explicitly for CI tests
vi.mock('execa', () => ({
  execa: vi.fn().mockImplementation((cmd, args) => {
    if (args.includes('fail')) return Promise.reject(new Error('Failed'));
    return Promise.resolve();
  })
}));

// Mock git operations module
vi.mock('@commitguard/git', () => ({
  GitOperations: vi.fn().mockImplementation(() => ({
    getBranchAgeDays: vi.fn().mockImplementation(branch => branch === 'old' ? 40 : 10),
    getCommitsBehindRemote: vi.fn().mockImplementation(branch => branch === 'behind' ? 20 : 0),
    getDiffLinesCount: vi.fn().mockImplementation(file => file === 'big.ts' ? { added: 0, deleted: 1000 } : { added: 0, deleted: 10 }),
    getDeletedFiles: vi.fn().mockReturnValue(new Array(10).fill('del.ts')),
    checkMergeConflictWithTarget: vi.fn().mockImplementation(() => Promise.resolve(false))
  }))
}));

const mockConfig = {
  validators: {} as any,
  rules: {
    maxBranchAgeDays: 30,
    protectedBranchesList: ['main'],
    allowedBinaryExtensions: ['.png'],
    maxDeletionLines: 500,
    maxDeletedFiles: 5,
    allowedBranchPrefixes: ['feature', 'bugfix', 'hotfix', 'release', 'chore', 'fix', 'docs'],
    scanDepth: 50,
  }
};

describe('Additional Validators', () => {
  const dummyContext: ValidationContext = {
    cwd: '/test',
    files: [],
    branch: 'main',
    isCI: false
  };

  it('BranchAgeValidator should warn if too old', async () => {
    const val = new BranchAgeValidator(mockConfig);
    const res = await val.run({ ...dummyContext, branch: 'old' });
    expect(res.status).toBe(Severity.WARNING);
  });

  it('BranchBehindRemoteValidator should warn if too far behind', async () => {
    const val = new BranchBehindRemoteValidator();
    const res = await val.run({ ...dummyContext, branch: 'behind' });
    expect(res.status).toBe(Severity.WARNING);
  });

  it('MergeMarkersValidator should block if file has markers', async () => {
    vi.spyOn(fs, 'readFile').mockResolvedValueOnce('some text\n<<<<<<< HEAD\nnew\n=======\nold\n>>>>>>> branch');
    const val = new MergeMarkersValidator();
    const res = await val.run({ ...dummyContext, files: ['test.ts'] });
    expect(res.status).toBe(Severity.BLOCK);
  });

  it('SecretsValidator should block on AWS access key', async () => {
    vi.spyOn(fs, 'readFile')
      .mockRejectedValueOnce(new Error('not found'))  // .commitguardignore
      .mockResolvedValueOnce('const key = "AKIAIOSFODNN7EXAMPLE";' as any);
    const val = new SecretsValidator();
    const res = await val.run({ ...dummyContext, files: ['test.ts'] });
    expect(res.status).toBe(Severity.BLOCK);
  });

  it('SecretsValidator should block on GitHub PAT', async () => {
    vi.spyOn(fs, 'readFile')
      .mockRejectedValueOnce(new Error('not found'))  // .commitguardignore
      .mockResolvedValueOnce('const token = "ghp_abcdefghijklmnopqrstuvwxyz1234567890";' as any);
    const val = new SecretsValidator();
    const res = await val.run({ ...dummyContext, files: ['config.ts'] });
    expect(res.status).toBe(Severity.BLOCK);
  });

  it('SecretsValidator should pass when line has commitguard:ignore', async () => {
    vi.spyOn(fs, 'readFile')
      .mockRejectedValueOnce(new Error('not found'))  // .commitguardignore
      .mockResolvedValueOnce('const key = "AKIAIOSFODNN7EXAMPLE"; // commitguard:ignore' as any);
    const val = new SecretsValidator();
    const res = await val.run({ ...dummyContext, files: ['test.ts'] });
    expect(res.status).toBe(Severity.PASS);
  });

  it('BinaryFilesValidator should warn on unallowed binary', async () => {
    const val = new BinaryFilesValidator(mockConfig);
    const res = await val.run({ ...dummyContext, files: ['test.exe'] });
    expect(res.status).toBe(Severity.WARNING);
  });

  it('GeneratedFilesValidator should warn on dist', async () => {
    const val = new GeneratedFilesValidator();
    const res = await val.run({ ...dummyContext, files: ['dist/bundle.js'] });
    expect(res.status).toBe(Severity.WARNING);
  });

  it('LargeDeletionsValidator should warn on big deletion', async () => {
    const val = new LargeDeletionsValidator(mockConfig);
    const res = await val.run({ ...dummyContext, files: ['big.ts'] });
    expect(res.status).toBe(Severity.WARNING);
  });

  it('DeletedFilesValidator should warn on many deletions', async () => {
    const val = new DeletedFilesValidator();
    // We mocked getDeletedFiles to return 10 files
    const res = await val.run(dummyContext);
    expect(res.status).toBe(Severity.WARNING);
  });

  it('OwnershipDetectionValidator should warn if no CODEOWNERS', async () => {
    vi.spyOn(fs, 'readFile').mockRejectedValueOnce(new Error('enoent'));
    const val = new OwnershipDetectionValidator();
    const res = await val.run(dummyContext);
    expect(res.status).toBe(Severity.WARNING);
  });

  it('SqlSafetyValidator should block DROP TABLE in .sql file', async () => {
    vi.spyOn(fs, 'readFile').mockResolvedValueOnce('DROP TABLE users;');
    const val = new SqlSafetyValidator();
    const res = await val.run({ ...dummyContext, files: ['query.sql'] });
    expect(res.status).toBe(Severity.BLOCK);
  });

  it('SqlSafetyValidator should block DELETE without WHERE in .ts file', async () => {
    vi.spyOn(fs, 'readFile').mockResolvedValueOnce('const q = `DELETE FROM sessions`;');
    const val = new SqlSafetyValidator();
    const res = await val.run({ ...dummyContext, files: ['repo.ts'] });
    expect(res.status).toBe(Severity.BLOCK);
  });

  it('CommitMessageValidator should block invalid format', async () => {
    vi.spyOn(fs, 'readFile').mockResolvedValueOnce('bad message');
    const val = new CommitMessageValidator('/test/msg');
    const res = await val.run(dummyContext);
    expect(res.status).toBe(Severity.BLOCK);
  });

  it('BuildVerificationValidator should run in CI', async () => {
    const val = new BuildVerificationValidator();
    const res = await val.run({ ...dummyContext, isCI: true });
    expect(res.status).toBe(Severity.PASS);
  });
  
  it('TestVerificationValidator should run in CI', async () => {
    const val = new TestVerificationValidator();
    const res = await val.run({ ...dummyContext, isCI: true });
    expect(res.status).toBe(Severity.PASS);
  });
});
