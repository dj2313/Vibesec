import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { VerificationCheck, VerificationResult } from '../types/domain.js';
import { ProjectScanner } from '../intelligence/projectScanner.js';

export interface VerificationConfig {
  testCommand?: string;
  buildCommand?: string;
  lintCommand?: string;
  skipSecurityScan?: boolean;
}

export class VerificationEngine {
  private config: VerificationConfig;
  private workingDir: string;

  constructor(
    customConfig?: VerificationConfig,
    workingDir: string = process.cwd()
  ) {
    this.workingDir = workingDir;
    this.config = customConfig || this.autoDetectConfig(workingDir);
  }

  public autoDetectConfig(dir: string): VerificationConfig {
    const pkgJsonPath = path.join(dir, 'package.json');
    const pyprojectPath = path.join(dir, 'pyproject.toml');
    const cargoPath = path.join(dir, 'Cargo.toml');
    const goModPath = path.join(dir, 'go.mod');

    if (fs.existsSync(pkgJsonPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));
        const scripts = pkg.scripts || {};
        const hasRealTest = scripts.test && !scripts.test.includes('no test specified');
        const hasBuild = Boolean(scripts.build);
        const hasLint = Boolean(scripts.lint);

        return {
          testCommand: hasRealTest ? 'npm test' : undefined,
          buildCommand: hasBuild ? 'npm run build' : undefined,
          lintCommand: hasLint ? 'npm run lint' : undefined,
        };
      } catch {
        return { testCommand: 'npm test', buildCommand: 'npm run build' };
      }
    }

    if (fs.existsSync(cargoPath)) {
      return {
        testCommand: 'cargo test',
        buildCommand: 'cargo check',
      };
    }

    if (fs.existsSync(goModPath)) {
      return {
        testCommand: 'go test ./...',
        buildCommand: 'go build ./...',
      };
    }

    if (fs.existsSync(pyprojectPath) || fs.existsSync(path.join(dir, 'requirements.txt'))) {
      return {
        testCommand: 'pytest',
      };
    }

    return {};
  }

  public async runVerification(): Promise<VerificationResult> {
    const checks: VerificationCheck[] = [];

    // 1. Run Built-In Project Security Scan
    if (!this.config.skipSecurityScan) {
      const scanner = new ProjectScanner(this.workingDir);
      const scanStartTime = Date.now();
      const scanResult = await scanner.scan();
      const scanDuration = Date.now() - scanStartTime;
      const scanPassed = scanResult.summary.critical === 0;

      checks.push({
        name: 'Project Security & Secret Scan',
        type: 'policy',
        passed: scanPassed,
        output: scanPassed
          ? `Security scan passed (${scanResult.scannedFilesCount} files analyzed, 0 critical issues)`
          : `Found ${scanResult.summary.critical} critical security issues / secrets!`,
        durationMs: scanDuration,
      });
    }

    // 2. Run test verification check if configured
    if (this.config.testCommand) {
      const testCheck = await this.runCommandCheck('Test Suite Verification', 'test', this.config.testCommand);
      checks.push(testCheck);
    }

    // 3. Run build verification check if configured
    if (this.config.buildCommand) {
      const buildCheck = await this.runCommandCheck('Build Pipeline Verification', 'build', this.config.buildCommand);
      checks.push(buildCheck);
    }

    // 4. Run lint check if configured
    if (this.config.lintCommand) {
      const lintCheck = await this.runCommandCheck('Code Quality & Lint Verification', 'lint', this.config.lintCommand);
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

