import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import { VibeSecInterceptor } from '../../src/gateway/interceptor.js';

describe('VibeSecInterceptor', () => {
  const dbPath = '.vibesec/test_interceptor.db';
  let interceptor: VibeSecInterceptor;

  beforeEach(() => {
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

  it('allows safe command actions automatically', async () => {
    const res = await interceptor.processAction({
      agent: 'claude-code',
      command: 'node -v',
    });

    expect(res.decision.decision).toBe('allow');
    expect(res.executionStatus).toBe('success');
    expect(res.audit.decision).toBe('allow');
  });

  it('blocks sensitive .env file access', async () => {
    const res = await interceptor.processAction({
      agent: 'cursor',
      actionType: 'read_file',
      target: '.env',
    });

    expect(res.decision.decision).toBe('block');
    expect(res.executionStatus).toBe('skipped');
    expect(res.audit.decision).toBe('block');
  });

  it('triggers ask handler and approves action if user consents', async () => {
    interceptor.setAskUserHandler(async () => true);

    const res = await interceptor.processAction({
      agent: 'codex',
      command: 'git push origin main --force',
    });

    expect(res.decision.decision).toBe('allow');
    expect(res.decision.approvedBy).toBe('user');
  });

  it('triggers ask handler and blocks action if user denies', async () => {
    interceptor.setAskUserHandler(async () => false);

    const res = await interceptor.processAction({
      agent: 'codex',
      command: 'git push origin main --force',
    });

    expect(res.decision.decision).toBe('block');
    expect(res.executionStatus).toBe('skipped');
  });
});
