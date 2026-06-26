import { Severity } from '@commitguard/shared';
import { EngineResult } from '@commitguard/core';
import pc from 'picocolors';
import Table from 'cli-table3';

export class CliReporter {
  report(result: EngineResult): string {
    let output = '\n';

    output += pc.cyan(pc.bold('  CommitGuard') + pc.dim(' — Enterprise Git Policy Engine\n'));
    output += pc.dim('  github.com/svjkumar89/commitguard\n\n');

    const statusColor = this.getStatusColor(result.status);
    const statusIcon = result.status === Severity.BLOCK ? '🚫' : result.status === Severity.WARNING ? '⚠️ ' : '✅';
    output += `  ${statusIcon}  Status : ${statusColor(pc.bold(result.status))}\n`;
    output += `  📊  Score  : ${this.getScoreColor(result.score)(pc.bold(`${result.score} / 100`))}\n\n`;

    const violations = result.results.filter(r => r.status !== Severity.PASS);

    if (violations.length === 0) {
      output += pc.green('  ✅ All checks passed — clean commit!\n');
    } else {
      const table = new Table({
        head: [pc.bold('Severity'), pc.bold('Validator'), pc.bold('Details'), pc.bold('Fix')],
        colWidths: [10, 22, 50, 36],
        wordWrap: true,
        style: { head: [], border: [] }
      });

      for (const res of violations) {
        const icon = res.status === Severity.BLOCK ? pc.red('BLOCK') : pc.yellow('WARN ');
        const name = pc.cyan(res.validatorName ?? 'Unknown');

        let details = res.message;
        if (res.violations && res.violations.length > 0) {
          const top = res.violations
            .slice(0, 3)
            .map(v => `${pc.dim(v.file)}:${pc.yellow(String(v.line))} ${v.match}`)
            .join('\n');
          const extra = res.violations.length > 3
            ? `\n${pc.dim(`+${res.violations.length - 3} more`)}`
            : '';
          details = top + extra;
        }

        table.push([icon, name, details, pc.dim(res.remediation)]);
      }

      output += table.toString() + '\n';
    }

    output += '\n';
    return output;
  }

  private getStatusColor(status: Severity) {
    switch (status) {
      case Severity.PASS:    return pc.green;
      case Severity.WARNING: return pc.yellow;
      case Severity.BLOCK:   return pc.red;
    }
  }

  private getScoreColor(score: number) {
    if (score >= 80) return pc.green;
    if (score >= 50) return pc.yellow;
    return pc.red;
  }
}
