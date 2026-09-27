export class VibeSecError extends Error {
  constructor(message: string, public code: string = 'VIBESEC_ERROR') {
    super(message);
    this.name = 'VibeSecError';
  }
}

export class PolicyViolationError extends VibeSecError {
  constructor(public target: string, public reason: string) {
    super(`Action blocked by policy for target '${target}': ${reason}`, 'POLICY_VIOLATION');
    this.name = 'PolicyViolationError';
  }
}

export class LedgerError extends VibeSecError {
  constructor(message: string) {
    super(`Ledger operation failed: ${message}`, 'LEDGER_ERROR');
    this.name = 'LedgerError';
  }
}
