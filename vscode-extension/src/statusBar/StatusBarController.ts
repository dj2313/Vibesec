import * as vscode from 'vscode';
import { VibeSecService } from '../services/VibeSecService';

export class StatusBarController {
  private _statusItem: vscode.StatusBarItem;
  private _watchItem: vscode.StatusBarItem;
  private _service: VibeSecService;
  private _disposable: vscode.Disposable;

  constructor(context: vscode.ExtensionContext, service: VibeSecService) {
    this._service = service;

    // Main status pill (left side)
    this._statusItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    this._statusItem.command = 'vibesec.openDashboard';
    this._statusItem.tooltip = 'VibeSec Security Guard — Click to open Dashboard';

    // Live watcher indicator (left side, secondary)
    this._watchItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 99);
    this._watchItem.command = 'vibesec.stopWatch';
    this._watchItem.tooltip = 'VibeSec Live Guardian is active — Click to stop';

    context.subscriptions.push(this._statusItem, this._watchItem);

    this._disposable = service.onDidChangeStatus(() => this.update());
    context.subscriptions.push(this._disposable);

    this.update();
  }

  public show(): void {
    this._statusItem.show();
  }

  public update(): void {
    const status = this._service.getStatus();

    if (!status.initialized) {
      this._statusItem.text = '$(shield) VibeSec';
      this._statusItem.backgroundColor = undefined;
      this._statusItem.color = new vscode.ThemeColor('statusBarItem.warningForeground');
      this._statusItem.tooltip = 'VibeSec not initialized — Click to open Dashboard';
      this._watchItem.hide();
      return;
    }

    const { blockedToday, totalToday } = status.stats;

    if (blockedToday > 0) {
      this._statusItem.text = `$(shield) VibeSec $(warning) ${blockedToday} Blocked`;
      this._statusItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
      this._statusItem.color = undefined;
    } else {
      this._statusItem.text = `$(shield) VibeSec $(check) Protected`;
      this._statusItem.backgroundColor = undefined;
      this._statusItem.color = undefined;
    }

    if (totalToday > 0) {
      this._statusItem.text += `  ${totalToday} actions`;
    }

    this._statusItem.show();

    // Watcher indicator
    if (status.watching) {
      this._watchItem.text = '$(eye) Live Guardian';
      this._watchItem.color = new vscode.ThemeColor('charts.green');
      this._watchItem.show();
    } else {
      this._watchItem.hide();
    }
  }

  public dispose(): void {
    this._statusItem.dispose();
    this._watchItem.dispose();
    this._disposable.dispose();
  }
}
