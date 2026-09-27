import { exec } from 'child_process';
import os from 'os';

export interface NotificationOptions {
  title: string;
  message: string;
  level?: 'info' | 'warning' | 'critical';
  silent?: boolean;
}

/**
 * Sends a native OS desktop notification across Windows, macOS, and Linux
 */
export async function sendDesktopNotification(options: NotificationOptions): Promise<void> {
  if (options.silent || process.env.VIBESEC_SILENT === 'true') {
    return;
  }

  const { title, message, level = 'info' } = options;
  const platform = os.platform();

  try {
    if (platform === 'win32') {
      const tipIcon = level === 'critical' ? 'Error' : level === 'warning' ? 'Warning' : 'Info';
      const cleanTitle = title.replace(/"/g, '`"');
      const cleanMessage = message.replace(/"/g, '`"');
      const psScript = `Add-Type -AssemblyName System.Windows.Forms; $notify = New-Object System.Windows.Forms.NotifyIcon; $notify.Icon = [System.Drawing.SystemIcons]::Information; $notify.BalloonTipIcon = [System.Windows.Forms.ToolTipIcon]::${tipIcon}; $notify.BalloonTipTitle = "${cleanTitle}"; $notify.BalloonTipText = "${cleanMessage}"; $notify.Visible = $True; $notify.ShowBalloonTip(4000); Start-Sleep -Milliseconds 400; $notify.Dispose()`;

      exec(`powershell -NoProfile -NonInteractive -Command "${psScript}"`, { timeout: 3000 }, () => {});
    } else if (platform === 'darwin') {
      const escapedMsg = message.replace(/"/g, '\\"');
      const escapedTitle = title.replace(/"/g, '\\"');
      exec(`osascript -e 'display notification "${escapedMsg}" with title "${escapedTitle}"'`, { timeout: 3000 }, () => {});
    } else {
      const urgency = level === 'critical' ? 'critical' : level === 'warning' ? 'normal' : 'low';
      exec(`notify-send -u ${urgency} "${title}" "${message}"`, { timeout: 3000 }, () => {});
    }
  } catch {
    // Non-blocking fallback
  }
}

