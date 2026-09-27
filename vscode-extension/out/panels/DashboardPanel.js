"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardPanel = void 0;
const vscode = __importStar(require("vscode"));
const styles_1 = require("../webview/styles");
class DashboardPanel {
    static createOrShow(context, service, tab = 'overview') {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;
        if (DashboardPanel._currentPanel) {
            DashboardPanel._currentPanel._panel.reveal(column);
            DashboardPanel._currentPanel._activeTab = tab;
            DashboardPanel._currentPanel._update();
            return;
        }
        const panel = vscode.window.createWebviewPanel('vibesecDashboard', '🛡️ VibeSec Dashboard', column || vscode.ViewColumn.One, {
            enableScripts: true,
            retainContextWhenHidden: true,
            localResourceRoots: [context.extensionUri],
        });
        DashboardPanel._currentPanel = new DashboardPanel(panel, context, service, tab);
    }
    static refresh() {
        DashboardPanel._currentPanel?._update();
    }
    constructor(panel, context, service, tab) {
        this._disposables = [];
        this._panel = panel;
        this._context = context;
        this._service = service;
        this._activeTab = tab;
        this._update();
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        this._panel.webview.onDidReceiveMessage(async (msg) => {
            switch (msg.command) {
                case 'setTab':
                    this._activeTab = msg.tab;
                    this._update();
                    break;
                case 'runScan':
                    await vscode.commands.executeCommand('vibesec.runScan');
                    break;
                case 'startWatch':
                    await vscode.commands.executeCommand('vibesec.startWatch');
                    break;
                case 'stopWatch':
                    await vscode.commands.executeCommand('vibesec.stopWatch');
                    break;
                case 'init':
                    await vscode.commands.executeCommand('vibesec.init');
                    break;
                case 'refresh':
                    this._service.refresh();
                    this._update();
                    break;
            }
        }, null, this._disposables);
        this._service.onDidChangeStatus(() => this._update(), null, this._disposables);
        // Auto-refresh
        const config = vscode.workspace.getConfiguration('vibesec');
        const interval = config.get('refreshInterval') ?? 3000;
        this._refreshTimer = setInterval(() => {
            this._service.refresh();
        }, interval);
    }
    _update() {
        const status = this._service.getStatus();
        this._panel.webview.html = this._buildHtml(status);
    }
    _ts(ts) {
        return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }
    _truncate(str, max) {
        return str.length > max ? str.slice(0, max - 1) + '…' : str;
    }
    _decisionIcon(d) {
        return d === 'block' ? '🚫' : d === 'ask' ? '⚠️' : '✅';
    }
    _buildLogsTab(logs) {
        if (logs.length === 0) {
            return `<div class="empty-state">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
          <path d="M12 2L3 6v6c0 5.25 3.75 10.15 9 11.25C17.25 22.15 21 17.25 21 12V6L12 2z" stroke="#30363D" stroke-width="1.5"/>
        </svg>
        <p>No audit events yet.<br>Run an agent action to see logs here.</p>
      </div>`;
        }
        const rows = logs.map((l, i) => `
      <div class="log-row" style="grid-template-columns: 70px 110px 1fr 120px 80px; animation-delay: ${i * 20}ms;" class="animate-in">
        <span class="badge badge-${l.decision}">${this._decisionIcon(l.decision)} ${l.decision.toUpperCase()}</span>
        <span class="mono" style="font-size:11px;color:var(--accent-blue-hover)">${l.agent}</span>
        <span style="font-size:11px;color:var(--text-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${l.target}">${this._truncate(l.target, 55)}</span>
        <span style="font-size:10px;color:var(--text-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${l.reason}">${this._truncate(l.reason, 30)}</span>
        <span class="mono" style="font-size:10px;color:var(--text-muted);text-align:right;">${this._ts(l.timestamp)}</span>
      </div>`).join('');
        return `
      <div class="surface" style="overflow:hidden;">
        <div class="log-row" style="grid-template-columns: 70px 110px 1fr 120px 80px; border-bottom: 1px solid var(--border);">
          <span class="col-head">Decision</span>
          <span class="col-head">Agent</span>
          <span class="col-head">Target</span>
          <span class="col-head">Reason</span>
          <span class="col-head" style="text-align:right">Time</span>
        </div>
        ${rows}
      </div>`;
    }
    _buildPolicyTab(rules) {
        if (rules.length === 0) {
            return `<div class="empty-state"><p>No policy rules loaded.<br>Initialize VibeSec first.</p></div>`;
        }
        return rules.map(r => `
      <div class="policy-row animate-in">
        <div class="policy-row-top">
          <span class="mono" style="font-size:12px;font-weight:600;color:var(--text-primary)">${r.id}</span>
          <span class="badge badge-${r.decision}">${r.decision.toUpperCase()}</span>
        </div>
        ${r.resource ? `<div class="policy-detail"><span class="col-head">Resource</span> <code>${r.resource}</code></div>` : ''}
        ${r.command_pattern ? `<div class="policy-detail"><span class="col-head">Pattern</span> <code>${r.command_pattern}</code></div>` : ''}
        <div class="policy-reason">${r.reason}</div>
      </div>`).join('');
    }
    _buildScanTab(s) {
        if (!s.lastScan) {
            return `
        <div class="empty-state">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="8" stroke="#30363D" stroke-width="1.5"/>
            <path d="M21 21l-4.35-4.35" stroke="#30363D" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          <p>No scan results yet.</p>
          <button class="btn btn-primary" style="margin-top:8px" onclick="post('runScan')">⚡ Run Scan Now</button>
        </div>`;
        }
        const scan = s.lastScan;
        const issues = scan.issues.map(iss => `
      <div class="issue-row animate-in">
        <span class="badge badge-${iss.severity.toLowerCase()}">${iss.severity.toUpperCase()}</span>
        <div class="issue-body">
          <div class="issue-title">${iss.title}</div>
          <div class="mono" style="font-size:10px;color:var(--text-muted)">${iss.file}${iss.line ? ':' + iss.line : ''}</div>
          <div style="font-size:11px;color:var(--text-secondary);margin-top:3px">${iss.recommendation}</div>
        </div>
      </div>`).join('');
        return `
      <div class="scan-header">
        <div class="stats-4">
          <div class="stat-tile red"><div class="stat-value">${scan.summary.critical}</div><div class="stat-label">Critical</div></div>
          <div class="stat-tile amber"><div class="stat-value" style="color:var(--amber)">${scan.summary.high}</div><div class="stat-label">High</div></div>
          <div class="stat-tile blue"><div class="stat-value">${scan.summary.medium}</div><div class="stat-label">Medium</div></div>
          <div class="stat-tile"><div class="stat-value" style="color:var(--text-secondary)">${scan.summary.low}</div><div class="stat-label">Low</div></div>
        </div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:8px">
          ${scan.scannedFilesCount} files scanned · ${scan.durationMs}ms
        </div>
      </div>
      ${issues.length > 0 ? `<div style="margin-top:16px">${issues}</div>` : '<div class="empty-state" style="margin-top:16px"><p>✅ No issues found!</p></div>'}`;
    }
    _buildOverviewTab(s) {
        const recentLogs = s.logs.slice(0, 8);
        const rows = recentLogs.length > 0
            ? recentLogs.map(l => `
          <div class="log-row animate-in" style="grid-template-columns: 74px 100px 1fr 80px;">
            <span class="badge badge-${l.decision}">${this._decisionIcon(l.decision)} ${l.decision.toUpperCase()}</span>
            <span class="mono" style="font-size:11px;color:var(--accent-blue-hover)">${l.agent}</span>
            <span style="font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${l.target}">${this._truncate(l.target, 60)}</span>
            <span class="mono" style="font-size:10px;color:var(--text-muted);text-align:right;">${this._ts(l.timestamp)}</span>
          </div>`).join('')
            : `<div class="empty-state"><p>No activity yet. Run an agent command through VibeSec to see events here.</p></div>`;
        const scanCard = s.lastScan
            ? `<div class="surface" style="padding:14px;display:flex;justify-content:space-between;align-items:center;">
           <div>
             <div style="font-weight:600;font-size:12px">Last Scan</div>
             <div style="font-size:11px;color:var(--text-muted);margin-top:2px">${s.lastScan.scannedFilesCount} files · ${s.lastScan.durationMs}ms</div>
           </div>
           <div style="display:flex;gap:10px;align-items:center;">
             ${s.lastScan.summary.critical > 0 ? `<span class="badge badge-critical">🚨 ${s.lastScan.summary.critical} Critical</span>` : `<span class="badge badge-allow">✅ Clean</span>`}
           </div>
         </div>`
            : `<div class="surface" style="padding:14px;display:flex;justify-content:space-between;align-items:center;">
           <div style="font-size:12px;color:var(--text-muted)">No scan run yet</div>
           <button class="btn btn-ghost" style="font-size:11px" onclick="post('runScan')">⚡ Scan Now</button>
         </div>`;
        return `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px">
        <div style="display:flex;flex-direction:column;gap:8px">
          ${scanCard}
          <div class="surface" style="padding:14px;">
            <div style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-secondary);margin-bottom:10px">Policy Rules</div>
            <div style="display:flex;flex-wrap:wrap;gap:5px;">
              ${s.policy.slice(0, 6).map(r => `<span class="badge badge-${r.decision}" title="${r.reason}">${r.id}</span>`).join('')}
              ${s.policy.length > 6 ? `<span class="badge badge-info">+${s.policy.length - 6} more</span>` : ''}
            </div>
          </div>
        </div>
        <div class="surface" style="padding:14px;">
          <div style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-secondary);margin-bottom:10px">Project</div>
          <table style="width:100%;border-collapse:collapse;">
            <tr><td class="tbl-lbl">Status</td><td class="tbl-val">${s.initialized ? '<span style="color:var(--green)">✔ Initialized</span>' : '<span style="color:var(--amber)">⚠ Not initialized</span>'}</td></tr>
            <tr><td class="tbl-lbl">Guardian</td><td class="tbl-val">${s.watching ? '<span style="color:var(--green)">● Live</span>' : '<span style="color:var(--text-muted)">○ Stopped</span>'}</td></tr>
            <tr><td class="tbl-lbl">Policy</td><td class="tbl-val">${s.policy.length} rules</td></tr>
            <tr><td class="tbl-lbl">Logs</td><td class="tbl-val">${s.logs.length} events</td></tr>
          </table>
        </div>
      </div>
      <div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
          <h2 style="font-size:12px">Recent Activity</h2>
          <button class="btn btn-ghost" style="font-size:10px;padding:3px 8px" onclick="post('refresh')">↺ Refresh</button>
        </div>
        <div class="surface" style="overflow:hidden">
          ${rows}
        </div>
      </div>`;
    }
    _buildHtml(s) {
        const tabs = ['overview', 'logs', 'scan', 'policy'];
        const tabNav = tabs.map(t => `
      <button class="tab-btn ${this._activeTab === t ? 'active' : ''}" onclick="setTab('${t}')">
        ${{ overview: '📊 Overview', logs: '📋 Audit Logs', scan: '🔍 Scan', policy: '🔒 Policy' }[t]}
      </button>`).join('');
        let tabContent = '';
        switch (this._activeTab) {
            case 'logs':
                tabContent = this._buildLogsTab(s.logs);
                break;
            case 'scan':
                tabContent = this._buildScanTab(s);
                break;
            case 'policy':
                tabContent = this._buildPolicyTab(s.policy);
                break;
            default:
                tabContent = this._buildOverviewTab(s);
                break;
        }
        const watchBtn = s.watching
            ? `<button class="btn btn-danger" onclick="post('stopWatch')">⏹ Stop Guardian</button>`
            : `<button class="btn btn-ghost" onclick="post('startWatch')">▶ Start Guardian</button>`;
        return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>VibeSec Dashboard</title>
<style>
${(0, styles_1.getBaseStyles)()}

body { display:flex; flex-direction:column; height:100vh; overflow:hidden; }

/* ── App shell ───────────────────────── */
.topbar {
  display: flex; align-items: center; gap: 14px;
  padding: 12px 20px;
  border-bottom: 1px solid var(--border);
  background: var(--bg-surface);
  flex-shrink: 0;
}
.logo {
  display: flex; align-items: center; gap: 10px;
}
.logo-icon {
  width: 32px; height: 32px;
  background: var(--accent-blue);
  border-radius: 6px;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 0 16px rgba(47,129,247,0.35);
  flex-shrink: 0;
}
.logo-icon svg { width: 18px; height: 18px; }
.logo-title { font-size: 15px; font-weight: 700; letter-spacing: -0.02em; }
.logo-sub { font-size: 11px; color: var(--text-muted); font-family: var(--font-mono); }

/* ── Stat strip ──────────────────────── */
.stat-strip {
  display: flex; gap: 2px;
  align-items: center;
  margin-left: auto;
}
.stat-chip {
  display: flex; align-items: center; gap: 5px;
  padding: 5px 12px; border-radius: 3px;
  font-size: 12px; font-weight: 600;
  font-family: var(--font-mono);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
}
.stat-chip + .stat-chip { margin-left: 4px; }
.stat-chip.red   { color: var(--red);   background: var(--red-subtle);   border-color: rgba(248,81,73,0.25); }
.stat-chip.green { color: var(--green); background: var(--green-subtle); border-color: rgba(63,185,80,0.25); }
.stat-chip.blue  { color: var(--accent-blue-hover); background: var(--accent-blue-subtle); border-color: rgba(47,129,247,0.25); }

/* ── Tab nav ─────────────────────────── */
.tabnav {
  display: flex; align-items: center; gap: 2px;
  padding: 10px 20px 0;
  border-bottom: 1px solid var(--border);
  background: var(--bg-base);
  flex-shrink: 0;
}
.tab-btn {
  padding: 7px 14px; border-radius: var(--radius-sm) var(--radius-sm) 0 0;
  font-family: var(--font-ui); font-size: 12px; font-weight: 500;
  color: var(--text-secondary); background: transparent;
  border: 1px solid transparent; border-bottom: none;
  cursor: pointer; transition: var(--transition);
  margin-bottom: -1px; position: relative;
}
.tab-btn:hover { color: var(--text-primary); background: var(--bg-surface); }
.tab-btn.active {
  color: var(--text-primary);
  background: var(--bg-base);
  border-color: var(--border);
  border-bottom-color: var(--bg-base);
}

/* ── Action bar ──────────────────────── */
.actionbar {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 20px;
  border-bottom: 1px solid var(--border-subtle);
  flex-shrink: 0;
}
.actionbar .spacer { flex: 1; }

/* ── Content ─────────────────────────── */
.content {
  flex: 1; overflow-y: auto;
  padding: 20px;
  background: var(--bg-base);
}

/* ── Shared table utils ───────────────── */
.col-head { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); }
.tbl-lbl { font-size: 11px; color: var(--text-secondary); padding: 4px 12px 4px 0; vertical-align: top; white-space: nowrap; }
.tbl-val { font-size: 11px; color: var(--text-primary); padding: 4px 0; }

/* ── Scan content ────────────────────── */
.scan-header { }
.stats-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.issue-row {
  display: flex; gap: 12px; align-items: flex-start;
  padding: 12px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg-surface);
  margin-bottom: 8px;
}
.issue-body { flex: 1; min-width: 0; }
.issue-title { font-size: 12px; font-weight: 600; color: var(--text-primary); }

/* ── Policy rows ─────────────────────── */
.policy-row {
  padding: 12px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg-surface);
  margin-bottom: 8px;
}
.policy-row-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
.policy-detail { font-size: 11px; color: var(--text-secondary); margin-top: 4px; display: flex; gap: 8px; align-items: flex-start; }
.policy-detail code { color: var(--text-code); background: var(--bg-elevated); padding: 1px 5px; border-radius: 3px; font-size: 10.5px; word-break: break-all; }
.policy-reason { font-size: 11px; color: var(--text-muted); margin-top: 6px; font-style: italic; }

/* ── Live pulse ──────────────────────── */
.live-dot {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 11px; color: var(--green); font-family: var(--font-mono);
}
</style>
</head>
<body>

<!-- TOP BAR -->
<div class="topbar">
  <div class="logo">
    <div class="logo-icon">
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M12 2L3 6v6c0 5.25 3.75 10.15 9 11.25C17.25 22.15 21 17.25 21 12V6L12 2z" fill="white" fill-opacity="0.95"/>
        <path d="M9.5 12.5l2 2 3.5-3.5" stroke="#2F81F7" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </div>
    <div>
      <div class="logo-title">VibeSec</div>
      <div class="logo-sub">AI Agent Security Dashboard</div>
    </div>
  </div>

  <div class="stat-strip">
    ${s.stats.blockedToday > 0
            ? `<div class="stat-chip red">🚫 ${s.stats.blockedToday} Blocked</div>`
            : `<div class="stat-chip green">✅ 0 Blocked</div>`}
    <div class="stat-chip blue">${s.stats.totalToday} Actions</div>
    ${s.watching ? `<div class="stat-chip green live-dot"><span class="dot dot-live"></span> Live</div>` : ''}
    ${!s.initialized ? `<div class="stat-chip" style="color:var(--amber)">⚠ Not Init</div>` : ''}
  </div>

  <div style="display:flex;gap:6px;margin-left:8px;">
    <button class="btn btn-primary" onclick="post('runScan')">⚡ Scan</button>
    ${watchBtn}
  </div>
</div>

<!-- TAB NAV -->
<nav class="tabnav">${tabNav}</nav>

<!-- CONTENT -->
<main class="content">
  ${!s.initialized ? `
    <div style="display:flex;align-items:center;gap:12px;padding:12px 16px;background:var(--amber-subtle);border:1px solid rgba(210,153,34,0.3);border-radius:var(--radius);margin-bottom:16px;">
      <span style="font-size:16px">⚠️</span>
      <div style="flex:1">
        <div style="font-weight:600;font-size:12px;color:var(--amber)">VibeSec not initialized</div>
        <div style="font-size:11px;color:var(--text-secondary);margin-top:2px">Run <code style="color:var(--text-code)">vibesec init</code> to set up protection for this project.</div>
      </div>
      <button class="btn btn-ghost" style="font-size:11px" onclick="post('init')">Initialize</button>
    </div>` : ''}
  ${tabContent}
</main>

<script>
  const vscode = acquireVsCodeApi();
  function post(cmd, data) { vscode.postMessage({ command: cmd, ...data }); }
  function setTab(tab) { vscode.postMessage({ command: 'setTab', tab }); }
</script>
</body>
</html>`;
    }
    dispose() {
        clearInterval(this._refreshTimer);
        DashboardPanel._currentPanel = undefined;
        this._panel.dispose();
        while (this._disposables.length) {
            this._disposables.pop()?.dispose();
        }
    }
}
exports.DashboardPanel = DashboardPanel;
