import { describe, it, expect, vi } from 'vitest';
import { GitOperations } from '../src/operations.js';

vi.mock('simple-git', () => {
  return {
    simpleGit: vi.fn(() => ({
      branch: vi.fn().mockResolvedValue({ current: 'feature/test-branch' }),
      status: vi.fn().mockResolvedValue({ staged: ['file1.ts'], deleted: ['file2.ts'] }),
      log: vi.fn().mockResolvedValue({ all: [{ date: new Date().toISOString() }], total: 2 }),
      fetch: vi.fn().mockResolvedValue(undefined),
      diff: vi.fn().mockResolvedValue('10\t5\tfile1.ts'),
      raw: vi.fn().mockResolvedValue('<<<<<<< HEAD\nfoo\n=======\nbar\n>>>>>>> feature')
    }))
  };
});

describe('GitOperations', () => {
  it('should get current branch', async () => {
    const gitOps = new GitOperations('/test/dir');
    const branch = await gitOps.getCurrentBranch();
    expect(branch).toBe('feature/test-branch');
  });

  it('should get staged files', async () => {
    const gitOps = new GitOperations('/test/dir');
    const files = await gitOps.getStagedFiles();
    expect(files).toEqual(['file1.ts']);
  });

  it('should get deleted files', async () => {
    const gitOps = new GitOperations('/test/dir');
    const files = await gitOps.getDeletedFiles();
    expect(files).toEqual(['file2.ts']);
  });

  it('should get diff lines count', async () => {
    const gitOps = new GitOperations('/test/dir');
    const count = await gitOps.getDiffLinesCount('file1.ts');
    expect(count).toEqual({ added: 10, deleted: 5 });
  });

  it('should check merge conflict', async () => {
    const gitOps = new GitOperations('/test/dir');
    const conflict = await gitOps.checkMergeConflictWithTarget('main');
    expect(conflict).toBe(true);
  });
});
