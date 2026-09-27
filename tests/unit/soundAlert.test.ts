import { describe, it, expect, vi } from 'vitest';
import { playAlertSound } from '../../src/utils/soundAlert.js';
import { sendDesktopNotification } from '../../src/utils/notifier.js';

describe('SoundAlert & Notifier Engine', () => {
  it('does not trigger sound when silent flag is set', async () => {
    const writeSpy = vi.spyOn(process.stdout, 'write');
    await playAlertSound({ silent: true });
    expect(writeSpy).not.toHaveBeenCalled();
  });

  it('emits terminal alarm bell when not silent', async () => {
    const writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    await playAlertSound({ silent: false, type: 'warning' });
    expect(writeSpy).toHaveBeenCalledWith('\x07');
    writeSpy.mockRestore();
  });

  it('handles desktop notifications gracefully without throwing', async () => {
    await expect(
      sendDesktopNotification({
        title: 'VibeSec Test Alert',
        message: 'Testing notification system',
        level: 'warning',
        silent: true,
      })
    ).resolves.not.toThrow();
  });
});
