import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import { SQLiteLedger } from '../../src/ledger/sqliteLedger.js';

describe('SQLiteLedger', () => {
  const testDbPath = '.vibesec/test_audit.db';
  let ledger: SQLiteLedger;

  beforeEach(async () => {
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    ledger = new SQLiteLedger(testDbPath);
    await ledger.ensureInitialized();
  });

  afterEach(() => {
    ledger.close();
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  it('logs audit events and retrieves them', () => {
    ledger.logEvent({
      projectId: 'proj-1',
      agent: 'claude-code',
      actionType: 'execute_command',
      target: 'npm test',
      decision: 'allow',
      reason: 'Standard test execution',
      executionStatus: 'success',
    });

    const logs = ledger.getLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0].agent).toBe('claude-code');
    expect(logs[0].target).toBe('npm test');
    expect(logs[0].decision).toBe('allow');
  });

  it('redacts secret values before inserting into SQLite', () => {
    ledger.logEvent({
      projectId: 'proj-1',
      agent: 'cursor',
      actionType: 'write_file',
      target: '.env with API_KEY=sk-ant-123456789012345678901234567890',
      decision: 'block',
      reason: 'Secret protection',
    });

    const logs = ledger.getLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0].secretRedacted).toBe(true);
    expect(logs[0].target).not.toContain('sk-ant-123456789012345678901234567890');
    expect(logs[0].target).toContain('[REDACTED_SECRET]');
  });

  it('filters logs by decision type', () => {
    ledger.logEvent({
      projectId: 'proj-1',
      agent: 'claude-code',
      actionType: 'execute_command',
      target: 'npm test',
      decision: 'allow',
      reason: 'Allowed',
    });

    ledger.logEvent({
      projectId: 'proj-1',
      agent: 'claude-code',
      actionType: 'read_file',
      target: '.env',
      decision: 'block',
      reason: 'Blocked',
    });

    const blockedLogs = ledger.getLogs({ decision: 'block' });
    expect(blockedLogs).toHaveLength(1);
    expect(blockedLogs[0].decision).toBe('block');
  });
});
