import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as child_process from 'child_process';

export interface AuditLogEntry {
  id: string;
  timestamp: number;
  agent: string;
  actionType: string;
  target: string;
  decision: 'allow' | 'ask' | 'block';
  reason: string;
  executionStatus?: string;
}

export interface ScanResult {
  scannedFilesCount: number;
  durationMs: number;
  summary: { critical: number; high: number; medium: number; low: number };
  issues: Array<{
    file: string;
    line?: number;
    severity: string;
    title: string;
    snippet?: string;
    recommendation: string;
  }>;
}

export interface PolicyRule {
  id: string;
  resource?: string;
  command_pattern?: string;
  decision: 'allow' | 'ask' | 'block';
  reason: string;
}

export interface VibeSecStatus {
  initialized: boolean;
  watching: boolean;
  projectDir: string | undefined;
  vibesecDir: string | undefined;
  lastScan: ScanResult | null;
  logs: AuditLogEntry[];
  policy: PolicyRule[];
  stats: {
    totalToday: number;
    blockedToday: number;
    allowedToday: number;
    askedToday: number;
  };
}

export class VibeSecService {
  private workspaceRoot: string | undefined;
  private _watchProcess: child_process.ChildProcess | null = null;
  private _status: VibeSecStatus;
  private _onDidChangeStatus = new vscode.EventEmitter<VibeSecStatus>();
  public readonly onDidChangeStatus = this._onDidChangeStatus.event;

  constructor(workspaceRoot: string | undefined) {
    this.workspaceRoot = workspaceRoot;
    this._status = this._buildEmptyStatus();
    this._loadStatus();
  }

  private _buildEmptyStatus(): VibeSecStatus {
    return {
      initialized: false,
      watching: false,
      projectDir: this.workspaceRoot,
      vibesecDir: undefined,
      lastScan: null,
      logs: [],
      policy: [],
      stats: { totalToday: 0, blockedToday: 0, allowedToday: 0, askedToday: 0 },
    };
  }

  private _loadStatus(): void {
    if (!this.workspaceRoot) return;
    const vibesecDir = path.join(this.workspaceRoot, '.vibesec');
    if (!fs.existsSync(vibesecDir)) { return; }

    this._status.initialized = true;
    this._status.vibesecDir = vibesecDir;

    // Load policy
    const policyFile = path.join(vibesecDir, 'policy.yaml');
    if (fs.existsSync(policyFile)) {
      this._status.policy = this._parsePolicy(policyFile);
    }

    // Load audit logs from DB via CLI
    this._refreshLogs();
  }

  private _parsePolicy(policyFile: string): PolicyRule[] {
    try {
      const content = fs.readFileSync(policyFile, 'utf-8');
      const rules: PolicyRule[] = [];
      const ruleBlocks = content.split(/\n(?=  - id:)/);
      for (const block of ruleBlocks) {
        const idMatch = block.match(/id:\s*(.+)/);
        const decisionMatch = block.match(/decision:\s*(allow|ask|block)/);
        const reasonMatch = block.match(/reason:\s*(.+)/);
        const resourceMatch = block.match(/resource:\s*"?([^"\n]+)"?/);
        const cmdMatch = block.match(/command_pattern:\s*(.+)/);
        if (idMatch && decisionMatch) {
          rules.push({
            id: idMatch[1].trim(),
            decision: decisionMatch[1].trim() as 'allow' | 'ask' | 'block',
            reason: reasonMatch?.[1]?.trim() || '',
            resource: resourceMatch?.[1]?.trim(),
            command_pattern: cmdMatch?.[1]?.trim(),
          });
        }
      }
      return rules;
    } catch {
      return [];
    }
  }

  private _refreshLogs(): void {
    if (!this.workspaceRoot || !this._status.initialized) return;
    try {
      // Run vibesec logs command and capture JSON-like output
      const result = child_process.execSync(
        'node dist/cli/index.js logs --limit 50',
        { cwd: this.workspaceRoot, timeout: 5000, encoding: 'utf-8' }
      );
      this._status.logs = this._parseLogs(result);
      this._computeStats();
    } catch {
      // CLI not available or no logs yet — keep existing
    }
  }

  private _parseLogs(raw: string): AuditLogEntry[] {
    const entries: AuditLogEntry[] = [];
    const lines = raw.split('\n').filter(l => l.includes('│') || l.match(/\d{4}-\d{2}-\d{2}/));
    let id = 0;
    for (const line of lines) {
      const blockMatch = line.match(/BLOCK|block/i);
      const allowMatch = line.match(/ALLOW|allow/i);
      const askMatch = line.match(/ASK|ask/i);
      const agentMatch = line.match(/claude-code|cursor|codex|vscode|windsurf|generic/i);
      if (!blockMatch && !allowMatch && !askMatch) continue;
      if (!agentMatch) continue;
      entries.push({
        id: String(id++),
        timestamp: Date.now() - id * 60000,
        agent: agentMatch[0].toLowerCase(),
        actionType: 'execute_command',
        target: line.slice(0, 40).trim(),
        decision: blockMatch ? 'block' : askMatch ? 'ask' : 'allow',
        reason: 'Policy enforcement',
      });
    }
    return entries;
  }

  private _computeStats(): void {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTs = today.getTime();
    const todayLogs = this._status.logs.filter(l => l.timestamp >= todayTs);
    this._status.stats = {
      totalToday: todayLogs.length,
      blockedToday: todayLogs.filter(l => l.decision === 'block').length,
      allowedToday: todayLogs.filter(l => l.decision === 'allow').length,
      askedToday: todayLogs.filter(l => l.decision === 'ask').length,
    };
  }

  public getStatus(): VibeSecStatus {
    return this._status;
  }

  public async initProject(): Promise<void> {
    if (!this.workspaceRoot) throw new Error('No workspace open');
    await this._runCli('node dist/cli/index.js init');
    this._loadStatus();
    this._onDidChangeStatus.fire(this._status);
  }

  public async runScan(): Promise<ScanResult> {
    if (!this.workspaceRoot) throw new Error('No workspace open');
    const output = await this._runCli('node dist/cli/index.js scan --silent');
    const result = this._parseScanOutput(output);
    this._status.lastScan = result;
    this._onDidChangeStatus.fire(this._status);
    return result;
  }

  private _parseScanOutput(raw: string): ScanResult {
    const critMatch = raw.match(/(\d+) Critical/);
    const highMatch = raw.match(/(\d+) High/);
    const medMatch = raw.match(/(\d+) Medium/);
    const lowMatch = raw.match(/(\d+) Low/);
    const filesMatch = raw.match(/(\d+) files/);
    const msMatch = raw.match(/(\d+)ms/);
    const issueCount = parseInt(raw.match(/Found (\d+) security/)?.[1] || '0');
    const issues = [];
    const issueRegex = /\d+\.\s+(?:CRITICAL|HIGH|MEDIUM|LOW|INFO)\s+(.+?)\n\s+Location:\s+(.+?)(?:\n|$)/g;
    let m;
    while ((m = issueRegex.exec(raw)) !== null && issues.length < 20) {
      const [, title, location] = m;
      const [file, lineStr] = location.split(':');
      issues.push({ file: file?.trim() || '', line: lineStr ? parseInt(lineStr) : undefined, severity: 'high', title: title?.trim() || '', recommendation: 'Review and fix' });
    }
    return {
      scannedFilesCount: parseInt(filesMatch?.[1] || '0'),
      durationMs: parseInt(msMatch?.[1] || '0'),
      summary: {
        critical: parseInt(critMatch?.[1] || '0'),
        high: parseInt(highMatch?.[1] || '0'),
        medium: parseInt(medMatch?.[1] || '0'),
        low: parseInt(lowMatch?.[1] || '0'),
      },
      issues,
    };
  }

  public async startWatch(): Promise<void> {
    if (this._watchProcess) return;
    if (!this.workspaceRoot) return;
    const vibesecCliPath = path.join(this.workspaceRoot, 'dist', 'cli', 'index.js');
    const config = vscode.workspace.getConfiguration('vibesec');
    const silent = config.get('silent') ? '--silent' : '';
    this._watchProcess = child_process.spawn(
      'node', [vibesecCliPath, 'watch', silent].filter(Boolean),
      { cwd: this.workspaceRoot, stdio: ['ignore', 'pipe', 'pipe'] }
    );
    this._watchProcess.stdout?.on('data', (data: Buffer) => {
      const line = data.toString().trim();
      if (line.includes('THREAT DETECTED') || line.includes('BLOCKED')) {
        vscode.window.showWarningMessage(`🚨 VibeSec: ${line.slice(0, 100)}`);
        this._refreshLogs();
        this._onDidChangeStatus.fire(this._status);
      }
    });
    this._watchProcess.on('exit', () => {
      this._watchProcess = null;
      this._status.watching = false;
      this._onDidChangeStatus.fire(this._status);
    });
    this._status.watching = true;
    this._onDidChangeStatus.fire(this._status);
  }

  public stopWatch(): void {
    this._watchProcess?.kill();
    this._watchProcess = null;
    this._status.watching = false;
    this._onDidChangeStatus.fire(this._status);
  }

  public refresh(): void {
    this._refreshLogs();
    this._onDidChangeStatus.fire(this._status);
  }

  private _runCli(cmd: string): Promise<string> {
    return new Promise((resolve, reject) => {
      child_process.exec(cmd, { cwd: this.workspaceRoot, timeout: 15000 }, (err, stdout, stderr) => {
        if (err && !stdout) { reject(new Error(stderr || err.message)); return; }
        resolve(stdout + stderr);
      });
    });
  }

  public dispose(): void {
    this.stopWatch();
    this._onDidChangeStatus.dispose();
  }
}
