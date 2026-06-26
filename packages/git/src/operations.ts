import { simpleGit, SimpleGit, SimpleGitOptions } from 'simple-git';

export class GitOperations {
  private git: SimpleGit;

  constructor(baseDir: string) {
    const options: Partial<SimpleGitOptions> = {
      baseDir,
      binary: 'git',
      maxConcurrentProcesses: 6,
    };
    this.git = simpleGit(options);
  }

  async getCurrentBranch(): Promise<string> {
    try {
      const branch = await this.git.branch();
      return branch.current;
    } catch {
      return '';
    }
  }

  async getBranchAgeDays(branchName: string): Promise<number> {
    try {
      // Get the timestamp of the first commit of the branch
      const log = await this.git.log({ 'max-count': 1, '--reverse': null, [branchName]: null });
      if (log.all.length === 0) return 0;
      
      const commitDate = new Date(log.all[0].date);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - commitDate.getTime());
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    } catch {
      return 0;
    }
  }

  async getCommitsBehindRemote(branchName: string, remote: string = 'origin'): Promise<number> {
    try {
      await this.git.fetch(remote);
      const log = await this.git.log({ from: branchName, to: `${remote}/${branchName}` });
      return log.total;
    } catch {
      return 0; // If remote branch doesn't exist, it's not behind
    }
  }

  async getStagedFiles(): Promise<string[]> {
    try {
      const status = await this.git.status();
      return status.staged;
    } catch {
      return [];
    }
  }

  async getDeletedFiles(): Promise<string[]> {
    try {
      const status = await this.git.status();
      return status.deleted;
    } catch {
      return [];
    }
  }

  async getDiffLinesCount(file: string): Promise<{ added: number; deleted: number }> {
    try {
      const diff = await this.git.diff(['--numstat', '--cached', file]);
      const match = diff.match(/(\d+)\s+(\d+)/);
      if (match) {
        return { added: parseInt(match[1], 10), deleted: parseInt(match[2], 10) };
      }
      return { added: 0, deleted: 0 };
    } catch {
      return { added: 0, deleted: 0 };
    }
  }

  async checkMergeConflictWithTarget(targetBranch: string): Promise<boolean> {
    try {
      const result = await this.git.raw(['merge-tree', targetBranch, 'HEAD']);
      return result.includes('<<<<<<<'); // Very basic check, standard git merge-tree format
    } catch {
      return false;
    }
  }
}
