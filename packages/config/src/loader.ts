import { z } from 'zod';
import fs from 'node:fs/promises';
import path from 'node:path';
import yaml from 'js-yaml';
import { ConfigSchema, CommitGuardConfig } from './schema.js';

export class ConfigLoader {
  private static configFiles = [
    '.commitguard.json',
    '.commitguard.yml',
    '.commitguard.yaml',
    // Legacy names kept for backwards compatibility
    '.gitguardian.json',
    '.gitguardian.yml',
    '.gitguardian.yaml'
  ];

  static async load(cwd: string): Promise<CommitGuardConfig> {
    for (const file of this.configFiles) {
      const filePath = path.join(cwd, file);
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        let parsed: unknown;
        if (file.endsWith('.json')) {
          parsed = JSON.parse(content);
        } else {
          parsed = yaml.load(content);
        }
        return ConfigSchema.parse(parsed);
      } catch (error: any) {
        if (error.code !== 'ENOENT') {
          console.error(`Error parsing config file ${file}:`, error.message);
        }
      }
    }
    // Return default config if no file found
    return ConfigSchema.parse({});
  }
}
