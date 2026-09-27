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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const SidebarProvider_1 = require("./sidebar/SidebarProvider");
const DashboardPanel_1 = require("./panels/DashboardPanel");
const StatusBarController_1 = require("./statusBar/StatusBarController");
const VibeSecService_1 = require("./services/VibeSecService");
let statusBarController;
let vibeSecService;
function activate(context) {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    // ─── Core Service ──────────────────────────────────────────────
    vibeSecService = new VibeSecService_1.VibeSecService(workspaceRoot);
    // ─── Status Bar ────────────────────────────────────────────────
    statusBarController = new StatusBarController_1.StatusBarController(context, vibeSecService);
    statusBarController.show();
    // ─── Sidebar Webview ───────────────────────────────────────────
    const sidebarProvider = new SidebarProvider_1.SidebarProvider(context, vibeSecService);
    context.subscriptions.push(vscode.window.registerWebviewViewProvider('vibesec.sidebarView', sidebarProvider, {
        webviewOptions: { retainContextWhenHidden: true },
    }));
    // ─── Commands ──────────────────────────────────────────────────
    context.subscriptions.push(vscode.commands.registerCommand('vibesec.openDashboard', () => {
        DashboardPanel_1.DashboardPanel.createOrShow(context, vibeSecService);
    }), vscode.commands.registerCommand('vibesec.runScan', async () => {
        vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: '🛡️ VibeSec: Scanning project...', cancellable: false }, async () => {
            await vibeSecService.runScan();
            sidebarProvider.refresh();
            DashboardPanel_1.DashboardPanel.refresh();
            statusBarController.update();
        });
    }), vscode.commands.registerCommand('vibesec.startWatch', async () => {
        await vibeSecService.startWatch();
        statusBarController.update();
        sidebarProvider.refresh();
        vscode.window.showInformationMessage('🛡️ VibeSec Live Guardian started.');
    }), vscode.commands.registerCommand('vibesec.stopWatch', async () => {
        vibeSecService.stopWatch();
        statusBarController.update();
        sidebarProvider.refresh();
        vscode.window.showInformationMessage('VibeSec Live Guardian stopped.');
    }), vscode.commands.registerCommand('vibesec.showLogs', () => {
        DashboardPanel_1.DashboardPanel.createOrShow(context, vibeSecService, 'logs');
    }), vscode.commands.registerCommand('vibesec.showPolicy', () => {
        DashboardPanel_1.DashboardPanel.createOrShow(context, vibeSecService, 'policy');
    }), vscode.commands.registerCommand('vibesec.init', async () => {
        await vibeSecService.initProject();
        sidebarProvider.refresh();
        statusBarController.update();
        vscode.window.showInformationMessage('✅ VibeSec initialized for this project!');
    }));
    // ─── Auto-watch on startup ─────────────────────────────────────
    const config = vscode.workspace.getConfiguration('vibesec');
    if (config.get('autoWatch') && workspaceRoot) {
        vibeSecService.startWatch();
        statusBarController.update();
    }
    // ─── Config change listener ────────────────────────────────────
    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration('vibesec')) {
            statusBarController?.update();
            sidebarProvider.refresh();
        }
    }));
}
function deactivate() {
    vibeSecService?.stopWatch();
    statusBarController?.dispose();
}
