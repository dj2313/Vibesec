import path from 'path';
import { LiveWatcher, WatcherEvent } from '../../execution/liveWatcher.js';

export async function watchCommand(options?: { silent?: boolean }): Promise<void> {
  const projectDir = process.cwd();
  console.log('\n\x1b[1m🛡️  VibeSec Live Workspace Guardian Daemon\x1b[0m');
  console.log(`Watching Directory: \x1b[36m${projectDir}\x1b[0m`);
  console.log(`Audible Alarm:      \x1b[33m${options?.silent ? 'MUTED' : 'ACTIVE (Siren on threat)'}\x1b[0m`);
  console.log(`Desktop Notice:     \x1b[32mACTIVE\x1b[0m\n`);
  console.log('Continuous protection is active. Press \x1b[33mCtrl+C\x1b[0m to stop guardian.\n');

  const watcher = new LiveWatcher({
    workingDir: projectDir,
    silent: options?.silent ?? false,
    onEvent: (event: WatcherEvent) => {
      const timeStr = new Date(event.timestamp).toLocaleTimeString();
      if (event.severity === 'critical') {
        console.log(`[${timeStr}] \x1b[41m\x1b[37m THREAT DETECTED \x1b[0m \x1b[31m${event.file}\x1b[0m`);
        console.log(`           \x1b[33m${event.details}\x1b[0m`);
      } else {
        console.log(`[${timeStr}] \x1b[36m[FILE EVENT]\x1b[0m ${event.file}`);
      }
    },
  });

  watcher.start();

  process.on('SIGINT', () => {
    console.log('\n\nStopping VibeSec Live Guardian...');
    watcher.stop();
    console.log('\x1b[32m✔ Live Guardian stopped.\x1b[0m\n');
    process.exit(0);
  });
}
