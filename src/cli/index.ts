#!/usr/bin/env node

import { Command } from 'commander';
import { initProject } from './commands/init.js';
import { execCommand } from './commands/exec.js';
import { startGateway } from './commands/start.js';
import { showStatus } from './commands/status.js';
import { showPolicy } from './commands/policy.js';
import { showLogs } from './commands/logs.js';
import { runVerifyCommand } from './commands/verify.js';
import { runRollbackCommand } from './commands/rollback.js';
import { protectCommand } from './commands/protect.js';
import { policyAddCommand } from './commands/policyAdd.js';

const program = new Command();

program
  .name('vibesec')
  .description('VibeSec — Security and Control Layer for AI Coding Agents')
  .version('0.1.0');

program
  .command('init')
  .description('Initialize VibeSec protection for the current project')
  .action(() => {
    initProject();
  });

program
  .command('protect')
  .description('Configure zero-touch agent protection (Global system-wide or Local project scope)')
  .option('-g, --global', 'Set up global system-wide protection in ~/.vibesec/')
  .option('-l, --local', 'Set up local project protection in ./.vibesec/')
  .action(async (options) => {
    await protectCommand(options);
  });

program
  .command('exec [command...]')
  .description('Run an action or shell command through VibeSec protection engine')
  .option('-a, --agent <type>', 'Specify agent name (claude-code, cursor, codex, vscode, windsurf)', 'claude-code')
  .option('-r, --read <file>', 'Simulate reading a target file')
  .option('-w, --write <file>', 'Simulate writing a target file')
  .action(async (commandArgs, options) => {
    const cmdStr = Array.isArray(commandArgs) ? commandArgs.join(' ') : commandArgs || '';
    await execCommand(cmdStr, options);
  });

program
  .command('start')
  .description('Start VibeSec gateway protection session')
  .action(async () => {
    await startGateway();
  });

program
  .command('status')
  .description('Display current VibeSec project protection status')
  .action(() => {
    showStatus();
  });

const policyCmd = program.command('policy').description('View or modify active security policy rules');

policyCmd
  .command('show', { isDefault: true })
  .description('Display active security policy rules')
  .action(() => {
    showPolicy();
  });

policyCmd
  .command('add')
  .description('Interactively add a new security policy rule')
  .action(async () => {
    await policyAddCommand();
  });

program
  .command('logs')
  .description('Query audit ledger logs')
  .option('-d, --decision <type>', 'Filter logs by decision type (allow, ask, block)')
  .option('-l, --limit <count>', 'Limit log entries count', '20')
  .action(async (options) => {
    await showLogs(options);
  });

program
  .command('verify')
  .description('Run project verification suite (tests, build, security)')
  .action(async () => {
    await runVerifyCommand();
  });

program
  .command('rollback')
  .description('Rollback project state to last safe checkpoint')
  .action(async () => {
    await runRollbackCommand();
  });

program.parse(process.argv);
