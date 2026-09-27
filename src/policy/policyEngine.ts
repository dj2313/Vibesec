import { parse as parseYaml } from 'yaml';
import { minimatch } from 'minimatch';
import { AgentAction, DecisionType, PolicyConfig, PolicyRule, SecurityDecision } from '../types/domain.js';
import { parseCommand } from '../utils/shellParser.js';

export const DEFAULT_POLICY_CONFIG: PolicyConfig = {
  version: '1.0',
  default_decision: 'ask',
  rules: [
    // Sensitive file protection
    {
      id: 'protect-env',
      resource: '**/.env*',
      action: '*',
      decision: 'block',
      reason: 'Access to environment file secrets is restricted',
    },
    {
      id: 'protect-ssh-aws',
      resource: '{**/.ssh/**,**/.aws/**,**/*.pem,**/*.key,**/*.p12,**/*.crt}',
      action: '*',
      decision: 'block',
      reason: 'Access to system credentials or private keys is restricted',
    },
    {
      id: 'protect-prod-config',
      resource: '{**/prod.config.*,**/production.json,**/config/production.*}',
      action: '*',
      decision: 'ask',
      reason: 'Modifying production configuration requires developer confirmation',
    },

    // Dangerous command guard
    {
      id: 'block-destructive-rm',
      command_pattern: '.*rm\\s+-rf\\s+([\\/\\~\\.]|\\.\\.).*',
      decision: 'block',
      reason: 'Destructive directory deletion command is strictly blocked',
    },
    {
      id: 'block-curl-pipe-sh',
      command_pattern: '.*(curl|wget)\\s+.*\\|\\s*(sh|bash|zsh|powershell).*',
      decision: 'block',
      reason: 'Piping untrusted remote scripts directly into shell is blocked',
    },
    {
      id: 'ask-sudo',
      command_pattern: '.*sudo\\s+.*',
      decision: 'ask',
      reason: 'Privilege escalation via sudo requires developer approval',
    },
    {
      id: 'ask-git-force-push',
      command_pattern: '.*git\\s+push\\s+.*--force.*',
      decision: 'ask',
      reason: 'Git force pushing requires developer approval',
    },
    {
      id: 'ask-db-drop',
      command_pattern: '.*(DROP\\s+DATABASE|DROP\\s+TABLE|terraform\\s+destroy).*',
      decision: 'ask',
      reason: 'Destructive database or infrastructure command requires approval',
    },

    // Standard dev commands
    {
      id: 'allow-safe-dev-tools',
      command_pattern: '^(node|npm|npx|yarn|pnpm|git|python|pytest|echo)\\s+.*',
      decision: 'allow',
      reason: 'Standard local development tool command allowed',
    },
    {
      id: 'allow-git-status',
      command_pattern: '^git\\s+(status|diff|log|branch)$',
      decision: 'allow',
      reason: 'Safe git query command allowed',
    },
  ],
};

export class PolicyEngine {
  private config: PolicyConfig;

  constructor(customConfig?: PolicyConfig) {
    this.config = customConfig || DEFAULT_POLICY_CONFIG;
  }

  public loadYamlPolicy(yamlContent: string): void {
    const parsed = parseYaml(yamlContent) as PolicyConfig;
    if (parsed && Array.isArray(parsed.rules)) {
      this.config = parsed;
    }
  }

  public getConfig(): PolicyConfig {
    return this.config;
  }

  public evaluatePolicy(action: AgentAction): SecurityDecision {
    const rules = this.config.rules || [];

    // Check rules in order: BLOCK rules first, then ASK, then ALLOW
    for (const rule of rules) {
      if (this.matchesRule(action, rule)) {
        return {
          actionId: action.id,
          decision: rule.decision,
          reason: rule.reason,
          approvedBy: 'policy',
          timestamp: Date.now(),
        };
      }
    }

    // Default policy decision if no explicit rule matched
    const isRead = action.actionType === 'read_file';
    const defaultDecision: DecisionType = isRead ? 'allow' : this.config.default_decision || 'ask';

    return {
      actionId: action.id,
      decision: defaultDecision,
      reason: isRead ? 'Default rule: safe file read permitted' : 'Default rule: approval required for non-read action',
      approvedBy: 'policy',
      timestamp: Date.now(),
    };
  }

  private matchesRule(action: AgentAction, rule: PolicyRule): boolean {
    // 1. Resource glob check (applies to file actions)
    if (rule.resource) {
      if (action.actionType !== 'read_file' && action.actionType !== 'write_file') {
        return false;
      }
      if (!action.target) return false;

      const normalizedTarget = action.target.replace(/\\/g, '/');
      const matchesGlob = minimatch(normalizedTarget, rule.resource, { dot: true });
      if (!matchesGlob) {
        return false;
      }
    }

    // 2. Command pattern regex check (applies to command execution)
    if (rule.command_pattern) {
      if (action.actionType !== 'execute_command') {
        return false;
      }
      const parsed = parseCommand(action.target);
      const reg = new RegExp(rule.command_pattern, 'i');
      const matchesRaw = reg.test(action.target);
      const matchesNormalized = reg.test(parsed.normalized);
      if (!matchesRaw && !matchesNormalized) {
        return false;
      }
    }

    // 3. Environment check
    if (rule.environment && action.environment) {
      if (rule.environment.toLowerCase() !== action.environment.toLowerCase()) {
        return false;
      }
    }

    return true;
  }
}
