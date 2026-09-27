import { describe, it, expect } from 'vitest';
import { RiskEngine } from '../../src/risk/riskEngine.js';
import { AgentAction } from '../../src/types/domain.js';

describe('RiskEngine', () => {
  const riskEngine = new RiskEngine();

  it('assigns critical risk to .env access', () => {
    const action: AgentAction = {
      id: 'risk-1',
      timestamp: Date.now(),
      agent: 'claude-code',
      actionType: 'read_file',
      target: 'config/.env.local',
    };

    const assessment = riskEngine.assessRisk(action);
    expect(assessment.score).toBeGreaterThanOrEqual(50);
    expect(assessment.factors).toContain('Sensitive resource access target detected');
  });

  it('assigns critical risk to rm -rf commands', () => {
    const action: AgentAction = {
      id: 'risk-2',
      timestamp: Date.now(),
      agent: 'claude-code',
      actionType: 'execute_command',
      target: 'rm -rf ./node_modules',
    };

    const assessment = riskEngine.assessRisk(action);
    expect(assessment.tier).toBe('critical');
    expect(assessment.recommendedDecision).toBe('block');
  });

  it('detects sudo escalation risk factor', () => {
    const action: AgentAction = {
      id: 'risk-3',
      timestamp: Date.now(),
      agent: 'claude-code',
      actionType: 'execute_command',
      target: 'sudo apt-get update',
    };

    const assessment = riskEngine.assessRisk(action);
    expect(assessment.factors).toContain('Privilege escalation via sudo detected');
    expect(assessment.score).toBeGreaterThanOrEqual(35);
  });

  it('assigns low risk to standard reading operations', () => {
    const action: AgentAction = {
      id: 'risk-4',
      timestamp: Date.now(),
      agent: 'claude-code',
      actionType: 'read_file',
      target: 'src/utils/helpers.ts',
    };

    const assessment = riskEngine.assessRisk(action);
    expect(assessment.tier).toBe('low');
    expect(assessment.recommendedDecision).toBe('allow');
  });
});
