import { EngineResult } from '@commitguard/core';

export class JsonReporter {
  report(result: EngineResult): string {
    return JSON.stringify(result, null, 2);
  }
}
