import * as vscode from 'vscode';
import { VibeSecService, VibeSecStatus } from '../services/VibeSecService';
import { getBaseStyles } from '../webview/styles';

export class SidebarProvider implements vscode.WebviewViewProvider {
  private _view?: vscode.WebviewView;
  private _service: VibeSecService;
  private _context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext, service: VibeSecService) {
    this._context = context;
    this._service = service;

    service.onDidChangeStatus(() => {
      if (this._view) {
        this._updateContent();
      }
    });
  }

  resolveWebviewView(webviewView: vscode.WebviewView): void {
    this._view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._context.extensionUri],
    };
    this._updateContent();

    // Handle messages from the sidebar
    webviewView.webview.onDidReceiveMessage((msg) => {
      switch (msg.command) {
        case 'openDashboard':
          vscode.commands.executeCommand('vibesec.openDashboard');
          break;
        case 'runScan':
          vscode.commands.executeCommand('vibesec.runScan');
          break;
        case 'startWatch':
          vscode.commands.executeCommand('vibesec.startWatch');
          break;
        case 'stopWatch':
          vscode.commands.executeCommand('vibesec.stopWatch');
          break;
        case 'showLogs':
          vscode.commands.executeCommand('vibesec.showLogs');
          break;
        case 'showPolicy':
          vscode.commands.executeCommand('vibesec.showPolicy');
          break;
        case 'init':
          vscode.commands.executeCommand('vibesec.init');
          break;
      }
    });
  }

  public refresh(): void {
    if (this._view) {
      this._updateContent();
    }
  }

  private _updateContent(): void {
    if (!this._view) return;
    const status = this._service.getStatus();
    this._view.webview.html = this._buildHtml(status);
  }

  private _buildHtml(s: VibeSecStatus): string {
    const recentLogs = s.logs.slice(0, 6);
    const watchBtnLabel = s.watching ? '⏹ Stop Guardian' : '▶ Start Guardian';
    const watchBtnClass = s.watching ? 'btn-danger' : 'btn-ghost';
    const watchBtnCmd = s.watching ? 'stopWatch' : 'startWatch';

    const statusBadge = !s.initialized
      ? `<span class="status-pill unprotected">⚠ NOT INITIALIZED</span>`
      : `<span class="status-pill protected"><span class="dot dot-live"></span> PROTECTED</span>`;

    const logRows = recentLogs.length === 0
      ? `<div class="empty-state"><p>No activity yet.<br>Run <code>vibesec exec</code> to start.</p></div>`
      : recentLogs.map(l => `
          <div class="log-row-mini animate-in" title="${l.reason}">
            <span class="badge badge-${l.decision}">${l.decision}</span>
            <span class="log-target mono">${this._truncate(l.target, 22)}</span>
            <span class="log-agent">${l.agent}</span>
          </div>`).join('');

    const scanSummary = s.lastScan
      ? `<div class="scan-pill ${s.lastScan.summary.critical > 0 ? 'scan-warn' : 'scan-ok'}">
           ${s.lastScan.summary.critical > 0
             ? `🚨 ${s.lastScan.summary.critical} critical`
             : `✔ ${s.lastScan.scannedFilesCount} files clean`}
         </div>`
      : `<div class="scan-pill scan-idle">No scan yet</div>`;

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>VibeSec</title>
<style>
${getBaseStyles()}

body { padding: 0; overflow-x: hidden; }

/* ── Header ─────────────────────────────────── */
.header {
  display: flex; align-items: center; gap: 10px;
  padding: 14px 14px 10px;
  border-bottom: 1px solid var(--border-subtle);
}
.header-icon {
  width: 28px; height: 28px;
  background: var(--accent-blue);
  border-radius: var(--radius-sm);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 0 12px rgba(47,129,247,0.3);
}
.header-icon svg { width: 16px; height: 16px; }
.header-text { flex: 1; min-width: 0; }
.header-title { font-size: 13px; font-weight: 700; color: var(--text-primary); letter-spacing: -0.01em; }
.header-sub { font-size: 10px; color: var(--text-muted); font-family: var(--font-mono); }

/* ── Status pill ────────────────────────────── */
.status-pill {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 3px 10px; border-radius: 20px;
  font-size: 10px; font-weight: 700; letter-spacing: 0.06em;
  font-family: var(--font-mono); text-transform: uppercase;
  margin: 10px 14px 8px;
}
.protected { background: var(--green-subtle); color: var(--green); border: 1px solid rgba(63,185,80,0.3); }
.unprotected { background: var(--amber-subtle); color: var(--amber); border: 1px solid rgba(210,153,34,0.3); }

/* ── Stats row ──────────────────────────────── */
.stats-row {
  display: grid; grid-template-columns: 1fr 1fr 1fr;
  gap: 6px; padding: 0 14px 12px;
}
.mini-stat {
  padding: 8px 10px;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  text-align: center;
}
.mini-stat-val { font-size: 16px; font-weight: 700; letter-spacing: -0.02em; font-family: var(--font-mono); }
.mini-stat-lbl { font-size: 9px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); margin-top: 2px; }
.mini-stat.red .mini-stat-val { color: var(--red); }
.mini-stat.green .mini-stat-val { color: var(--green); }
.mini-stat.blue .mini-stat-val { color: var(--accent-blue-hover); }

/* ── Section ────────────────────────────────── */
.section { padding: 10px 14px 0; }
.section-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 8px;
}
.section-title { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.07em; color: var(--text-secondary); }
.section-action { font-size: 10px; color: var(--accent-blue); cursor: pointer; background: none; border: none; padding: 0; font-family: var(--font-ui); }
.section-action:hover { color: var(--accent-blue-hover); text-decoration: underline; }

/* ── Log mini rows ──────────────────────────── */
.feed-list {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
  margin-bottom: 12px;
}
.log-row-mini {
  display: flex; align-items: center; gap: 8px;
  padding: 7px 10px;
  border-bottom: 1px solid var(--border-subtle);
  transition: background var(--transition);
}
.log-row-mini:last-child { border-bottom: none; }
.log-row-mini:hover { background: var(--bg-hover); }
.log-target { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 11px; color: var(--text-primary); }
.log-agent { font-size: 10px; color: var(--text-muted); font-family: var(--font-mono); flex-shrink: 0; }

/* ── Scan pill ──────────────────────────────── */
.scan-pill {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 5px 12px; border-radius: var(--radius-sm);
  font-size: 11px; font-weight: 500; width: 100%;
  border: 1px solid var(--border);
  margin-bottom: 10px;
}
.scan-ok  { background: var(--green-subtle); color: var(--green); border-color: rgba(63,185,80,0.25); }
.scan-warn { background: var(--red-subtle);  color: var(--red);   border-color: rgba(248,81,73,0.25); }
.scan-idle { background: var(--bg-surface);  color: var(--text-muted); }

/* ── Action buttons ─────────────────────────── */
.action-grid {
  display: grid; grid-template-columns: 1fr 1fr;
  gap: 6px; padding: 0 14px 14px;
}
.action-grid .btn { justify-content: center; font-size: 11px; padding: 7px 10px; }

/* ── Dashboard link ─────────────────────────── */
.dash-link {
  display: flex; align-items: center; justify-content: center; gap: 6px;
  padding: 8px 14px 12px;
  font-size: 11px; color: var(--text-secondary);
  cursor: pointer; transition: color var(--transition);
  background: none; border: none; width: 100%; font-family: var(--font-ui);
  border-top: 1px solid var(--border-subtle);
}
.dash-link:hover { color: var(--accent-blue-hover); }

/* ── Watch indicator ────────────────────────── */
.watch-indicator {
  display: flex; align-items: center; gap: 6px;
  margin: 0 14px 10px;
  padding: 6px 10px;
  background: var(--green-subtle);
  border: 1px solid rgba(63,185,80,0.25);
  border-radius: var(--radius-sm);
  font-size: 11px; color: var(--green);
}
</style>
</head>
<body>

<!-- HEADER -->
<div class="header">
  <div class="header-icon">
    <svg viewBox="0 0 24 24" fill="none">
      <path d="M12 2L3 6v6c0 5.25 3.75 10.15 9 11.25C17.25 22.15 21 17.25 21 12V6L12 2z" fill="white" fill-opacity="0.95"/>
      <path d="M9.5 12.5l2 2 3.5-3.5" stroke="#2F81F7" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  </div>
  <div class="header-text">
    <div class="header-title">VibeSec</div>
    <div class="header-sub">AI Agent Security Guard</div>
  </div>
</div>

<!-- STATUS PILL -->
${statusBadge}

${s.watching ? `<div class="watch-indicator"><span class="dot dot-live"></span> Live Guardian Active</div>` : ''}

<!-- STATS -->
<div class="stats-row">
  <div class="mini-stat red">
    <div class="mini-stat-val">${s.stats.blockedToday}</div>
    <div class="mini-stat-lbl">Blocked</div>
  </div>
  <div class="mini-stat amber" style="color: var(--amber);">
    <div class="mini-stat-val" style="color: var(--amber);">${s.stats.askedToday}</div>
    <div class="mini-stat-lbl">Asked</div>
  </div>
  <div class="mini-stat green">
    <div class="mini-stat-val">${s.stats.allowedToday}</div>
    <div class="mini-stat-lbl">Allowed</div>
  </div>
</div>

<!-- LIVE THREAT FEED -->
<div class="section">
  <div class="section-header">
    <span class="section-title">Live Threat Feed</span>
    <button class="section-action" onclick="post('showLogs')">View all →</button>
  </div>
  <div class="feed-list">${logRows}</div>
</div>

<!-- LAST SCAN -->
<div class="section">
  <div class="section-header">
    <span class="section-title">Last Scan</span>
  </div>
  ${scanSummary}
</div>

<!-- ACTION BUTTONS -->
<div class="action-grid">
  <button class="btn btn-primary" onclick="post('runScan')">⚡ Scan</button>
  <button class="btn ${watchBtnClass}" onclick="post('${watchBtnCmd}')">${watchBtnLabel}</button>
  <button class="btn btn-ghost" onclick="post('showPolicy')">🔒 Policy</button>
  <button class="btn btn-ghost" onclick="post('showLogs')">📋 Logs</button>
</div>

${!s.initialized ? `
<div style="padding: 0 14px 14px;">
  <button class="btn btn-primary" style="width:100%;justify-content:center;" onclick="post('init')">
    Initialize VibeSec
  </button>
</div>` : ''}

<!-- DASHBOARD LINK -->
<button class="dash-link" onclick="post('openDashboard')">
  Open Full Dashboard ↗
</button>

<script>
  const vscode = acquireVsCodeApi();
  function post(cmd) { vscode.postMessage({ command: cmd }); }
</script>
</body>
</html>`;
  }

  private _truncate(str: string, max: number): string {
    return str.length > max ? str.slice(0, max - 1) + '…' : str;
  }
}
