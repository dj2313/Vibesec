import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

describe('CLI Commands End-to-End Integration', () => {
  const testProjectDir = path.join(process.cwd(), '.vibesec_cli_test');
  const cliEntry = path.join(process.cwd(), 'dist', 'cli', 'index.js');

  beforeEach(() => {
    if (!fs.existsSync(testProjectDir)) {
      fs.mkdirSync(testProjectDir, { recursive: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(testProjectDir)) {
      fs.rmSync(testProjectDir, { recursive: true, force: true });
    }
  });

  it('runs vibesec init and creates required configuration files', { timeout: 20000 }, () => {
    const output = execSync(`node "${cliEntry}" init`, { cwd: testProjectDir, encoding: 'utf-8' });
    expect(output).toContain('VibeSec initialized successfully');
    expect(fs.existsSync(path.join(testProjectDir, '.vibesec', 'policy.yaml'))).toBe(true);
    expect(fs.existsSync(path.join(testProjectDir, '.vibesec', 'config.json'))).toBe(true);
    expect(fs.existsSync(path.join(testProjectDir, '.vibesec', 'vibesec.db'))).toBe(true);
  });

  it('runs vibesec status and outputs active rule counts', { timeout: 20000 }, () => {
    execSync(`node "${cliEntry}" init`, { cwd: testProjectDir, encoding: 'utf-8' });
    const output = execSync(`node "${cliEntry}" status`, { cwd: testProjectDir, encoding: 'utf-8' });
    expect(output).toContain('=== VibeSec Project Status ===');
    expect(output).toContain('Active & Connected');
  });

  it('blocks reading .env file via vibesec exec', { timeout: 20000 }, () => {
    execSync(`node "${cliEntry}" init`, { cwd: testProjectDir, encoding: 'utf-8' });
    const output = execSync(`node "${cliEntry}" exec -r .env`, { cwd: testProjectDir, encoding: 'utf-8' });
    expect(output).toContain('Action BLOCKED by VibeSec Policy');
  });

  it('allows safe node commands via vibesec exec', { timeout: 20000 }, () => {
    execSync(`node "${cliEntry}" init`, { cwd: testProjectDir, encoding: 'utf-8' });
    const output = execSync(`node "${cliEntry}" exec "node -v"`, { cwd: testProjectDir, encoding: 'utf-8' });
    expect(output).toContain('Action ALLOWED by VibeSec Policy');
  });
});
