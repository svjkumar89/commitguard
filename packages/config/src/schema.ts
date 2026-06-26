import { z } from 'zod';

export const ConfigSchema = z.object({
  validators: z.object({
    branchNaming: z.boolean().default(true),
    branchAge: z.boolean().default(true),
    branchBehindRemote: z.boolean().default(true),
    protectedBranches: z.boolean().default(true),
    mergeMarkers: z.boolean().default(true),
    secrets: z.boolean().default(true),
    binaryFiles: z.boolean().default(true),
    generatedFiles: z.boolean().default(true),
    largeDeletions: z.boolean().default(true),
    deletedFiles: z.boolean().default(true),
    ownershipDetection: z.boolean().default(true),
    mergeConflictPrediction: z.boolean().default(true),
    sqlSafety: z.boolean().default(true),
    commitMessage: z.boolean().default(true),
    buildVerification: z.boolean().default(true),
    testVerification: z.boolean().default(true),
  }).default({}),
  rules: z.object({
    maxBranchAgeDays: z.number().default(30),
    protectedBranchesList: z.array(z.string()).default(['main', 'master', 'production']),
    allowedBinaryExtensions: z.array(z.string()).default(['.png', '.jpg', '.jpeg', '.pdf']),
    maxDeletionLines: z.number().default(500),
    maxDeletedFiles: z.number().default(5),
    // Branch naming â€” set one or the other; pattern takes precedence
    allowedBranchPrefixes: z.array(z.string()).default(['feature', 'bugfix', 'hotfix', 'release', 'chore', 'fix', 'docs', 'refactor', 'test']),
    branchNamingPattern: z.string().optional(),
    // Scan settings
    scanDepth: z.number().default(50),
  }).default({})
});

export type CommitGuardConfig = z.infer<typeof ConfigSchema>;
