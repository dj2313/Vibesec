import fs from 'fs';
import path from 'path';
import { confirm } from '@clack/prompts';
import { VibeSecInterceptor } from '../../gateway/interceptor.js';
import { PolicyEngine } from '../../policy/policyEngine.js';

export async function execCommand(
  actionString: string,
  options: { agent?: string; read?: string; write?: string },
  projectDir: string = process.cwd()
): Promise<void> {
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
      console.log(`\n\x1b[33m⚠ Approval Required by Policy\x1b[0m`);
      console.log(`Agent:   \x1b[36m${action.agent}\x1b[0m`);
      console.log(`Target:  \x1b[33m${action.target}\x1b[0m`);
      console.log(`Reason:  ${reason}\n`);

      const res = await confirm({
        message: 'Do you approve execution of this action?',
        initialValue: false,
      });

      return Boolean(res);
    },
  });

  let rawPayload: any = {
    agent: options.agent || 'claude-code',
  };

  if (options.read) {
    rawPayload.actionType = 'read_file';
    rawPayload.target = options.read;
  } else if (options.write) {
    rawPayload.actionType = 'write_file';
    rawPayload.target = options.write;
  } else {
    rawPayload.command = actionString;
  }

  const result = await interceptor.processAction(rawPayload);
  interceptor.close();

  const { decision, executionResult } = result;

  if (decision.decision === 'block') {
    console.log(`\n\x1b[31m✖ Action BLOCKED by VibeSec Policy!\x1b[0m`);
    console.log(`Target: \x1b[36m${result.action.target}\x1b[0m`);
    console.log(`Reason: \x1b[33m${decision.reason}\x1b[0m\n`);
  } else if (decision.decision === 'allow') {
    console.log(`\n\x1b[32m✔ Action ALLOWED by VibeSec Policy\x1b[0m`);
    if (executionResult?.stdout) {
      console.log(executionResult.stdout.trim());
    }
    console.log(`\x1b[36m[Event logged to SQLite Ledger]\x1b[0m\n`);
  }
}
