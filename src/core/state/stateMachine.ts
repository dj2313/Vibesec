import { AppState } from '../../types/domain.js';

export class InvalidStateTransitionError extends Error {
  constructor(public fromState: AppState, public toState: AppState, reason?: string) {
    super(`Invalid state transition from '${fromState}' to '${toState}'${reason ? `: ${reason}` : ''}`);
    this.name = 'InvalidStateTransitionError';
  }
}

export class VibeSecStateMachine {
  private currentState: AppState = 'START';
  private history: { state: AppState; timestamp: number }[] = [];

  constructor(initialState: AppState = 'START') {
    this.currentState = initialState;
    this.history.push({ state: initialState, timestamp: Date.now() });
  }

  public getState(): AppState {
    return this.currentState;
  }

  public getHistory(): ReadonlyArray<{ state: AppState; timestamp: number }> {
    return this.history;
  }

  private validTransitions: Record<AppState, AppState[]> = {
    START: ['PROJECT_CONNECTED'],
    PROJECT_CONNECTED: ['AGENT_CONNECTED'],
    AGENT_CONNECTED: ['AGENT_RUNNING'],
    AGENT_RUNNING: ['ACTION_DETECTED'],
    ACTION_DETECTED: ['RISK_EVALUATION'],
    RISK_EVALUATION: ['EXECUTING', 'WAITING_FOR_APPROVAL', 'BLOCKED'],
    WAITING_FOR_APPROVAL: ['EXECUTING', 'BLOCKED'],
    BLOCKED: ['ACTION_EXECUTED', 'COMPLETED'],
    EXECUTING: ['ACTION_EXECUTED'],
    ACTION_EXECUTED: ['CHANGES_DETECTED', 'COMPLETED'],
    CHANGES_DETECTED: ['VERIFYING'],
    VERIFYING: ['PASSED', 'FAILED'],
    PASSED: ['COMPLETED'],
    FAILED: ['RECOVERY'],
    RECOVERY: ['VERIFYING', 'COMPLETED'],
    COMPLETED: ['AGENT_RUNNING', 'START'],
  };

  public transitionTo(nextState: AppState, reason?: string): void {
    const allowed = this.validTransitions[this.currentState];
    if (!allowed || !allowed.includes(nextState)) {
      throw new InvalidStateTransitionError(this.currentState, nextState, reason);
    }
    this.currentState = nextState;
    this.history.push({ state: nextState, timestamp: Date.now() });
  }

  public canTransitionTo(nextState: AppState): boolean {
    const allowed = this.validTransitions[this.currentState];
    return allowed ? allowed.includes(nextState) : false;
  }

  public reset(): void {
    this.currentState = 'START';
    this.history = [{ state: 'START', timestamp: Date.now() }];
  }
}
