import fs from 'fs';
import path from 'path';
import { parse as parseYaml } from 'yaml';
import { PolicyConfig } from '../../types/domain.js';

export function showPolicy(projectDir: string = process.cwd()): void {
  const policyFile = path.join(projectDir, '.vibesec', 'policy.yaml');

  if (!fs.existsSync(policyFile)) {
    console.log('\n\x1b[31m✖ No policy configuration found.\x1b[0m Please run \x1b[36mvibesec init\x1b[0m.\n');
    return;
  }

  const rawYaml = fs.readFileSync(policyFile, 'utf-8');
  const parsed = parseYaml(rawYaml) as PolicyConfig;

  console.log(`\n\x1b[1m=== Active VibeSec Policy Configuration ===\x1b[0m`);
  console.log(`Version: \x1b[36m${parsed.version}\x1b[0m | Default Fallback: \x1b[33m${parsed.default_decision.toUpperCase()}\x1b[0m\n`);

  console.log('\x1b[1mConfigured Rules:\x1b[0m');
  parsed.rules.forEach((rule, idx) => {
    let decColor = '\x1b[32m';
    if (rule.decision === 'block') decColor = '\x1b[31m';
    if (rule.decision === 'ask') decColor = '\x1b[33m';

    console.log(` ${idx + 1}. [${decColor}${rule.decision.toUpperCase()}\x1b[0m] \x1b[1m${rule.id}\x1b[0m`);
    if (rule.resource) console.log(`    Resource Pattern: \x1b[36m${rule.resource}\x1b[0m`);
    if (rule.command_pattern) console.log(`    Command Pattern:  \x1b[36m${rule.command_pattern}\x1b[0m`);
    console.log(`    Reason:           ${rule.reason}`);
  });
  console.log('');
}
