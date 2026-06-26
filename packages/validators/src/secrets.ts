import { Validator, ValidationContext, Violation } from '@commitguard/shared';
import { createPassResult, createBlockResult } from './utils.js';
import fs from 'node:fs/promises';
import path from 'node:path';

interface SecretRule {
  id: string;
  name: string;
  pattern: RegExp;
}

function shannonEntropy(str: string): number {
  const freq: Record<string, number> = {};
  for (const ch of str) freq[ch] = (freq[ch] ?? 0) + 1;
  let entropy = 0;
  for (const count of Object.values(freq)) {
    const p = count / str.length;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

const SECRET_RULES: SecretRule[] = [
  // AWS
  { id: 'aws-access-key',      name: 'AWS Access Key ID',              pattern: /\bAKIA[0-9A-Z]{16}\b/ },
  { id: 'aws-secret-key',      name: 'AWS Secret Access Key',          pattern: /aws[_\-\s]?secret[_\-\s]?access[_\-\s]?key[\s:=]+['"]?[A-Za-z0-9\/+=]{40}['"]?/i },
  { id: 'aws-session-token',   name: 'AWS Session Token',              pattern: /aws[_\-\s]?session[_\-\s]?token[\s:=]+['"]?[A-Za-z0-9\/+=]{100,}['"]?/i },

  // GitHub
  { id: 'github-pat-classic',  name: 'GitHub PAT (classic)',           pattern: /\bghp_[0-9a-zA-Z]{36}\b/ },
  { id: 'github-pat-fine',     name: 'GitHub Fine-grained PAT',       pattern: /\bgithub_pat_[0-9a-zA-Z_]{82}\b/ },
  { id: 'github-oauth',        name: 'GitHub OAuth Token',             pattern: /\bgho_[0-9a-zA-Z]{36}\b/ },
  { id: 'github-app-token',    name: 'GitHub App Token',               pattern: /\bghu_[0-9a-zA-Z]{36}\b/ },

  // Google
  { id: 'google-api-key',      name: 'Google API Key',                 pattern: /\bAIza[0-9A-Za-z\-_]{35}\b/ },
  { id: 'google-oauth',        name: 'Google OAuth Client ID',         pattern: /[0-9]+-[0-9a-z]+\.apps\.googleusercontent\.com/ },
  { id: 'gcp-service-account', name: 'GCP Service Account Key',        pattern: /"private_key_id"\s*:\s*"[a-f0-9]{40}"/ },

  // Stripe
  { id: 'stripe-secret',       name: 'Stripe Secret Key',              pattern: /\bsk_live_[0-9a-zA-Z]{24,}\b/ },
  { id: 'stripe-restricted',   name: 'Stripe Restricted Key',          pattern: /\brk_live_[0-9a-zA-Z]{24,}\b/ },
  { id: 'stripe-webhook',      name: 'Stripe Webhook Secret',          pattern: /\bwhsec_[0-9a-zA-Z]{32,}\b/ },

  // Slack
  { id: 'slack-bot-token',     name: 'Slack Bot Token',                pattern: /\bxoxb-[0-9]{10,13}-[0-9]{10,13}-[a-zA-Z0-9]{24}\b/ },
  { id: 'slack-user-token',    name: 'Slack User Token',               pattern: /\bxoxp-[0-9]+-[0-9]+-[0-9]+-[a-zA-Z0-9]+\b/ },
  { id: 'slack-webhook',       name: 'Slack Webhook URL',              pattern: /hooks\.slack\.com\/services\/T[A-Z0-9]+\/B[A-Z0-9]+\/[a-zA-Z0-9]+/ },

  // SendGrid / Twilio
  { id: 'sendgrid-key',        name: 'SendGrid API Key',               pattern: /\bSG\.[0-9A-Za-z\-_]{22}\.[0-9A-Za-z\-_]{43}\b/ },
  { id: 'twilio-sid',          name: 'Twilio Account SID',             pattern: /\bAC[a-f0-9]{32}\b/ },

  // npm
  { id: 'npm-token',           name: 'npm Access Token',               pattern: /\bnpm_[A-Za-z0-9]{36}\b/ },

  // Private Keys & Certificates
  { id: 'rsa-private-key',     name: 'RSA Private Key',                pattern: /-----BEGIN RSA PRIVATE KEY-----/ },
  { id: 'ec-private-key',      name: 'EC Private Key',                 pattern: /-----BEGIN EC PRIVATE KEY-----/ },
  { id: 'openssh-private-key', name: 'OpenSSH Private Key',            pattern: /-----BEGIN OPENSSH PRIVATE KEY-----/ },
  { id: 'pgp-private-key',     name: 'PGP Private Key',                pattern: /-----BEGIN PGP PRIVATE KEY BLOCK-----/ },
  { id: 'pkcs8-private-key',   name: 'PKCS#8 Private Key',             pattern: /-----BEGIN PRIVATE KEY-----/ },

  // JWT
  { id: 'jwt-token',           name: 'JSON Web Token',                 pattern: /\beyJ[A-Za-z0-9\-_=]{10,}\.[A-Za-z0-9\-_=]{10,}\.?[A-Za-z0-9\-_.+/=]*\b/ },

  // Database Connection Strings
  { id: 'postgres-url',        name: 'PostgreSQL Connection String',   pattern: /postgres(?:ql)?:\/\/[^:]+:[^@]+@[^\s'"]+/i },
  { id: 'mysql-url',           name: 'MySQL Connection String',        pattern: /mysql:\/\/[^:]+:[^@]+@[^\s'"]+/i },
  { id: 'mongodb-url',         name: 'MongoDB Connection String',      pattern: /mongodb(?:\+srv)?:\/\/[^:]+:[^@]+@[^\s'"]+/i },
  { id: 'redis-url',           name: 'Redis Connection String',        pattern: /redis:\/\/:[^@]+@[^\s'"]+/i },

  // Azure
  { id: 'azure-conn-string',   name: 'Azure Storage Connection String', pattern: /DefaultEndpointsProtocol=https;AccountName=[^;]+;AccountKey=[A-Za-z0-9\/+=]{60,};/ },
  { id: 'azure-sas-token',     name: 'Azure SAS Token',                pattern: /sv=\d{4}-\d{2}-\d{2}&s[a-z]=.*&sig=[A-Za-z0-9%]+/i },

  // DigitalOcean
  { id: 'digitalocean-token',  name: 'DigitalOcean PAT',               pattern: /\bdop_v1_[a-f0-9]{64}\b/ },

  // Discord / Telegram
  { id: 'discord-bot-token',   name: 'Discord Bot Token',              pattern: /\b[MN][A-Za-z0-9]{23}\.[A-Za-z0-9\-_]{6}\.[A-Za-z0-9\-_]{27}\b/ },
  { id: 'telegram-bot-token',  name: 'Telegram Bot Token',             pattern: /\b\d{8,10}:[A-Za-z0-9\-_]{35}\b/ },

  // Generic high-confidence
  { id: 'generic-api-key',     name: 'Generic API Key',                pattern: /(?:api[_\-]?key|api[_\-]?secret)[\s:=]+['"][a-zA-Z0-9_\-]{20,}['"]/i },
  { id: 'generic-secret',      name: 'Generic Secret / Password',      pattern: /(?:password|passwd|credentials?)[\s:=]+['"][^'"]{8,}['"]/i },
  { id: 'basic-auth-url',      name: 'Basic Auth in URL',              pattern: /https?:\/\/[^:]+:[^@]{4,}@[^\s'"]+/ },
  { id: 'bearer-token',        name: 'Hardcoded Bearer Token',         pattern: /Authorization:\s*Bearer\s+[A-Za-z0-9\-_.~+/]+=*/i },
  { id: 'env-secret',          name: '.env Secret Assignment',         pattern: /^(?:export\s+)?[A-Z_]{3,}(?:KEY|TOKEN|SECRET|PASSWORD|PASS|PWD)\s*=\s*.{8,}$/m },
];

const IGNORED_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp',
  '.woff', '.woff2', '.ttf', '.eot', '.zip', '.tar', '.gz',
  '.jar', '.war', '.lock', '.sum'
]);

const ENTROPY_THRESHOLD = 4.5;
const MIN_ENTROPY_LENGTH = 20;
const HIGH_ENTROPY_RE = /['"`]([A-Za-z0-9\/+=_\-]{20,})['"`]/g;

async function loadIgnorePatterns(cwd: string): Promise<RegExp[]> {
  try {
    const content = await fs.readFile(path.join(cwd, '.commitguardignore'), 'utf-8');
    return content
      .split('\n')
      .map(l => l.trim())
      .filter(l => l && !l.startsWith('#'))
      .map(l => new RegExp(l.replace(/\./g, '\\.').replace(/\*/g, '.*')));
  } catch {
    return [];
  }
}

export class SecretsValidator implements Validator {
  name = 'Secrets';

  async run(context: ValidationContext) {
    const ignorePatterns = await loadIgnorePatterns(context.cwd);
    const violations: Violation[] = [];

    for (const file of context.files) {
      if (IGNORED_EXTENSIONS.has(path.extname(file).toLowerCase())) continue;
      if (ignorePatterns.some(p => p.test(file))) continue;

      let content: string;
      try {
        content = await fs.readFile(path.join(context.cwd, file), 'utf-8');
      } catch {
        continue;
      }

      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Inline suppression: # commitguard:ignore or // commitguard:ignore
        if (/commitguard:ignore|nosec/i.test(line)) continue;

        // Named rule scan
        let matched = false;
        for (const rule of SECRET_RULES) {
          if (rule.pattern.test(line)) {
            violations.push({ file, line: i + 1, match: rule.name, rule: rule.id });
            matched = true;
            break;
          }
        }

        // Entropy scan (skip if already flagged by a named rule)
        if (!matched) {
          HIGH_ENTROPY_RE.lastIndex = 0;
          let m: RegExpExecArray | null;
          while ((m = HIGH_ENTROPY_RE.exec(line)) !== null) {
            const candidate = m[1];
            if (candidate.length >= MIN_ENTROPY_LENGTH && shannonEntropy(candidate) >= ENTROPY_THRESHOLD) {
              violations.push({ file, line: i + 1, match: 'High-entropy string (possible secret)', rule: 'entropy' });
              break;
            }
          }
        }
      }
    }

    if (violations.length > 0) {
      const uniqueFiles = [...new Set(violations.map(v => v.file))];
      const preview = violations
        .slice(0, 5)
        .map(v => `  ${v.file}:${v.line} — ${v.match}`)
        .join('\n');
      const extra = violations.length > 5 ? `\n  ...and ${violations.length - 5} more` : '';

      return createBlockResult(
        `Secrets detected in ${uniqueFiles.length} file(s):\n${preview}${extra}`,
        'Remove secrets from source code. Use environment variables, a .env file (git-ignored), or a secret manager (AWS Secrets Manager, HashiCorp Vault, Doppler). Add false positives to .commitguardignore.',
        50,
        violations
      );
    }

    return createPassResult('No secrets detected.');
  }
}
