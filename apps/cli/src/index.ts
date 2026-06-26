#!/usr/bin/env node
import { Command } from 'commander';
import { ConfigLoader } from '@commitguard/config';
import { GitHookInstaller, GitOperations } from '@commitguard/git';
import { RiskEngine } from '@commitguard/core';
import { getValidators, SecretsValidator, SqlSafetyValidator } from '@commitguard/validators';
import { CliReporter, JsonReporter } from '@commitguard/reporters';
import { PRSummaryGenerator, GitHubActionGenerator } from '@commitguard/github';
import { ValidationContext, Severity } from '@commitguard/shared';
import { execa } from 'execa';
import fs from 'node:fs/promises';
import path from 'node:path';
import pc from 'picocolors';

const program = new Command();
program
  .name('commitguard')
  .description('Enterprise-grade Git policy engine — secrets detection, branch policies, SQL safety, and CI integration')
  .version('1.0.0');

async function runEngine(options: { ci?: boolean; format?: string; commitMsg?: string }) {
  const cwd = process.cwd();
  const config = await ConfigLoader.load(cwd);
  const git = new GitOperations(cwd);

  const context: ValidationContext = {
    cwd,
    files: await git.getStagedFiles(),
    branch: await git.getCurrentBranch(),
    isCI: !!options.ci,
  };

  const engine = new RiskEngine();
  engine.registerMany(getValidators(config, options.commitMsg));

  const result = await engine.run(context);

  if (options.format === 'json') {
    console.log(new JsonReporter().report(result));
  } else {
    console.log(new CliReporter().report(result));
  }

  if (options.ci && process.env.GITHUB_STEP_SUMMARY) {
    await fs.appendFile(process.env.GITHUB_STEP_SUMMARY, PRSummaryGenerator.generate(result));
  }

  if (result.status === Severity.BLOCK) process.exit(1);
}

// ── install ───────────────────────────────────────────────────────────────────
program
  .command('install')
  .description('Install CommitGuard git hooks into this repository')
  .action(async () => {
    try {
      const installer = new GitHookInstaller(process.cwd());
      await installer.install();
      console.log(pc.green('✅ CommitGuard hooks installed successfully.'));
      console.log(pc.dim('   Hooks: pre-commit, pre-push, commit-msg'));
      console.log(pc.dim('   Location: .commitguard/hooks/'));
    } catch (error: any) {
      console.error(pc.red(`❌ Installation failed: ${error.message}`));
      process.exit(1);
    }
  });

// ── validate ──────────────────────────────────────────────────────────────────
program
  .command('validate')
  .description('Run all validators against staged files and current branch')
  .option('--ci', 'Run in CI mode (enables build/test validators)')
  .option('--format <format>', 'Output format: cli | json', 'cli')
  .option('--commit-msg <file>', 'Path to commit message file (set by git)')
  .action(async (options) => {
    await runEngine(options);
  });

// ── scan ──────────────────────────────────────────────────────────────────────
program
  .command('scan')
  .description('Scan git history for secrets and dangerous SQL in past commits')
  .option('--depth <n>', 'Number of commits to scan', '50')
  .option('--format <format>', 'Output format: cli | json', 'cli')
  .action(async (options) => {
    const cwd = process.cwd();
    const depth = parseInt(options.depth, 10);
    console.log(pc.cyan(pc.bold(`\n🔍 CommitGuard Historical Scan — last ${depth} commits\n`)));

    let log: string;
    try {
      const result = await execa('git', ['log', `--max-count=${depth}`, '--pretty=format:%H|%an|%ae|%s', '--no-merges'], { cwd });
      log = result.stdout;
    } catch {
      console.error(pc.red('❌ Could not read git log. Are you inside a git repository?'));
      process.exit(1);
    }

    if (!log.trim()) {
      console.log(pc.yellow('No commits found.'));
      return;
    }

    const commits = log.trim().split('\n').map(line => {
      const [sha, author, email, ...msgParts] = line.split('|');
      return { sha, author, email, message: msgParts.join('|') };
    });

    const config = await ConfigLoader.load(cwd);
    const secretsValidator = new SecretsValidator();
    const sqlValidator = new SqlSafetyValidator();

    let totalViolations = 0;
    const findings: Array<{ sha: string; author: string; message: string; type: string; details: string }> = [];

    for (const commit of commits) {
      let diff: string;
      try {
        const r = await execa('git', ['diff-tree', '--no-commit-id', '-r', '--name-only', commit.sha], { cwd });
        diff = r.stdout;
      } catch {
        continue;
      }

      const files = diff.trim().split('\n').filter(Boolean);
      if (files.length === 0) continue;

      const context: ValidationContext = { cwd, files, branch: 'HEAD', isCI: false };

      const [secretsResult, sqlResult] = await Promise.all([
        secretsValidator.run(context),
        sqlValidator.run(context),
      ]);

      for (const res of [secretsResult, sqlResult]) {
        if (res.status === Severity.BLOCK && res.violations) {
          totalViolations += res.violations.length;
          findings.push({
            sha: commit.sha.slice(0, 8),
            author: commit.author,
            message: commit.message.slice(0, 60),
            type: res.validatorName ?? 'Unknown',
            details: res.violations.slice(0, 2).map(v => `${v.file}:${v.line} — ${v.match}`).join(', '),
          });
        }
      }
    }

    if (findings.length === 0) {
      console.log(pc.green(`✅ Scanned ${commits.length} commits — no violations found.\n`));
      return;
    }

    console.log(pc.red(`🚫 Found ${totalViolations} violation(s) across ${findings.length} commit(s):\n`));
    for (const f of findings) {
      console.log(`  ${pc.yellow(f.sha)}  ${pc.dim(f.author)}  ${pc.bold(f.message)}`);
      console.log(`    ${pc.red(f.type)}: ${f.details}`);
      console.log();
    }

    process.exit(1);
  });

// ── doctor ────────────────────────────────────────────────────────────────────
program
  .command('doctor')
  .description('Diagnose CommitGuard setup: config, hooks, git, and node version')
  .action(async () => {
    console.log(pc.bold('\n🩺 CommitGuard Doctor\n'));
    const cwd = process.cwd();
    let issues = 0;

    // Node version
    const nodeVersion = process.version;
    const major = parseInt(nodeVersion.slice(1));
    if (major >= 18) {
      console.log(pc.green(`  ✅ Node.js ${nodeVersion} (>=18 required)`));
    } else {
      console.log(pc.red(`  ❌ Node.js ${nodeVersion} is too old — upgrade to >=18`));
      issues++;
    }

    // Git available
    try {
      const { stdout } = await execa('git', ['--version'], { cwd });
      console.log(pc.green(`  ✅ ${stdout.trim()}`));
    } catch {
      console.log(pc.red('  ❌ git not found in PATH'));
      issues++;
    }

    // Inside a git repo
    try {
      await execa('git', ['rev-parse', '--git-dir'], { cwd });
      console.log(pc.green('  ✅ Inside a git repository'));
    } catch {
      console.log(pc.red('  ❌ Not inside a git repository'));
      issues++;
    }

    // Config file
    try {
      const config = await ConfigLoader.load(cwd);
      console.log(pc.green('  ✅ Config file found and valid'));
    } catch (e: any) {
      console.log(pc.yellow(`  ⚠️  No config file found — using defaults (run \`commitguard init\` to create one)`));
    }

    // Hooks directory
    const hooksDir = path.join(cwd, '.commitguard', 'hooks');
    try {
      await fs.access(hooksDir);
      const hooks = await fs.readdir(hooksDir);
      const expected = ['pre-commit', 'pre-push', 'commit-msg'];
      const missing = expected.filter(h => !hooks.includes(h));
      if (missing.length === 0) {
        console.log(pc.green(`  ✅ Git hooks installed (${hooks.join(', ')})`));
      } else {
        console.log(pc.yellow(`  ⚠️  Missing hooks: ${missing.join(', ')} — run \`commitguard install\``));
        issues++;
      }
    } catch {
      console.log(pc.yellow('  ⚠️  Hooks not installed — run `commitguard install`'));
      issues++;
    }

    // .commitguardignore (optional but useful)
    try {
      await fs.access(path.join(cwd, '.commitguardignore'));
      console.log(pc.green('  ✅ .commitguardignore found'));
    } catch {
      console.log(pc.dim('  ℹ️  No .commitguardignore file (optional — used to suppress false positives)'));
    }

    console.log();
    if (issues === 0) {
      console.log(pc.green('  ✅ Repository is healthy!\n'));
    } else {
      console.log(pc.yellow(`  ⚠️  Found ${issues} issue(s) — see above for fixes.\n`));
      process.exit(1);
    }
  });

// ── report ────────────────────────────────────────────────────────────────────
program
  .command('report')
  .description('Generate a full risk report for the current state')
  .option('--format <format>', 'Output format: cli | json', 'cli')
  .action(async (options) => {
    await runEngine(options);
  });

// ── status ────────────────────────────────────────────────────────────────────
program
  .command('status')
  .description('Print current risk score for staged changes')
  .action(async () => {
    const cwd = process.cwd();
    const config = await ConfigLoader.load(cwd);
    const git = new GitOperations(cwd);
    const engine = new RiskEngine();
    engine.registerMany(getValidators(config));

    const result = await engine.run({
      cwd,
      files: await git.getStagedFiles(),
      branch: await git.getCurrentBranch(),
      isCI: false
    });

    const scoreColor = result.score >= 80 ? pc.green : result.score >= 50 ? pc.yellow : pc.red;
    console.log(`\n  Risk Score : ${scoreColor(pc.bold(`${result.score} / 100`))}`);
    console.log(`  Status     : ${result.status === Severity.BLOCK ? pc.red(result.status) : result.status === Severity.WARNING ? pc.yellow(result.status) : pc.green(result.status)}\n`);
  });

// ── init ──────────────────────────────────────────────────────────────────────
program
  .command('init')
  .description('Initialize CommitGuard config, GitHub Actions workflow, and git hooks')
  .action(async () => {
    const cwd = process.cwd();
    console.log(pc.cyan(pc.bold('\n🚀 Initializing CommitGuard...\n')));

    const configPath = path.join(cwd, '.commitguard.yml');
    const defaultConfig = `# CommitGuard Configuration
# Docs: https://github.com/svjkumar89/commitguard

validators:
  branchNaming: true
  protectedBranches: true
  mergeMarkers: true
  secrets: true
  sqlSafety: true
  commitMessage: true
  largeDeletions: true
  binaryFiles: true
  generatedFiles: true
  ownershipDetection: true

rules:
  maxBranchAgeDays: 30
  protectedBranchesList:
    - main
    - master
    - production
  allowedBranchPrefixes:
    - feature
    - bugfix
    - hotfix
    - release
    - chore
    - fix
    - docs
  maxDeletionLines: 500
  scanDepth: 50
`;
    await fs.writeFile(configPath, defaultConfig);
    console.log(pc.green(`  ✅ Created .commitguard.yml`));

    await GitHubActionGenerator.generate(cwd);
    console.log(pc.green('  ✅ Generated .github/workflows/commitguard.yml'));

    const installer = new GitHookInstaller(cwd);
    await installer.install();
    console.log(pc.green('  ✅ Installed git hooks (.commitguard/hooks/)'));

    console.log(pc.green(pc.bold('\n  CommitGuard is ready! Every commit is now protected.\n')));
    console.log(pc.dim('  Next steps:'));
    console.log(pc.dim('    commitguard doctor   — verify setup'));
    console.log(pc.dim('    commitguard scan     — audit git history'));
    console.log(pc.dim('    commitguard validate — run all validators now\n'));
  });

// ── config ────────────────────────────────────────────────────────────────────
program
  .command('config')
  .description('Print the effective resolved configuration (with all defaults applied)')
  .action(async () => {
    const config = await ConfigLoader.load(process.cwd());
    console.log(JSON.stringify(config, null, 2));
  });

program.parse(process.argv);
