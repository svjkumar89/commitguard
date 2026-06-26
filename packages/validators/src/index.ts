export * from './branchNaming.js';
export * from './protectedBranches.js';
export * from './branchAge.js';
export * from './branchBehindRemote.js';
export * from './mergeMarkers.js';
export * from './secrets.js';
export * from './binaryFiles.js';
export * from './generatedFiles.js';
export * from './largeDeletions.js';
export * from './deletedFiles.js';
export * from './ownershipDetection.js';
export * from './mergeConflictPrediction.js';
export * from './sqlSafety.js';
export * from './commitMessage.js';
export * from './buildVerification.js';
export * from './testVerification.js';
export * from './forcePush.js';
export * from './suspiciousDiff.js';
export * from './codeOwnershipDeletion.js';

import { Validator } from '@commitguard/shared';
import { CommitGuardConfig } from '@commitguard/config';

import { BranchNamingValidator } from './branchNaming.js';
import { ProtectedBranchesValidator } from './protectedBranches.js';
import { BranchAgeValidator } from './branchAge.js';
import { BranchBehindRemoteValidator } from './branchBehindRemote.js';
import { MergeMarkersValidator } from './mergeMarkers.js';
import { SecretsValidator } from './secrets.js';
import { BinaryFilesValidator } from './binaryFiles.js';
import { GeneratedFilesValidator } from './generatedFiles.js';
import { LargeDeletionsValidator } from './largeDeletions.js';
import { DeletedFilesValidator } from './deletedFiles.js';
import { OwnershipDetectionValidator } from './ownershipDetection.js';
import { MergeConflictPredictionValidator } from './mergeConflictPrediction.js';
import { SqlSafetyValidator } from './sqlSafety.js';
import { CommitMessageValidator } from './commitMessage.js';
import { BuildVerificationValidator } from './buildVerification.js';
import { TestVerificationValidator } from './testVerification.js';
import { ForcePushValidator } from './forcePush.js';
import { SuspiciousDiffValidator } from './suspiciousDiff.js';
import { CodeOwnershipDeletionValidator } from './codeOwnershipDeletion.js';

export function getValidators(config: CommitGuardConfig, commitMsgFile?: string): Validator[] {
  const validators: Validator[] = [];
  
  if (config.validators.branchNaming) validators.push(new BranchNamingValidator(config));
  if (config.validators.protectedBranches) validators.push(new ProtectedBranchesValidator(config));
  if (config.validators.branchAge) validators.push(new BranchAgeValidator(config));
  if (config.validators.branchBehindRemote) validators.push(new BranchBehindRemoteValidator());
  if (config.validators.mergeMarkers) validators.push(new MergeMarkersValidator());
  if (config.validators.secrets) validators.push(new SecretsValidator());
  if (config.validators.binaryFiles) validators.push(new BinaryFilesValidator(config));
  if (config.validators.generatedFiles) validators.push(new GeneratedFilesValidator());
  if (config.validators.largeDeletions) validators.push(new LargeDeletionsValidator(config));
  if (config.validators.deletedFiles) validators.push(new DeletedFilesValidator());
  if (config.validators.ownershipDetection) validators.push(new OwnershipDetectionValidator());
  if (config.validators.mergeConflictPrediction) validators.push(new MergeConflictPredictionValidator());
  if (config.validators.sqlSafety) validators.push(new SqlSafetyValidator());
  if (config.validators.commitMessage) validators.push(new CommitMessageValidator(commitMsgFile));
  if (config.validators.buildVerification) validators.push(new BuildVerificationValidator());
  if (config.validators.testVerification) validators.push(new TestVerificationValidator());
  if (config.validators.forcePush) validators.push(new ForcePushValidator(config));
  if (config.validators.suspiciousDiff) validators.push(new SuspiciousDiffValidator(config));
  if (config.validators.codeOwnershipDeletion) validators.push(new CodeOwnershipDeletionValidator());

  return validators;
}
