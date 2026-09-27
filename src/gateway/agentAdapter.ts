import { ActionType, AgentAction, AgentType } from '../types/domain.js';

export interface RawAgentPayload {
  agent?: string;
  actionType?: string;
  target?: string;
  command?: string;
  file?: string;
  params?: Record<string, unknown>;
  environment?: string;
}

export class AgentAdapter {
  public normalize(raw: RawAgentPayload): AgentAction {
    const agent: AgentType = this.normalizeAgent(raw.agent);
    const { actionType, target } = this.normalizeActionAndTarget(raw);
    const environment = (raw.environment as any) || 'development';

    return {
      id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: Date.now(),
      agent,
      actionType,
      target,
      params: raw.params || {},
      environment,
    };
  }

  private normalizeAgent(agentStr?: string): AgentType {
    if (!agentStr) return 'generic';
    const lower = agentStr.toLowerCase();
    if (lower.includes('claude')) return 'claude-code';
    if (lower.includes('cursor')) return 'cursor';
    if (lower.includes('codex')) return 'codex';
    return 'generic';
  }

  private normalizeActionAndTarget(raw: RawAgentPayload): { actionType: ActionType; target: string } {
    if (raw.command) {
      return { actionType: 'execute_command', target: raw.command };
    }

    if (raw.actionType === 'execute_command' && raw.target) {
      return { actionType: 'execute_command', target: raw.target };
    }

    if (raw.file || raw.actionType === 'read_file' || raw.actionType === 'write_file') {
      const type: ActionType = raw.actionType === 'write_file' ? 'write_file' : 'read_file';
      const target = raw.file || raw.target || '';
      return { actionType: type, target };
    }

    if (raw.actionType === 'network_request') {
      return { actionType: 'network_request', target: raw.target || '' };
    }

    return {
      actionType: (raw.actionType as ActionType) || 'execute_command',
      target: raw.target || raw.command || '',
    };
  }
}
