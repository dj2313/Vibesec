import fs from 'fs';
import path from 'path';
import os from 'os';
import { select, multiselect } from '@clack/prompts';
import { stringify as stringifyYaml } from 'yaml';
import { DEFAULT_POLICY_CONFIG } from '../../policy/policyEngine.js';
import { SQLiteLedger } from '../../ledger/sqliteLedger.js';
import { logger } from '../../utils/logger.js';

export async function protectCommand(options?: { global?: boolean; local?: boolean }): Promise<void> {
  let scope = options?.global ? 'global' : options?.local ? 'local' : null;

  if (!scope) {
    const chosenScope = await select({
      message: 'Select VibeSec Protection Scope:',
      options: [
        { value: 'global', label: 'Global System-Wide', hint: 'Protects ALL projects across this computer in ~/.vibesec/' },
        { value: 'local', label: 'Local Project Directory', hint: 'Protects current repository directory in ./.vibesec/' },
      ],
    });

    if (!chosenScope || typeof chosenScope !== 'string') {
      logger.warn('Protection setup cancelled.');
      return;
    }
    scope = chosenScope;
  }

  const selectedAgents = await multiselect({
    message: 'Select AI Agents & IDEs to protect:',
    options: [
      { value: 'shell', label: 'Terminal / Shell Agents (Claude Code, Aider, Raw CLI)', hint: 'Default shell interceptor' },
      { value: 'cursor', label: 'Cursor IDE', hint: 'Hooks & shell proxy' },
      { value: 'vscode', label: 'VS Code / Windsurf / Cline / Roo Code', hint: 'Extension & tool interceptor' },
      { value: 'mcp', label: 'Generic MCP Tool Proxy', hint: 'Model Context Protocol governance' },
    ],
    initialValues: ['shell', 'cursor', 'vscode'],
  });

  const isGlobal = scope === 'global';
  const targetDir = isGlobal ? path.join(os.homedir(), '.vibesec') : path.join(process.cwd(), '.vibesec');
  const policyFile = path.join(targetDir, 'policy.yaml');
  const configFile = path.join(targetDir, 'config.json');
  const dbFile = path.join(targetDir, 'vibesec.db');

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  if (!fs.existsSync(policyFile)) {
    const yamlStr = stringifyYaml(DEFAULT_POLICY_CONFIG);
    fs.writeFileSync(policyFile, yamlStr, 'utf-8');
  }

  if (!fs.existsSync(configFile)) {
    const config = {
      scope,
      agents: selectedAgents,
      createdAt: new Date().toISOString(),
    };
    fs.writeFileSync(configFile, JSON.stringify(config, null, 2), 'utf-8');
  }

  const ledger = new SQLiteLedger(dbFile);
  await ledger.ensureInitialized();
  ledger.close();

  // If local, configure .claude/hooks/pre-command.sh automatically
  if (!isGlobal) {
    const claudeHooksDir = path.join(process.cwd(), '.claude', 'hooks');
    if (!fs.existsSync(claudeHooksDir)) {
      fs.mkdirSync(claudeHooksDir, { recursive: true });
    }
    const hookScript = path.join(claudeHooksDir, 'pre-command.sh');
    const hookContent = `#!/bin/sh\n# VibeSec Auto-Hook\nnpx vibesec exec "$@"\n`;
    fs.writeFileSync(hookScript, hookContent, { mode: 0o755 });
  }

  console.log('\n\x1b[32m✔ VibeSec protection configured successfully!\x1b[0m');
  console.log(`Scope:       \x1b[36m${scope.toUpperCase()}\x1b[0m`);
  console.log(`Target Dir:  \x1b[36m${targetDir}\x1b[0m`);
  console.log(`Agents:      \x1b[33m${Array.isArray(selectedAgents) ? selectedAgents.join(', ') : 'all'}\x1b[0m\n`);
}
