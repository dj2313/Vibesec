import { DecisionType } from '../types/domain.js';

export const logger = {
  banner(title: string): void {
    console.log(`\n\x1b[1m=== ${title} ===\x1b[0m`);
  },

  success(msg: string): void {
    console.log(`\x1b[32m✔ ${msg}\x1b[0m`);
  },

  info(msg: string): void {
    console.log(`\x1b[36mℹ ${msg}\x1b[0m`);
  },

  warn(msg: string): void {
    console.log(`\x1b[33m⚠ ${msg}\x1b[0m`);
  },

  error(msg: string): void {
    console.log(`\x1b[31m✖ ${msg}\x1b[0m`);
  },

  decisionBadge(decision: DecisionType): string {
    switch (decision) {
      case 'allow':
        return '\x1b[42m\x1b[30m ALLOW \x1b[0m';
      case 'block':
        return '\x1b[41m\x1b[37m BLOCK \x1b[0m';
      case 'ask':
        return '\x1b[43m\x1b[30m  ASK  \x1b[0m';
    }
  },
};
