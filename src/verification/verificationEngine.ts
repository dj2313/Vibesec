import { exec } from 'child_process';
import { VerificationCheck, VerificationResult } from '../types/domain.js';

export interface VerificationConfig {
  testCommand?: string;
  buildCommand?: string;
  lintCommand?: string;
}

export class VerificationEngine {
  constructor(
    private config: VerificationConfig = {
      testCommand: 'npm test',
      buildCommand: 'npm run build',
    },
    private workingDir: string = process.cwd()
  ) {}

  public async runVerification(): Promise<VerificationResult> {
    const checks: VerificationCheck[] = [];

    // Run test verification check if configured
    if (this.config.testCommand) {
      const testCheck = await this.runCommandCheck('Test Verification', 'test', this.config.testCommand);
      checks.push(testCheck);
    }

    // Run build verification check if configured
    if (this.config.buildCommand) {
      const buildCheck = await this.runCommandCheck('Build Verification', 'build', this.config.buildCommand);
      checks.push(buildCheck);
    }

    // Run lint check if configured
    if (this.config.lintCommand) {
      const lintCheck = await this.runCommandCheck('Lint Verification', 'lint', this.config.lintCommand);
      checks.push(lintCheck);
    }

    const allPassed = checks.length > 0 && checks.every((c) => c.passed);

    return {
      status: allPassed ? 'pass' : 'fail',
      checks,
      timestamp: Date.now(),
    };
  }

  private runCommandCheck(name: string, type: 'test' | 'build' | 'lint' | 'policy', command: string): Promise<VerificationCheck> {
    const startTime = Date.now();
    return new Promise((resolve) => {
      exec(command, { cwd: this.workingDir, timeout: 60000 }, (error, stdout, stderr) => {
        const durationMs = Date.now() - startTime;
        const output = (stdout.toString() + '\n' + stderr.toString()).trim();
        resolve({
          name,
          type,
          passed: !error,
          output,
          durationMs,
        });
      });
    });
  }
}
