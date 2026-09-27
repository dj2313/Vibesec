import path from 'path';
import { ProjectScanner, SecurityIssue } from '../../intelligence/projectScanner.js';
import { playAlertSound } from '../../utils/soundAlert.js';
import { sendDesktopNotification } from '../../utils/notifier.js';

export async function scanCommand(options?: {
  silent?: boolean;
  maxFiles?: string;
  exitOnError?: boolean;
}): Promise<void> {
  const projectDir = process.cwd();
  console.log('\n\x1b[1m🛡️  VibeSec Deep Codebase Security & Secret Scanner\x1b[0m');
  console.log(`Directory: \x1b[36m${projectDir}\x1b[0m\n`);
  console.log('Scanning codebase for leaked secrets, .env exposure, and dangerous code patterns...\n');

  const scanner = new ProjectScanner(projectDir);
  const maxFiles = options?.maxFiles ? parseInt(options.maxFiles, 10) : 2000;
  const result = await scanner.scan({ maxFiles });

  if (result.issues.length === 0) {
    console.log('\x1b[32m✔ No security issues or leaked secrets detected!\x1b[0m');
    console.log(`Scanned \x1b[36m${result.scannedFilesCount}\x1b[0m files in \x1b[33m${result.durationMs}ms\x1b[0m.\n`);
    return;
  }

  // Trigger sound alarm if critical issues found
  if (result.summary.critical > 0 && !options?.silent) {
    playAlertSound({ type: 'siren' });
    sendDesktopNotification({
      title: '🚨 VibeSec Security Scan Alert',
      message: `Found ${result.summary.critical} CRITICAL security issues in ${path.basename(projectDir)}!`,
      level: 'critical',
    });
  }

  console.log(`\x1b[31m✖ Found ${result.issues.length} security issue(s) across ${result.scannedFilesCount} files:\x1b[0m\n`);

  result.issues.forEach((issue: SecurityIssue, idx: number) => {
    let badge = '\x1b[37m[INFO]\x1b[0m';
    if (issue.severity === 'critical') badge = '\x1b[41m\x1b[37m CRITICAL \x1b[0m';
    else if (issue.severity === 'high') badge = '\x1b[43m\x1b[30m HIGH \x1b[0m';
    else if (issue.severity === 'medium') badge = '\x1b[33m[MEDIUM]\x1b[0m';
    else if (issue.severity === 'low') badge = '\x1b[36m[LOW]\x1b[0m';

    const location = issue.line ? `${issue.file}:${issue.line}` : issue.file;
    console.log(`${idx + 1}. ${badge} \x1b[1m${issue.title}\x1b[0m`);
    console.log(`   Location: \x1b[36m${location}\x1b[0m`);
    if (issue.snippet) {
      console.log(`   Snippet:  \x1b[90m${issue.snippet}\x1b[0m`);
    }
    console.log(`   Fix:      \x1b[32m${issue.recommendation}\x1b[0m\n`);
  });

  console.log('--------------------------------------------------');
  console.log(`Summary: \x1b[31m${result.summary.critical} Critical\x1b[0m, \x1b[33m${result.summary.high} High\x1b[0m, \x1b[34m${result.summary.medium} Medium\x1b[0m, \x1b[36m${result.summary.low} Low\x1b[0m`);
  console.log(`Completed in \x1b[33m${result.durationMs}ms\x1b[0m.\n`);

  if (options?.exitOnError && result.summary.critical > 0) {
    process.exit(1);
  }
}
