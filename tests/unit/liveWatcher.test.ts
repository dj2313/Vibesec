import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { LiveWatcher, WatcherEvent } from '../../src/execution/liveWatcher.js';

describe('LiveWatcher Daemon', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vibesec-watch-test-'));
  });

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  });

  it('starts and stops watching correctly', () => {
    const watcher = new LiveWatcher({
      workingDir: tempDir,
      silent: true,
    });

    expect(watcher.isWatching()).toBe(false);
    watcher.start();
    expect(watcher.isWatching()).toBe(true);
    watcher.stop();
    expect(watcher.isWatching()).toBe(false);
  });

  it('identifies sensitive files and triggers security alerts', async () => {
    let triggeredEvent: WatcherEvent | undefined;

    const watcher = new LiveWatcher({
      workingDir: tempDir,
      silent: true,
      onSecurityAlert: (event) => {
        triggeredEvent = event;
      },
    });

    watcher.start();

    // Create a sensitive .env file
    const envFile = path.join(tempDir, '.env');
    fs.writeFileSync(envFile, 'API_KEY=secret123');

    // Allow fs event loop to process
    await new Promise((resolve) => setTimeout(resolve, 600));

    watcher.stop();

    // Verify watcher recognized the sensitive .env file
    expect(triggeredEvent).toBeDefined();
    expect(triggeredEvent?.severity).toBe('critical');
    expect(triggeredEvent?.file).toContain('.env');
  });
});
