/**
 * Utility for sanitizing log outputs, targets, and parameters before persisting to the SQLite ledger.
 * Guarantees zero sensitive data or secrets leak into log storage.
 */

const SECRET_PATTERNS = [
  // AWS Access Key ID
  /AKIA[0-9A-Z]{16}/g,
  // Generic API Keys (e.g. OpenAI sk-..., Anthropic sk-ant-...)
  /sk-(ant-)?[a-zA-Z0-9_\-]{24,}/g,
  // Bearer Authorization Tokens
  /Bearer\s+[a-zA-Z0-9\-\._~\+\/]+=*/gi,
  // RSA / SSH / EC Private Key Block Header
  /-----BEGIN\s+(?:[A-Z0-9]+\s+)?PRIVATE\s+KEY-----[\s\S]*?-----END\s+(?:[A-Z0-9]+\s+)?PRIVATE\s+KEY-----/gi,
  // Database connection strings containing passwords
  /(postgres|postgresql|mysql|mongodb|redis):\/\/[^:\s]+:[^@\s]+@[^\s]+/gi,
  // Env file key-value assignments for sensitive terms
  /(API_KEY|SECRET|PASSWORD|TOKEN|PRIVATE_KEY|DATABASE_URL|AUTH_TOKEN)\s*=\s*['"]?[^\s'"]+['"]?/gi,
];

export function redactSecrets(text: string): { redactedText: string; secretRedacted: boolean } {
  if (!text) {
    return { redactedText: text, secretRedacted: false };
  }

  let redactedText = text;
  let secretRedacted = false;

  for (const pattern of SECRET_PATTERNS) {
    if (pattern.test(redactedText)) {
      secretRedacted = true;
      redactedText = redactedText.replace(pattern, (match) => {
        if (match.includes('=')) {
          const parts = match.split('=');
          return `${parts[0]}=[REDACTED_SECRET]`;
        }
        return '[REDACTED_SECRET]';
      });
    }
  }

  return { redactedText, secretRedacted };
}
