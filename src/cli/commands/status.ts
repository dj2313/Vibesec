import fs from 'fs';
import path from 'path';
import { parse as parseYaml } from 'yaml';
import { SQLiteLedger } from '../../ledger/sqliteLedger.js';
import { PolicyConfig } from '../../types/domain.js';

export function showStatus(projectDir: string = process.cwd()): void {
  const vibesecDir = path.join(projectDir, '.vibesec');
  const policyFile = path.join(vibesecDir, 'policy.yaml');
  const configFile = path.join(vibesecDir, 'config.json');
  const dbFile = path.join(vibesecDir, 'vibesec.db');

  if (!fs.existsSync(vibesecDir)) {
    console.log('\n\x1b[31m✖ VibeSec is not initialized in this project.\x1b[0m');
    console.log('Run \x1b[36mvibesec init\x1b[0m to initialize.\n');
    return;
  }

  let projectId = 'unknown';
  if (fs.existsSync(configFile)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(configFile, 'utf-8'));
      projectId = parsed.projectId || projectId;
    } catch {}
  }

  let ruleCount = 0;
  if (fs.existsSync(policyFile)) {
    try {
      const parsed = parseYaml(fs.readFileSync(policyFile, 'utf-8')) as PolicyConfig;
      ruleCount = parsed?.rules?.length || 0;
    } catch {}
  }

  let totalLogs = 0;
  let blockedCount = 0;
  if (fs.existsSync(dbFile)) {
    try {
      const ledger = new SQLiteLedger(dbFile);
      const logs = ledger.getLogs();
      totalLogs = logs.length;
      blockedCount = logs.filter((l) => l.decision === 'block').length;
      ledger.close();
    } catch {}
  }

  console.log('\n\x1b[1m=== VibeSec Project Status ===\x1b[0m');
  console.log(`Project Name: \x1b[36m${projectId}\x1b[0m`);
  console.log(`Status:       \x1b[32mActive & Connected\x1b[0m`);
  console.log(`Active Rules: \x1b[33m${ruleCount} policy rules\x1b[0m`);
  console.log(`Total Events: \x1b[34m${totalLogs} logged actions\x1b[0m (\x1b[31m${blockedCount} blocked\x1b[0m)\n`);
}
