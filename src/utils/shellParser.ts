export interface ParsedCommand {
  raw: string;
  normalized: string;
  binary: string;
  args: string[];
  hasPipeline: boolean;
  hasSudo: boolean;
  subCommands: string[];
}

/**
 * Shell command parser utility to normalize and analyze shell command structures.
 * Traps command obfuscations (e.g. quote slicing, path manipulations) and flags dangerous operators.
 */
export function parseCommand(rawCommand: string): ParsedCommand {
  const trimmed = rawCommand.trim();

  // Strip single and double quotes used in binary string obfuscations like r'm' -r'f'
  // But preserve spaces
  const normalized = trimmed.replace(/(['"])(.*?)\1/g, '$2');

  // Split by subcommands / operators: ;, &&, ||, |
  const subCommands = normalized
    .split(/;|\&\&|\|\||\|/)
    .map((s) => s.trim())
    .filter(Boolean);

  const hasPipeline = trimmed.includes('|') || trimmed.includes(';') || trimmed.includes('&&') || trimmed.includes('||');

  // Extract primary binary name (handling sudo prefix if present)
  const tokens = normalized.split(/\s+/).filter(Boolean);
  let hasSudo = false;
  let binary = tokens[0] || '';

  if (binary === 'sudo') {
    hasSudo = true;
    binary = tokens[1] || 'sudo';
  }

  // Remove leading paths (e.g. /bin/rm -> rm, ./node_modules/.bin/vitest -> vitest)
  if (binary.includes('/')) {
    binary = binary.split('/').pop() || binary;
  }
  if (binary.includes('\\')) {
    binary = binary.split('\\').pop() || binary;
  }

  const args = tokens.slice(hasSudo ? 2 : 1);

  return {
    raw: rawCommand,
    normalized,
    binary,
    args,
    hasPipeline,
    hasSudo,
    subCommands,
  };
}
