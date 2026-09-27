import initSqlJs, { Database as SqlDatabase } from 'sql.js';
import fs from 'fs';
import path from 'path';
import { AgentType, AuditLogEntry, DecisionType } from '../types/domain.js';
import { redactSecrets } from '../utils/scrubber.js';

export class SQLiteLedger {
  private db: SqlDatabase | null = null;
  private dbPath: string;
  private initialized: Promise<void>;

  constructor(dbPath: string = '.vibesec/vibesec.db') {
    this.dbPath = dbPath;
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    this.initialized = this.init();
  }

  private async init(): Promise<void> {
    const SQL = await initSqlJs();

    if (fs.existsSync(this.dbPath)) {
      const fileBuffer = fs.readFileSync(this.dbPath);
      this.db = new SQL.Database(fileBuffer);
    } else {
      this.db = new SQL.Database();
    }

    this.initSchema();
  }

  public async ensureInitialized(): Promise<void> {
    await this.initialized;
  }

  private initSchema(): void {
    if (!this.db) return;
    this.db.run(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        timestamp INTEGER NOT NULL,
        project_id TEXT NOT NULL,
        agent TEXT NOT NULL,
        action_type TEXT NOT NULL,
        target TEXT NOT NULL,
        decision TEXT NOT NULL,
        reason TEXT NOT NULL,
        execution_status TEXT,
        secret_redacted INTEGER NOT NULL
      );
    `);
    this.saveToDisk();
  }

  private saveToDisk(): void {
    if (!this.db) return;
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const data = this.db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(this.dbPath, buffer);
  }

  public logEvent(entry: {
    projectId: string;
    agent: AgentType;
    actionType: string;
    target: string;
    decision: DecisionType;
    reason: string;
    executionStatus?: 'success' | 'failure' | 'skipped';
  }): AuditLogEntry {
    if (!this.db) {
      throw new Error('Database not initialized yet');
    }

    const id = `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const timestamp = Date.now();

    const targetRedaction = redactSecrets(entry.target);
    const reasonRedaction = redactSecrets(entry.reason);

    const isSecretRedacted = targetRedaction.secretRedacted || reasonRedaction.secretRedacted;

    const auditEntry: AuditLogEntry = {
      id,
      timestamp,
      projectId: entry.projectId,
      agent: entry.agent,
      actionType: entry.actionType as any,
      target: targetRedaction.redactedText,
      decision: entry.decision,
      reason: reasonRedaction.redactedText,
      executionStatus: entry.executionStatus || 'skipped',
      secretRedacted: isSecretRedacted,
    };

    this.db.run(
      `INSERT INTO audit_logs (id, timestamp, project_id, agent, action_type, target, decision, reason, execution_status, secret_redacted)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        auditEntry.id,
        auditEntry.timestamp,
        auditEntry.projectId,
        auditEntry.agent,
        auditEntry.actionType,
        auditEntry.target,
        auditEntry.decision,
        auditEntry.reason,
        auditEntry.executionStatus || 'skipped',
        auditEntry.secretRedacted ? 1 : 0,
      ]
    );

    this.saveToDisk();
    return auditEntry;
  }

  public getLogs(options?: {
    decision?: DecisionType;
    agent?: AgentType;
    limit?: number;
  }): AuditLogEntry[] {
    if (!this.db) return [];

    let query = 'SELECT * FROM audit_logs';
    const params: any[] = [];
    const conditions: string[] = [];

    if (options?.decision) {
      conditions.push('decision = ?');
      params.push(options.decision);
    }

    if (options?.agent) {
      conditions.push('agent = ?');
      params.push(options.agent);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY timestamp DESC';

    if (options?.limit) {
      query += ' LIMIT ?';
      params.push(options.limit);
    }

    const res = this.db.exec(query, params);
    if (!res || res.length === 0) return [];

    const columns = res[0].columns;
    const values = res[0].values;

    return values.map((row) => {
      const obj: any = {};
      columns.forEach((col, idx) => {
        obj[col] = row[idx];
      });

      return {
        id: obj.id,
        timestamp: obj.timestamp,
        projectId: obj.project_id,
        agent: obj.agent as AgentType,
        actionType: obj.action_type,
        target: obj.target,
        decision: obj.decision as DecisionType,
        reason: obj.reason,
        executionStatus: obj.execution_status,
        secretRedacted: Boolean(obj.secret_redacted),
      };
    });
  }

  public close(): void {
    if (this.db) {
      this.saveToDisk();
      this.db.close();
      this.db = null;
    }
  }
}
