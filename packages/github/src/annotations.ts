import { EngineResult } from '@commitguard/core';
import { Severity } from '@commitguard/shared';

export interface GitHubAnnotation {
  file: string;
  line: number;
  title: string;
  message: string;
  annotation_level: 'notice' | 'warning' | 'failure';
}

export class AnnotationsGenerator {
  static generate(result: EngineResult): GitHubAnnotation[] {
    const annotations: GitHubAnnotation[] = [];

    for (const res of result.results) {
      if (res.status === Severity.PASS) continue;

      let level: 'warning' | 'failure' = 'warning';
      if (res.status === Severity.BLOCK) level = 'failure';

      // Note: In a real implementation, validators would attach file/line metadata
      // Since our validators are file-agnostic or don't return lines yet, we output a generic annotation
      // or attach to a placeholder file.
      
      annotations.push({
        file: '.', // Global repository level annotation
        line: 1,
        title: `Git Guardian: ${res.severity}`,
        message: `${res.message}\n\nRemediation: ${res.remediation}`,
        annotation_level: level
      });
    }

    return annotations;
  }
}
