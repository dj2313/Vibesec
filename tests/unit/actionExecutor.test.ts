import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { ActionExecutor } from '../../src/execution/actionExecutor.js';
import { AgentAction } from '../../src/types/domain.js';

describe('ActionExecutor', () => {
  const testDir = path.join(process.cwd(), '.vibesec_test_exec');
  let executor: ActionExecutor;

  beforeEach(() => {
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    executor = new ActionExecutor(testDir);
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('executes safe shell commands', async () => {
    const action: AgentAction = {
      id: 'exec-1',
      timestamp: Date.now(),
      agent: 'claude-code',
      actionType: 'execute_command',
      target: 'node -v',
    };

    const result = await executor.execute(action);
    expect(result.success).toBe(true);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('v');
  });

  it('writes and reads files safely', async () => {
    const writeAction: AgentAction = {
      id: 'exec-2',
      timestamp: Date.now(),
      agent: 'claude-code',
      actionType: 'write_file',
      target: 'sample.txt',
      params: { content: 'Hello VibeSec' },
    };

    const writeRes = await executor.execute(writeAction);
    expect(writeRes.success).toBe(true);
    expect(fs.readFileSync(path.join(testDir, 'sample.txt'), 'utf-8')).toBe('Hello VibeSec');

    const readAction: AgentAction = {
      id: 'exec-3',
      timestamp: Date.now(),
      agent: 'claude-code',
      actionType: 'read_file',
      target: 'sample.txt',
    };

    const readRes = await executor.execute(readAction);
    expect(readRes.success).toBe(true);
    expect(readRes.stdout).toBe('Hello VibeSec');
  });
});
