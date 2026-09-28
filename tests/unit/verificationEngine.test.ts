import { describe, it, expect } from 'vitest';
import { VerificationEngine } from '../../src/verification/verificationEngine.js';

describe('VerificationEngine', () => {
  it('passes when verification commands succeed', async () => {
    const engine = new VerificationEngine({
      testCommand: 'node -v',
      buildCommand: 'node -v',
      skipSecurityScan: true,
    });

    const result = await engine.runVerification();
    expect(result.status).toBe('pass');
    expect(result.checks).toHaveLength(2);
    expect(result.checks.every((c) => c.passed)).toBe(true);
  });

  it('fails when verification command exits with non-zero code', async () => {
    const engine = new VerificationEngine({
      testCommand: 'node -e "process.exit(1)"',
    });

    const result = await engine.runVerification();
    expect(result.status).toBe('fail');
    expect(result.checks[0].passed).toBe(false);
  });
});
