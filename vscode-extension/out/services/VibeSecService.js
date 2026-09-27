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
exports.VibeSecService = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const child_process = __importStar(require("child_process"));
class VibeSecService {
    constructor(workspaceRoot) {
        this._watchProcess = null;
        this._onDidChangeStatus = new vscode.EventEmitter();
        this.onDidChangeStatus = this._onDidChangeStatus.event;
        this.workspaceRoot = workspaceRoot;
        this._status = this._buildEmptyStatus();
        this._loadStatus();
    }
    _buildEmptyStatus() {
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
    _loadStatus() {
        if (!this.workspaceRoot)
            return;
        const vibesecDir = path.join(this.workspaceRoot, '.vibesec');
        if (!fs.existsSync(vibesecDir)) {
            return;
        }
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
    _parsePolicy(policyFile) {
        try {
            const content = fs.readFileSync(policyFile, 'utf-8');
            const rules = [];
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
                        decision: decisionMatch[1].trim(),
                        reason: reasonMatch?.[1]?.trim() || '',
                        resource: resourceMatch?.[1]?.trim(),
                        command_pattern: cmdMatch?.[1]?.trim(),
                    });
                }
            }
            return rules;
        }
        catch {
            return [];
        }
    }
    _refreshLogs() {
        if (!this.workspaceRoot || !this._status.initialized)
            return;
        try {
            // Run vibesec logs command and capture JSON-like output
            const result = child_process.execSync('node dist/cli/index.js logs --limit 50', { cwd: this.workspaceRoot, timeout: 5000, encoding: 'utf-8' });
            this._status.logs = this._parseLogs(result);
            this._computeStats();
        }
        catch {
            // CLI not available or no logs yet — keep existing
        }
    }
    _parseLogs(raw) {
        const entries = [];
        const lines = raw.split('\n').filter(l => l.includes('│') || l.match(/\d{4}-\d{2}-\d{2}/));
        let id = 0;
        for (const line of lines) {
            const blockMatch = line.match(/BLOCK|block/i);
            const allowMatch = line.match(/ALLOW|allow/i);
            const askMatch = line.match(/ASK|ask/i);
            const agentMatch = line.match(/claude-code|cursor|codex|vscode|windsurf|generic/i);
            if (!blockMatch && !allowMatch && !askMatch)
                continue;
            if (!agentMatch)
                continue;
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
    _computeStats() {
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
    getStatus() {
        return this._status;
    }
    async initProject() {
        if (!this.workspaceRoot)
            throw new Error('No workspace open');
        await this._runCli('node dist/cli/index.js init');
        this._loadStatus();
        this._onDidChangeStatus.fire(this._status);
    }
    async runScan() {
        if (!this.workspaceRoot)
            throw new Error('No workspace open');
        const output = await this._runCli('node dist/cli/index.js scan --silent');
        const result = this._parseScanOutput(output);
        this._status.lastScan = result;
        this._onDidChangeStatus.fire(this._status);
        return result;
    }
    _parseScanOutput(raw) {
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
    async startWatch() {
        if (this._watchProcess)
            return;
        if (!this.workspaceRoot)
            return;
        const vibesecCliPath = path.join(this.workspaceRoot, 'dist', 'cli', 'index.js');
        const config = vscode.workspace.getConfiguration('vibesec');
        const silent = config.get('silent') ? '--silent' : '';
        this._watchProcess = child_process.spawn('node', [vibesecCliPath, 'watch', silent].filter(Boolean), { cwd: this.workspaceRoot, stdio: ['ignore', 'pipe', 'pipe'] });
        this._watchProcess.stdout?.on('data', (data) => {
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
    stopWatch() {
        this._watchProcess?.kill();
        this._watchProcess = null;
        this._status.watching = false;
        this._onDidChangeStatus.fire(this._status);
    }
    refresh() {
        this._refreshLogs();
        this._onDidChangeStatus.fire(this._status);
    }
    _runCli(cmd) {
        return new Promise((resolve, reject) => {
            child_process.exec(cmd, { cwd: this.workspaceRoot, timeout: 15000 }, (err, stdout, stderr) => {
                if (err && !stdout) {
                    reject(new Error(stderr || err.message));
                    return;
                }
                resolve(stdout + stderr);
            });
        });
    }
    dispose() {
        this.stopWatch();
        this._onDidChangeStatus.dispose();
    }
}
exports.VibeSecService = VibeSecService;
