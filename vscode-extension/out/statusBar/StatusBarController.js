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
exports.StatusBarController = void 0;
const vscode = __importStar(require("vscode"));
class StatusBarController {
    constructor(context, service) {
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
    show() {
        this._statusItem.show();
    }
    update() {
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
        }
        else {
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
        }
        else {
            this._watchItem.hide();
        }
    }
    dispose() {
        this._statusItem.dispose();
        this._watchItem.dispose();
        this._disposable.dispose();
    }
}
exports.StatusBarController = StatusBarController;
