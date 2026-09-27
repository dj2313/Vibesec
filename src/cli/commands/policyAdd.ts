import fs from 'fs';
import path from 'path';
import { text, select } from '@clack/prompts';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { DecisionType, PolicyConfig, PolicyRule } from '../../types/domain.js';
import { logger } from '../../utils/logger.js';

export async function policyAddCommand(projectDir: string = process.cwd()): Promise<void> {
  const policyFile = path.join(projectDir, '.vibesec', 'policy.yaml');

  if (!fs.existsSync(policyFile)) {
    logger.error('No policy configuration found. Please run vibesec init first.');
    return;
  }

  const rawYaml = fs.readFileSync(policyFile, 'utf-8');
  const config = parseYaml(rawYaml) as PolicyConfig;

  const ruleId = await text({
    message: 'Enter Rule ID / Name:',
    placeholder: 'protect-my-secrets',
    validate: (val) => (val ? undefined : 'Rule ID is required'),
  });
  if (typeof ruleId !== 'string') return;

  const ruleType = await select({
    message: 'Select Rule Type:',
    options: [
      { value: 'resource', label: 'Resource / File Pattern (e.g. config/secrets.json)' },
      { value: 'command', label: 'Command Regex Pattern (e.g. .*docker compose down.*)' },
    ],
  });
  if (typeof ruleType !== 'string') return;

  const pattern = await text({
    message: ruleType === 'resource' ? 'Enter File Glob Pattern:' : 'Enter Command Regex Pattern:',
    placeholder: ruleType === 'resource' ? '**/secrets.json' : '.*docker compose.*',
    validate: (val) => (val ? undefined : 'Pattern is required'),
  });
  if (typeof pattern !== 'string') return;

  const decision = await select({
    message: 'Select Security Decision:',
    options: [
      { value: 'block', label: 'BLOCK (Strictly reject action)' },
      { value: 'ask', label: 'ASK (Require developer CLI approval)' },
      { value: 'allow', label: 'ALLOW (Permit action automatically)' },
    ],
  });
  if (typeof decision !== 'string') return;

  const reason = await text({
    message: 'Enter Security Reason / Explanation:',
    placeholder: 'Custom project security constraint',
  });
  if (typeof reason !== 'string') return;

  const newRule: PolicyRule = {
    id: ruleId,
    decision: decision as DecisionType,
    reason: reason || 'Custom user defined policy rule',
  };

  if (ruleType === 'resource') {
    newRule.resource = pattern;
  } else {
    newRule.command_pattern = pattern;
  }

  config.rules.unshift(newRule);
  fs.writeFileSync(policyFile, stringifyYaml(config), 'utf-8');

  logger.success(`Policy rule '${ruleId}' added successfully to ${policyFile}!`);
}
