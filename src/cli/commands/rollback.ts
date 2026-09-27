import { RecoveryEngine } from '../../recovery/recoveryEngine.js';

export async function runRollbackCommand(projectDir: string = process.cwd()): Promise<void> {
  console.log('\n\x1b[1m=== VibeSec Recovery & Rollback Engine ===\x1b[0m\n');

  const recovery = new RecoveryEngine(projectDir);
  const success = await recovery.rollbackLatest();

  if (success) {
    console.log('\x1b[32m✔ Project restored to last safe checkpoint!\x1b[0m\n');
  } else {
    console.log('\x1b[31m✖ Failed to perform rollback (Not a Git repo or working tree clean).\x1b[0m\n');
  }
}
