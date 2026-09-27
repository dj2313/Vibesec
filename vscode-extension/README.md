# VibeSec VS Code Extension

> 🛡️ Real-time security control layer for AI coding agents — as a VS Code Extension.

## Features

| Feature | Description |
|---|---|
| **Activity Bar Sidebar** | Live threat feed, stats, quick-action buttons |
| **Full Dashboard Panel** | Tabbed: Overview · Audit Logs · Scan Results · Policy |
| **Status Bar** | Protected status, blocked count, live guardian indicator |
| **Live Guardian** | Real-time file watch with threat alerts |
| **Security Scan** | Deep scan for secrets and dangerous patterns |
| **Audit Logs** | Complete event history with agent/target/decision |
| **Policy Viewer** | See all active YAML policy rules |

## Requirements

VibeSec CLI must be built in the workspace root (`npm run build`).

## Quick Start

1. Open `h:\Vibesec` in VS Code
2. Install the extension (see below)
3. Click the **VibeSec shield** icon in the Activity Bar
4. Use `VibeSec: Open Security Dashboard` from the Command Palette

## Installation

### From VSIX (recommended)

```
Extensions → ⋯ → Install from VSIX → select vibesec-0.1.0.vsix
```

### Dev mode (F5)

Open `vscode-extension/` in VS Code and press **F5** to launch Extension Development Host.

## Commands

| Command | Shortcut |
|---|---|
| `VibeSec: Open Security Dashboard` | Click status bar |
| `VibeSec: Run Security Scan` | Sidebar button |
| `VibeSec: Start Live Guardian` | Sidebar button |
| `VibeSec: Stop Live Guardian` | Status bar |
| `VibeSec: Show Audit Logs` | Dashboard → Audit Logs tab |
| `VibeSec: Show Policy Rules` | Dashboard → Policy tab |
| `VibeSec: Initialize Project` | Command Palette |

## Settings

```json
{
  "vibesec.silent": false,
  "vibesec.autoWatch": false,
  "vibesec.refreshInterval": 3000
}
```
