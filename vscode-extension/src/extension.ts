import * as vscode from 'vscode';
import { SidebarProvider } from './sidebar/SidebarProvider';
import { DashboardPanel } from './panels/DashboardPanel';
import { StatusBarController } from './statusBar/StatusBarController';
import { VibeSecService } from './services/VibeSecService';

let statusBarController: StatusBarController | undefined;
let vibeSecService: VibeSecService | undefined;

export function activate(context: vscode.ExtensionContext) {
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

  // ─── Core Service ──────────────────────────────────────────────
  vibeSecService = new VibeSecService(workspaceRoot);

  // ─── Status Bar ────────────────────────────────────────────────
  statusBarController = new StatusBarController(context, vibeSecService);
  statusBarController.show();

  // ─── Sidebar Webview ───────────────────────────────────────────
  const sidebarProvider = new SidebarProvider(context, vibeSecService);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('vibesec.sidebarView', sidebarProvider, {
      webviewOptions: { retainContextWhenHidden: true },
    })
  );

  // ─── Commands ──────────────────────────────────────────────────
  context.subscriptions.push(
    vscode.commands.registerCommand('vibesec.openDashboard', () => {
      DashboardPanel.createOrShow(context, vibeSecService!);
    }),

    vscode.commands.registerCommand('vibesec.runScan', async () => {
      vscode.window.withProgress(
        { location: vscode.ProgressLocation.Notification, title: '🛡️ VibeSec: Scanning project...', cancellable: false },
        async () => {
          await vibeSecService!.runScan();
          sidebarProvider.refresh();
          DashboardPanel.refresh();
          statusBarController!.update();
        }
      );
    }),

    vscode.commands.registerCommand('vibesec.startWatch', async () => {
      await vibeSecService!.startWatch();
      statusBarController!.update();
      sidebarProvider.refresh();
      vscode.window.showInformationMessage('🛡️ VibeSec Live Guardian started.');
    }),

    vscode.commands.registerCommand('vibesec.stopWatch', async () => {
      vibeSecService!.stopWatch();
      statusBarController!.update();
      sidebarProvider.refresh();
      vscode.window.showInformationMessage('VibeSec Live Guardian stopped.');
    }),

    vscode.commands.registerCommand('vibesec.showLogs', () => {
      DashboardPanel.createOrShow(context, vibeSecService!, 'logs');
    }),

    vscode.commands.registerCommand('vibesec.showPolicy', () => {
      DashboardPanel.createOrShow(context, vibeSecService!, 'policy');
    }),

    vscode.commands.registerCommand('vibesec.init', async () => {
      await vibeSecService!.initProject();
      sidebarProvider.refresh();
      statusBarController!.update();
      vscode.window.showInformationMessage('✅ VibeSec initialized for this project!');
    })
  );

  // ─── Auto-watch on startup ─────────────────────────────────────
  const config = vscode.workspace.getConfiguration('vibesec');
  if (config.get('autoWatch') && workspaceRoot) {
    vibeSecService.startWatch();
    statusBarController.update();
  }

  // ─── Config change listener ────────────────────────────────────
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('vibesec')) {
        statusBarController?.update();
        sidebarProvider.refresh();
      }
    })
  );
}

export function deactivate() {
  vibeSecService?.stopWatch();
  statusBarController?.dispose();
}
