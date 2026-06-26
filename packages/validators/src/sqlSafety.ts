import { Validator, ValidationContext, Violation } from '@commitguard/shared';
import { createPassResult, createBlockResult } from './utils.js';
import fs from 'node:fs/promises';
import path from 'node:path';

interface SqlRule {
  id: string;
  name: string;
  pattern: RegExp;
}

const SQL_RULES: SqlRule[] = [
  { id: 'drop-table',          name: 'DROP TABLE',                    pattern: /\bDROP\s+TABLE\b/i },
  { id: 'drop-database',       name: 'DROP DATABASE',                 pattern: /\bDROP\s+DATABASE\b/i },
  { id: 'drop-schema',         name: 'DROP SCHEMA',                   pattern: /\bDROP\s+SCHEMA\b/i },
  { id: 'drop-index',          name: 'DROP INDEX',                    pattern: /\bDROP\s+INDEX\b/i },
  { id: 'drop-column',         name: 'ALTER TABLE DROP COLUMN',       pattern: /\bALTER\s+TABLE\b.+\bDROP\s+COLUMN\b/is },
  { id: 'truncate-table',      name: 'TRUNCATE TABLE',                pattern: /\bTRUNCATE\s+(?:TABLE\s+)?\w+/i },
  { id: 'delete-no-where',     name: 'DELETE without WHERE clause',   pattern: /\bDELETE\s+FROM\s+[\w."'`]+\s*(?:;|$)/im },
  { id: 'update-no-where',     name: 'UPDATE without WHERE clause',   pattern: /\bUPDATE\s+[\w."'`]+\s+SET\s+[^;]+?(?=;|$)(?![\s\S]*\bWHERE\b)/im },
  { id: 'disable-fk',          name: 'Disabling FK constraints',      pattern: /SET\s+FOREIGN_KEY_CHECKS\s*=\s*0|PRAGMA\s+foreign_keys\s*=\s*OFF|DISABLE\s+TRIGGER/i },
];

const SQL_EXTENSIONS = new Set([
  '.sql', '.pgsql', '.psql', '.mysql',
  '.ts', '.js', '.mjs', '.cjs',
  '.py', '.rb', '.go', '.java', '.cs', '.php', '.kt', '.scala', '.rs'
]);

export class SqlSafetyValidator implements Validator {
  name = 'SqlSafety';

  async run(context: ValidationContext) {
    const violations: Violation[] = [];

    for (const file of context.files) {
      if (!SQL_EXTENSIONS.has(path.extname(file).toLowerCase())) continue;

      let content: string;
      try {
        content = await fs.readFile(path.join(context.cwd, file), 'utf-8');
      } catch {
        continue;
      }

      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (/commitguard:ignore|nosec/i.test(line)) continue;

        for (const rule of SQL_RULES) {
          if (rule.pattern.test(line)) {
            violations.push({ file, line: i + 1, match: rule.name, rule: rule.id });
            break;
          }
        }
      }
    }

    if (violations.length > 0) {
      const preview = violations.slice(0, 5).map(v => `  ${v.file}:${v.line} — ${v.match}`).join('\n');
      const extra = violations.length > 5 ? `\n  ...and ${violations.length - 5} more` : '';
      return createBlockResult(
        `Dangerous SQL operations detected:\n${preview}${extra}`,
        'Avoid irreversible DDL/DML. Use reversible migrations, and always add WHERE clauses to DELETE/UPDATE statements.',
        50,
        violations
      );
    }

    return createPassResult('No dangerous SQL patterns detected.');
  }
}
