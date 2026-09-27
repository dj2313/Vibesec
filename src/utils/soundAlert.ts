import { exec } from 'child_process';
import os from 'os';

export interface SoundAlertOptions {
  silent?: boolean;
  type?: 'alarm' | 'siren' | 'warning' | 'chime';
}

/**
 * Plays an audible alarm/siren tone across Windows, macOS, and Linux
 */
export async function playAlertSound(options: SoundAlertOptions = {}): Promise<void> {
  if (options.silent || process.env.VIBESEC_SILENT === 'true') {
    return;
  }

  const alertType = options.type || 'siren';
  const platform = os.platform();

  // Always emit terminal audible bell
  try {
    process.stdout.write('\x07');
  } catch {
    // Ignore terminal write errors
  }

  try {
    if (platform === 'win32') {
      if (alertType === 'siren' || alertType === 'alarm') {
        // High-low alternating siren beeps via PowerShell
        const psCommand = 'powershell -NoProfile -NonInteractive -Command "[console]::beep(1000,150); [console]::beep(600,150); [console]::beep(1200,200)"';
        exec(psCommand, { timeout: 3000 }, () => {});
      } else {
        // Warning chime
        const psCommand = 'powershell -NoProfile -NonInteractive -Command "[System.Media.SystemSounds]::Exclamation.Play()"';
        exec(psCommand, { timeout: 3000 }, () => {});
      }
    } else if (platform === 'darwin') {
      // macOS sound alert
      exec('afplay /System/Library/Sounds/Sosumi.aiff', { timeout: 3000 }, () => {});
    } else {
      // Linux pulse / beep / canberra sound
      exec('paplay /usr/share/sounds/freedesktop/stereo/dialog-warning.oga || canberra-gtk-play -i dialog-warning || printf "\\a"', { timeout: 3000 }, () => {});
    }
  } catch {
    // Non-blocking fallback
  }
}
