import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ConfigLoader } from '../src/loader.js';
import fs from 'node:fs/promises';

describe('ConfigLoader', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should return default config if no file exists', async () => {
    vi.spyOn(fs, 'readFile').mockRejectedValue({ code: 'ENOENT' });
    const config = await ConfigLoader.load('/test/dir');
    expect(config.validators.branchNaming).toBe(true);
    expect(config.rules.maxBranchAgeDays).toBe(30);
  });

  it('should load config from JSON file', async () => {
    vi.spyOn(fs, 'readFile').mockImplementation(async (path: any) => {
      if (path.endsWith('.gitguardian.json')) {
        return JSON.stringify({ validators: { branchNaming: false } });
      }
      throw { code: 'ENOENT' };
    });
    
    const config = await ConfigLoader.load('/test/dir');
    expect(config.validators.branchNaming).toBe(false);
    expect(config.validators.branchAge).toBe(true); // defaults preserved
  });
  
  it('should load config from YAML file', async () => {
    vi.spyOn(fs, 'readFile').mockImplementation(async (path: any) => {
      if (path.endsWith('.gitguardian.yml')) {
        return `
validators:
  branchAge: false
rules:
  maxBranchAgeDays: 14
`;
      }
      if (path.endsWith('.json')) throw { code: 'ENOENT' };
      throw { code: 'ENOENT' };
    });
    
    const config = await ConfigLoader.load('/test/dir');
    expect(config.validators.branchAge).toBe(false);
    expect(config.rules.maxBranchAgeDays).toBe(14);
  });
});
