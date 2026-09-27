import fs from 'fs';
import path from 'path';
import { SQLiteLedger } from '../../ledger/sqliteLedger.js';
import { DecisionType } from '../../types/domain.js';

export async function showLogs(
  options: { decision?: string; limit?: string },
  projectDir: string = process.cwd()
): Promise<void> {
  const dbFile = path.join(projectDir, '.vibesec', 'vibesec.db');

  if (!fs.existsSync(dbFile)) {
    console.log('\n\x1b[31m✖ No audit log database found.\x1b[0m Please run \x1b[36mvibesec init\x1b[0m.\n');
    return;
  }

  const ledger = new SQLiteLedger(dbFile);
  await ledger.ensureInitialized();

  const decisionFilter = options.decision as DecisionType | undefined;
  const limit = options.limit ? parseInt(options.limit, 10) : 20;

  const logs = ledger.getLogs({ decision: decisionFilter, limit });
  ledger.close();

  console.log(`\n\x1b[1m=== VibeSec Activity Audit Ledger (${logs.length} entries) ===\x1b[0m\n`);

  if (logs.length === 0) {
    console.log('No events recorded matching criteria.\n');
    return;
  }

  logs.forEach((log, idx) => {
    const timeStr = new Date(log.timestamp).toLocaleTimeString();
    let decisionBadge = '\x1b[42m\x1b[30m ALLOW \x1b[0m';
    if (log.decision === 'block') decisionBadge = '\x1b[41m\x1b[37m BLOCK \x1b[0m';
    if (log.decision === 'ask') decisionBadge = '\x1b[43m\x1b[30m  ASK  \x1b[0m';

    console.log(`${idx + 1}. [${timeStr}] ${decisionBadge} \x1b[1m${log.actionType}\x1b[0m`);
    console.log(`   Target: \x1b[36m${log.target}\x1b[0m`);
    console.log(`   Reason: ${log.reason}`);
    if (log.secretRedacted) {
      console.log(`   \x1b[35m🔒 [Secrets scrubbed from record]\x1b[0m`);
    }
    console.log('   ------------------------------------------------------------------');
  });
  console.log('');
}
