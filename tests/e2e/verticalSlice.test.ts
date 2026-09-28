import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import { VibeSecInterceptor } from '../../src/gateway/interceptor.js';
import { VerificationEngine } from '../../src/verification/verificationEngine.js';

describe('VibeSec End-to-End Vertical Slice Control Loop', () => {
  const dbPath = '.vibesec/test_e2e_slice.db';
  let interceptor: VibeSecInterceptor;

  beforeEach(async () => {
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }
    interceptor = new VibeSecInterceptor({ dbPath });
  });

  afterEach(() => {
    interceptor.close();
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }
  });

  it('runs the complete Observe -> Control -> Explain -> Verify loop', async () => {
    // Step 1: Intercept safe dev command (npm --version)
    const step1 = await interceptor.processAction({
      agent: 'claude-code',
      command: 'node -v',
    });

    expect(step1.decision.decision).toBe('allow');
    expect(step1.executionStatus).toBe('success');
    expect(step1.audit.decision).toBe('allow');

    // Step 2: Intercept risky/blocked action (.env read)
    const step2 = await interceptor.processAction({
      agent: 'claude-code',
      actionType: 'read_file',
      target: '.env',
    });

    expect(step2.decision.decision).toBe('block');
    expect(step2.executionStatus).toBe('skipped');
    expect(step2.audit.decision).toBe('block');

    // Step 3: Run Verification engine checks
    const verification = new VerificationEngine({
      testCommand: 'node -v',
      skipSecurityScan: true,
    });
    const verResult = await verification.runVerification();
    expect(verResult.status).toBe('pass');

    // Step 4: Verify audit ledger contains both events
    const logs = interceptor.getLedger().getLogs();
    expect(logs).toHaveLength(2);
    expect(logs[0].decision).toBe('block');
    expect(logs[1].decision).toBe('allow');
  });
});
