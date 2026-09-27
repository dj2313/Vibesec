import fs from 'fs';
import path from 'path';
import { stringify as stringifyYaml } from 'yaml';
import { DEFAULT_POLICY_CONFIG } from '../../policy/policyEngine.js';
import { SQLiteLedger } from '../../ledger/sqliteLedger.js';

export function initProject(projectDir: string = process.cwd()): void {
  const vibesecDir = path.join(projectDir, '.vibesec');
  const policyFile = path.join(vibesecDir, 'policy.yaml');
  const configFile = path.join(vibesecDir, 'config.json');
  const dbFile = path.join(vibesecDir, 'vibesec.db');

  if (!fs.existsSync(vibesecDir)) {
    fs.mkdirSync(vibesecDir, { recursive: true });
  }

  if (!fs.existsSync(policyFile)) {
    const yamlStr = stringifyYaml(DEFAULT_POLICY_CONFIG);
    fs.writeFileSync(policyFile, yamlStr, 'utf-8');
  }

  if (!fs.existsSync(configFile)) {
    const config = {
      projectId: path.basename(projectDir) || 'my-project',
      version: '0.1.0',
      createdAt: new Date().toISOString(),
    };
    fs.writeFileSync(configFile, JSON.stringify(config, null, 2), 'utf-8');
  }

  // Initialize SQLite database table schema
  const ledger = new SQLiteLedger(dbFile);
  ledger.close();

  console.log('\n\x1b[32m✔ VibeSec initialized successfully!\x1b[0m');
  console.log(`Directory: \x1b[36m${vibesecDir}\x1b[0m`);
  console.log(`Policy:    \x1b[36m${policyFile}\x1b[0m`);
  console.log(`Ledger:    \x1b[36m${dbFile}\x1b[0m\n`);
}
