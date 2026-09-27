import fs from 'fs';
import path from 'path';
import { SQLiteLedger } from '../ledger/sqliteLedger.js';
import { playAlertSound } from '../utils/soundAlert.js';
import { sendDesktopNotification } from '../utils/notifier.js';
import { ProjectScanner } from '../intelligence/projectScanner.js';

export interface WatcherEvent {
  type: 'change' | 'rename' | 'security_violation';
  file: string;
  timestamp: number;
  details?: string;
  severity?: 'critical' | 'warning' | 'info';
}

export interface LiveWatcherOptions {
  workingDir?: string;
  dbPath?: string;
  silent?: boolean;
  onEvent?: (event: WatcherEvent) => void;
  onSecurityAlert?: (event: WatcherEvent) => void;
}

export class LiveWatcher {
  private workingDir: string;
  private dbPath: string;
  private silent: boolean;
  private onEvent?: (event: WatcherEvent) => void;
  private onSecurityAlert?: (event: WatcherEvent) => void;
  private watcher?: fs.FSWatcher;
  private active = false;
  private ledger?: SQLiteLedger;
  private scanner: ProjectScanner;
  private debounceMap = new Map<string, number>();

  constructor(options: LiveWatcherOptions = {}) {
    this.workingDir = options.workingDir || process.cwd();
    this.dbPath = options.dbPath || path.join(this.workingDir, '.vibesec', 'vibesec.db');
    this.silent = options.silent ?? false;
    this.onEvent = options.onEvent;
    this.onSecurityAlert = options.onSecurityAlert;
    this.scanner = new ProjectScanner(this.workingDir);
  }

  public start(): void {
    if (this.active) return;

    try {
      this.ledger = new SQLiteLedger(this.dbPath);
    } catch {
      // Ledger initialization fallback
    }

    this.active = true;

    try {
      this.watcher = fs.watch(
        this.workingDir,
        { recursive: true },
        (eventType, filename) => {
          if (!filename) return;
          this.handleFsEvent(eventType, filename);
        }
      );
    } catch {
      // Fallback for systems that don't support recursive fs.watch
      this.watcher = fs.watch(this.workingDir, (eventType, filename) => {
        if (!filename) return;
        this.handleFsEvent(eventType, filename);
      });
    }
  }

  public stop(): void {
    this.active = false;
    if (this.watcher) {
      this.watcher.close();
      this.watcher = undefined;
    }
    if (this.ledger) {
      this.ledger.close();
      this.ledger = undefined;
    }
  }

  public isWatching(): boolean {
    return this.active;
  }

  private handleFsEvent(eventType: string, filename: string): void {
    const normFile = filename.replace(/\\/g, '/');

    // Ignore noisy paths
    if (
      normFile.includes('node_modules') ||
      normFile.includes('.git') ||
      normFile.includes('dist') ||
      normFile.includes('.vibesec') ||
      normFile.endsWith('.tmp')
    ) {
      return;
    }

    // Debounce rapid repeat notifications on the same file (300ms)
    const now = Date.now();
    const lastTrigger = this.debounceMap.get(normFile) || 0;
    if (now - lastTrigger < 300) {
      return;
    }
    this.debounceMap.set(normFile, now);

    const isSensitive = this.isSensitiveFile(normFile);

    const event: WatcherEvent = {
      type: isSensitive ? 'security_violation' : (eventType as 'change' | 'rename'),
      file: normFile,
      timestamp: now,
      severity: isSensitive ? 'critical' : 'info',
      details: isSensitive
        ? `Rogue modification detected on protected sensitive file: ${normFile}`
        : `File modified in workspace: ${normFile}`,
    };

    if (this.onEvent) {
      this.onEvent(event);
    }

    if (isSensitive) {
      this.triggerSecurityAlert(event);
    }
  }

  private isSensitiveFile(file: string): boolean {
    const sensitiveGlobs = [
      '.env',
      '.env.production',
      '.env.local',
      'id_rsa',
      'id_ed25519',
      '.pem',
      '.key',
      'credentials.json',
      'service-account.json',
    ];

    return sensitiveGlobs.some((g) => file.endsWith(g) || file.includes('/.ssh/') || file.includes('/.aws/'));
  }

  private triggerSecurityAlert(event: WatcherEvent): void {
    if (this.onSecurityAlert) {
      this.onSecurityAlert(event);
    }

    // Sound siren & native toast notification
    if (!this.silent) {
      playAlertSound({ type: 'siren' });
      sendDesktopNotification({
        title: '🚨 VibeSec Guardian Alert: ROGUE MODIFICATION',
        message: `Rogue modification detected on sensitive file: ${event.file}!`,
        level: 'critical',
      });
    }

    // Log to SQLite Ledger
    if (this.ledger) {
      try {
        this.ledger.logEvent({
          projectId: path.basename(this.workingDir),
          agent: 'live-watcher',
          actionType: 'write_file',
          target: event.file,
          decision: 'block',
          reason: event.details || 'Unauthorized modification to sensitive file',
          executionStatus: 'failure',
        });
      } catch {}
    }
  }
}
