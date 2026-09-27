import { VibeSecStateMachine } from '../core/state/stateMachine.js';
import { PolicyEngine } from '../policy/policyEngine.js';
import { RiskEngine } from '../risk/riskEngine.js';
import { ActionExecutor, ExecutionResult } from '../execution/actionExecutor.js';
import { SQLiteLedger } from '../ledger/sqliteLedger.js';
import { AgentAdapter, RawAgentPayload } from './agentAdapter.js';
import { AgentAction, AuditLogEntry, SecurityDecision } from '../types/domain.js';

export type AskUserHandler = (action: AgentAction, reason: string) => Promise<boolean>;

export class VibeSecInterceptor {
  private stateMachine: VibeSecStateMachine;
  private adapter: AgentAdapter;
  private policyEngine: PolicyEngine;
  private riskEngine: RiskEngine;
  private executor: ActionExecutor;
  private ledger: SQLiteLedger;
  private askUserHandler?: AskUserHandler;
  private projectId: string;

  constructor(options?: {
    projectId?: string;
    dbPath?: string;
    policyEngine?: PolicyEngine;
    askUserHandler?: AskUserHandler;
    workingDir?: string;
  }) {
    this.projectId = options?.projectId || 'default-project';
    this.stateMachine = new VibeSecStateMachine('START');
    this.adapter = new AgentAdapter();
    this.policyEngine = options?.policyEngine || new PolicyEngine();
    this.riskEngine = new RiskEngine();
    this.executor = new ActionExecutor(options?.workingDir);
    this.ledger = new SQLiteLedger(options?.dbPath || '.vibesec/vibesec.db');
    this.askUserHandler = options?.askUserHandler;

    // Fast-forward initial lifecycle state
    this.stateMachine.transitionTo('PROJECT_CONNECTED');
    this.stateMachine.transitionTo('AGENT_CONNECTED');
    this.stateMachine.transitionTo('AGENT_RUNNING');
  }

  public setAskUserHandler(handler: AskUserHandler): void {
    this.askUserHandler = handler;
  }

  public async processAction(rawPayload: RawAgentPayload): Promise<{
    action: AgentAction;
    decision: SecurityDecision;
    executionStatus: 'success' | 'failure' | 'skipped';
    executionResult?: ExecutionResult;
    audit: AuditLogEntry;
  }> {
    await this.ledger.ensureInitialized();

    // State: AGENT_RUNNING -> ACTION_DETECTED
    this.stateMachine.transitionTo('ACTION_DETECTED');
    const action = this.adapter.normalize(rawPayload);

    // State: ACTION_DETECTED -> RISK_EVALUATION
    this.stateMachine.transitionTo('RISK_EVALUATION');
    const policyDecision = this.policyEngine.evaluatePolicy(action);
    const riskAssessment = this.riskEngine.assessRisk(action);

    let finalDecision: SecurityDecision = { ...policyDecision };

    // Combine policy decision with risk engine recommendation
    if (policyDecision.decision === 'allow' && (riskAssessment.recommendedDecision === 'ask' || riskAssessment.recommendedDecision === 'block')) {
      finalDecision.decision = riskAssessment.recommendedDecision;
      finalDecision.reason = `${policyDecision.reason} (Risk Engine elevated to ${riskAssessment.tier.toUpperCase()}: ${riskAssessment.factors.join(', ')})`;
    }

    let isApproved = false;

    if (finalDecision.decision === 'allow') {
      isApproved = true;
      this.stateMachine.transitionTo('EXECUTING');
    } else if (finalDecision.decision === 'ask') {
      this.stateMachine.transitionTo('WAITING_FOR_APPROVAL');
      if (this.askUserHandler) {
        isApproved = await this.askUserHandler(action, finalDecision.reason);
      } else {
        // Fail closed if no prompt handler present for ASK decisions
        isApproved = false;
      }

      if (isApproved) {
        finalDecision.decision = 'allow';
        finalDecision.approvedBy = 'user';
        this.stateMachine.transitionTo('EXECUTING');
      } else {
        finalDecision.decision = 'block';
        finalDecision.reason = `${finalDecision.reason} [Denied by user or prompt failure]`;
        this.stateMachine.transitionTo('BLOCKED');
      }
    } else {
      // BLOCK decision
      this.stateMachine.transitionTo('BLOCKED');
    }

    let executionResult: ExecutionResult | undefined;
    let executionStatus: 'success' | 'failure' | 'skipped' = 'skipped';

    if (isApproved && this.stateMachine.getState() === 'EXECUTING') {
      executionResult = await this.executor.execute(action);
      executionStatus = executionResult.success ? 'success' : 'failure';
      this.stateMachine.transitionTo('ACTION_EXECUTED');
    } else {
      this.stateMachine.transitionTo('ACTION_EXECUTED');
    }

    // Log to SQLite Ledger
    const audit = this.ledger.logEvent({
      projectId: this.projectId,
      agent: action.agent,
      actionType: action.actionType,
      target: action.target,
      decision: finalDecision.decision,
      reason: finalDecision.reason,
      executionStatus,
    });

    // Reset state back to AGENT_RUNNING for next action
    this.stateMachine.transitionTo('COMPLETED');
    this.stateMachine.transitionTo('AGENT_RUNNING');

    return {
      action,
      decision: finalDecision,
      executionStatus,
      executionResult,
      audit,
    };
  }

  public getLedger(): SQLiteLedger {
    return this.ledger;
  }

  public getStateMachine(): VibeSecStateMachine {
    return this.stateMachine;
  }

  public close(): void {
    this.ledger.close();
  }
}
