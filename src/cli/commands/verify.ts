import { VerificationEngine } from '../../verification/verificationEngine.js';

export async function runVerifyCommand(projectDir: string = process.cwd()): Promise<void> {
  console.log('\n\x1b[1m=== Running VibeSec Verification Engine ===\x1b[0m\n');

  const engine = new VerificationEngine(
    {
      testCommand: 'npm test',
      buildCommand: 'npm run build',
    },
    projectDir
  );

  const result = await engine.runVerification();

  result.checks.forEach((check) => {
    const statusStr = check.passed ? '\x1b[32m✔ PASS\x1b[0m' : '\x1b[31m✖ FAIL\x1b[0m';
    console.log(`[${statusStr}] \x1b[1m${check.name}\x1b[0m (${check.durationMs}ms)`);
    if (!check.passed && check.output) {
      console.log(`\x1b[31m${check.output.slice(0, 300)}\x1b[0m`);
    }
  });

  console.log('--------------------------------------------------');
  if (result.status === 'pass') {
    console.log('\x1b[32m✔ Project verification PASSED!\x1b[0m State: \x1b[36mCOMPLETED\x1b[0m\n');
  } else {
    console.log('\x1b[31m✖ Project verification FAILED!\x1b[0m State: \x1b[33mRECOVERY (Run vibesec rollback)\x1b[0m\n');
  }
}
