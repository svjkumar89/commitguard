import fs from 'node:fs/promises';
import path from 'node:path';
import { execa } from 'execa';

export class GitHookInstaller {
  private baseDir: string;
  private hooksDir: string;

  constructor(baseDir: string) {
    this.baseDir = baseDir;
    this.hooksDir = path.join(this.baseDir, '.commitguard', 'hooks');
  }

  async install(): Promise<void> {
    await fs.mkdir(this.hooksDir, { recursive: true });

    const preCommitScript = `#!/bin/sh
# CommitGuard pre-commit hook â€” https://github.com/svjkumar89/commitguard
npx commitguard validate
`;
    await this.writeHook('pre-commit', preCommitScript);

    const prePushScript = `#!/bin/sh
# CommitGuard pre-push hook â€” https://github.com/svjkumar89/commitguard
npx commitguard validate
`;
    await this.writeHook('pre-push', prePushScript);

    const commitMsgScript = `#!/bin/sh
# CommitGuard commit-msg hook â€” https://github.com/svjkumar89/commitguard
npx commitguard validate --commit-msg "$1"
`;
    await this.writeHook('commit-msg', commitMsgScript);

    await execa('git', ['config', 'core.hooksPath', '.commitguard/hooks'], { cwd: this.baseDir });
  }

  private async writeHook(hookName: string, script: string): Promise<void> {
    const hookPath = path.join(this.hooksDir, hookName);
    await fs.writeFile(hookPath, script, { mode: 0o755 });
  }
}
