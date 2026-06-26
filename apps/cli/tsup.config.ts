import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs'],
  noSplitting: true,
  // Bundle all @commitguard/* workspace packages into the single output file
  // so the published npm package is fully self-contained
  noExternal: [/^@commitguard\//],
  // src/index.ts already has #!/usr/bin/env node — tsup preserves it
});
