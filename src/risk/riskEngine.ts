import { AgentAction, DecisionType, RiskAssessment, RiskTier } from '../types/domain.js';
import { parseCommand } from '../utils/shellParser.js';

export class RiskEngine {
  public assessRisk(action: AgentAction): RiskAssessment {
    let score = 0;
    const factors: string[] = [];

    // Factor 1: Sensitive resource protection check
    const targetLower = (action.target || '').toLowerCase().replace(/\\/g, '/');
    if (
      targetLower.includes('.env') ||
      targetLower.includes('.ssh/') ||
      targetLower.includes('.aws/') ||
      targetLower.endsWith('.pem') ||
      targetLower.endsWith('.key') ||
      targetLower.includes('credentials')
    ) {
      score += 55;
      factors.push('Sensitive resource access target detected');
    }

    // Factor 2: Shell command analysis
    if (action.actionType === 'execute_command') {
      const parsed = parseCommand(action.target);

      if (parsed.hasSudo) {
        score += 35;
        factors.push('Privilege escalation via sudo detected');
      }

      if (parsed.hasPipeline) {
        score += 20;
        factors.push('Complex shell pipeline or operator detected');
      }

      const raw = action.target.toLowerCase();
      if (raw.includes('rm -rf') || raw.includes('rm -r -f')) {
        score += 70;
        factors.push('Destructive directory removal command');
      }

      if (raw.includes('curl') && (raw.includes('| sh') || raw.includes('| bash'))) {
        score += 75;
        factors.push('Remote script execution pipeline (curl | sh)');
      }

      if (raw.includes('drop database') || raw.includes('drop table')) {
        score += 65;
        factors.push('Destructive database SQL command');
      }

      if (raw.includes('git push') && raw.includes('--force')) {
        score += 50;
        factors.push('Git force push command');
      }

      if (parsed.binary === 'npm' || parsed.binary === 'yarn' || parsed.binary === 'pnpm') {
        if (parsed.args[0] === 'install' || parsed.args[0] === 'add') {
          score += 25;
          factors.push('Package dependency installation command');
        }
      }
    }

    // Factor 3: Target environment
    if (action.environment === 'production') {
      score += 30;
      factors.push('Production environment operation');
    }

    // Factor 4: Network egress
    if (action.actionType === 'network_request') {
      score += 30;
      factors.push('External network egress request');
    }

    // Factor 5: File modification
    if (action.actionType === 'write_file') {
      score += 15;
      factors.push('File system mutation');
    }

    // Cap score at 100
    score = Math.min(100, Math.max(0, score));

    // Determine Risk Tier
    let tier: RiskTier = 'low';
    let recommendedDecision: DecisionType = 'allow';

    if (score >= 70) {
      tier = 'critical';
      recommendedDecision = 'block';
    } else if (score >= 45) {
      tier = 'high';
      recommendedDecision = 'ask';
    } else if (score >= 20) {
      tier = 'medium';
      recommendedDecision = 'ask';
    } else {
      tier = 'low';
      recommendedDecision = 'allow';
    }

    return {
      score,
      tier,
      factors,
      recommendedDecision,
    };
  }
}
