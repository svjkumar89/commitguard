import fs from 'node:fs/promises';
import path from 'node:path';

export class GitHubActionGenerator {
  static async generate(cwd: string): Promise<void> {
    const dir = path.join(cwd, '.github', 'workflows');
    await fs.mkdir(dir, { recursive: true });

    const content = `name: CommitGuard

on:
  pull_request:
    branches: [main, master, production]
  push:
    branches: [main, master]

jobs:
  commitguard:
    name: CommitGuard Policy Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: actions/setup-node@v4
        with:
          node-version: '22'

      - name: Install CommitGuard
        run: npm install -g commitguard

      - name: Run CommitGuard
        run: commitguard validate --ci
`;

    await fs.writeFile(path.join(dir, 'commitguard.yml'), content);
  }
}
