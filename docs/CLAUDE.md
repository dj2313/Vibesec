# VibeSec — CLAUDE.md

## Role

You are working on VibeSec, a developer security and control platform for AI coding agents.

## Primary Objective

Build a reliable system that gives developers control over AI-driven software development.

## Principles

- Developer remains in control.
- Security decisions should be deterministic.
- AI can assist but is not the final authority for critical security decisions.
- Prefer local processing for sensitive operations.
- Fail safely.
- Explain important decisions.

## Before Coding

1. Understand the existing architecture.
2. Identify affected modules.
3. Check relevant tests.
4. Consider security implications.
5. Keep changes minimal.

## Agent Action Model

Always model:

```text
Agent
→ Action
→ Risk
→ Policy
→ Decision
→ Execution
→ Result
→ Audit
```

## Security Checklist

Consider:
- secrets
- permissions
- command execution
- file access
- network access
- dependency installation
- Git operations
- production resources
- prompt injection
- logging

## Never

- print secrets
- commit secrets
- bypass the policy engine
- execute destructive commands in unsafe tests
- claim an AI-generated fix is verified without verification
- silently change security policy

## Testing

Run focused tests first, then the full suite.

Security-critical changes require negative tests.

## Expected Reporting

For implementation work, report:
- what changed
- why it changed
- security impact
- tests run
- remaining limitations

## Architecture Reminder

```text
AI Agent
   ↓
VibeSec Gateway
   ↓
Policy + Risk
   ↓
Allow / Ask / Block
   ↓
Execute
   ↓
Verify
   ↓
Recover if needed
```

Core principle:

> VibeSec controls what AI agents can do, not just what code they produce.
