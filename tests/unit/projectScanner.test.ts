import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { ProjectScanner } from '../../src/intelligence/projectScanner.js';

describe('ProjectScanner Engine', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vibesec-scan-test-'));
  });

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  });

  it('detects exposed OpenAI and AWS credentials in code files', async () => {
    const testFile = path.join(tempDir, 'service.js');
    fs.writeFileSync(
      testFile,
      `
      const openaiKey = "sk-proj-abc123456789012345678901234567890";
      const awsKey = "AKIAIOSFODNN7EXAMPLE";
      console.log("Service active");
      `
    );

    const scanner = new ProjectScanner(tempDir);
    const result = await scanner.scan();

    expect(result.issues.length).toBeGreaterThanOrEqual(2);
    const issueIds = result.issues.map((i) => i.id);
    expect(issueIds).toContain('openai-api-key');
    expect(issueIds).toContain('aws-access-key');
    expect(result.summary.critical).toBeGreaterThanOrEqual(2);
  });

  it('detects un-gitignored .env files', async () => {
    fs.writeFileSync(path.join(tempDir, '.env'), 'SECRET_KEY=1234567890123456');
    fs.writeFileSync(path.join(tempDir, '.gitignore'), 'node_modules\ndist\n');

    const scanner = new ProjectScanner(tempDir);
    const result = await scanner.scan();

    const envIssue = result.issues.find((i) => i.id === 'env-not-gitignored');
    expect(envIssue).toBeDefined();
    expect(envIssue?.severity).toBe('critical');
  });

  it('passes cleanly on safe code without secrets', async () => {
    fs.writeFileSync(path.join(tempDir, 'app.ts'), 'export const greeting = "Hello World";');
    fs.writeFileSync(path.join(tempDir, '.gitignore'), '.env\nnode_modules\n');

    const scanner = new ProjectScanner(tempDir);
    const result = await scanner.scan();

    expect(result.issues.length).toBe(0);
    expect(result.summary.total).toBe(0);
  });
});
