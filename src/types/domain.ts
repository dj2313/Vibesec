export type AgentType = 'claude-code' | 'cursor' | 'codex' | 'generic';

export type ActionType = 
  | 'read_file' 
  | 'write_file' 
  | 'execute_command' 
  | 'network_request' 
  | 'git_operation';

export type DecisionType = 'allow' | 'ask' | 'block';

export type RiskTier = 'low' | 'medium' | 'high' | 'critical';

export type AppState =
  | 'START'
  | 'PROJECT_CONNECTED'
  | 'AGENT_CONNECTED'
  | 'AGENT_RUNNING'
  | 'ACTION_DETECTED'
  | 'RISK_EVALUATION'
  | 'WAITING_FOR_APPROVAL'
  | 'BLOCKED'
  | 'EXECUTING'
  | 'ACTION_EXECUTED'
  | 'CHANGES_DETECTED'
  | 'VERIFYING'
  | 'PASSED'
  | 'FAILED'
  | 'RECOVERY'
  | 'COMPLETED';

export interface AgentAction {
  id: string;
  timestamp: number;
  agent: AgentType;
  actionType: ActionType;
  target: string;
  params?: Record<string, unknown>;
  environment?: 'development' | 'staging' | 'production';
}

export interface PolicyRule {
  id: string;
  resource?: string;
  action?: string;
  command_pattern?: string;
  environment?: string;
  decision: DecisionType;
  reason: string;
}

export interface PolicyConfig {
  version: string;
  default_decision: DecisionType;
  rules: PolicyRule[];
}

export interface RiskAssessment {
  score: number; // 0 - 100
  tier: RiskTier;
  factors: string[];
  recommendedDecision: DecisionType;
}

export interface SecurityDecision {
  actionId: string;
  decision: DecisionType;
  reason: string;
  approvedBy: 'policy' | 'user' | 'system';
  timestamp: number;
}

export interface AuditLogEntry {
  id: string;
  timestamp: number;
  projectId: string;
  agent: AgentType;
  actionType: ActionType;
  target: string;
  decision: DecisionType;
  reason: string;
  executionStatus?: 'success' | 'failure' | 'skipped';
  secretRedacted: boolean;
}

export interface VerificationCheck {
  name: string;
  type: 'policy' | 'lint' | 'test' | 'build';
  passed: boolean;
  output: string;
  durationMs: number;
}

export interface VerificationResult {
  status: 'pass' | 'fail';
  checks: VerificationCheck[];
  timestamp: number;
}

export interface Checkpoint {
  id: string;
  timestamp: number;
  gitCommitHash?: string;
  gitStashRef?: string;
  touchedFiles: string[];
  description: string;
}
