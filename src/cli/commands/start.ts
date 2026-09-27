import fs from 'fs';
import path from 'path';
import { confirm } from '@clack/prompts';
import { VibeSecInterceptor } from '../../gateway/interceptor.js';
import { PolicyEngine } from '../../policy/policyEngine.js';

export async function startGateway(projectDir: string = process.cwd()): Promise<void> {
  const vibesecDir = path.join(projectDir, '.vibesec');
  const policyFile = path.join(vibesecDir, 'policy.yaml');
  const dbFile = path.join(vibesecDir, 'vibesec.db');

  if (!fs.existsSync(vibesecDir)) {
    console.log('\n\x1b[31m✖ VibeSec is not initialized.\x1b[0m Please run \x1b[36mvibesec init\x1b[0m first.\n');
    return;
  }

  const policyEngine = new PolicyEngine();
  if (fs.existsSync(policyFile)) {
    const yamlStr = fs.readFileSync(policyFile, 'utf-8');
    policyEngine.loadYamlPolicy(yamlStr);
  }

  const interceptor = new VibeSecInterceptor({
    projectId: path.basename(projectDir),
    dbPath: dbFile,
    policyEngine,
    askUserHandler: async (action, reason) => {
      console.log(`\n\x1b[33m⚠ Approval Required\x1b[0m`);
      console.log(`Agent:   \x1b[36m${action.agent}\x1b[0m`);
      console.log(`Action:  \x1b[36m${action.actionType}\x1b[0m -> \x1b[33m${action.target}\x1b[0m`);
      console.log(`Reason:  ${reason}\n`);

      const res = await confirm({
        message: 'Do you approve this AI agent action?',
        initialValue: false,
      });

      return Boolean(res);
    },
  });

  console.log('\n\x1b[32m✔ VibeSec Gateway active and protecting project!\x1b[0m');
  console.log('Listening for AI Agent actions (Claude Code / Cursor / Codex)...\n');
}
