# VibeSec — AGENTS.md

## Purpose

VibeSec is a control layer for AI-assisted software development.

It helps developers observe, control, verify, and recover AI-driven actions.

## Engineering Rules

1. Prefer deterministic solutions.
2. Keep security decisions independent from LLM decisions.
3. Never treat an LLM response as proof of safety.
4. Keep policy evaluation deterministic.
5. Keep sensitive data local by default.
6. Never log secret values.
7. Audit blocked, approved, failed, and recovery actions.
8. Use least privilege.
9. Keep modules small and focused.
10. Add tests before changing security-critical behavior.

## Core Components

- Agent Gateway
- Agent Adapters
- Policy Engine
- Risk Engine
- Action Executor
- Activity Ledger
- Change Intelligence
- Verification Engine
- Recovery Engine

## Security

Never:
- expose secrets in logs
- commit secrets
- bypass policy checks
- automatically approve critical actions
- claim an AI fix is verified without actual verification

## Testing

Every policy rule should include:
- allowed case
- blocked case
- approval case where applicable
- edge cases

## Git

Prefer small commits.

Examples:

```text
feat: add command risk evaluator
fix: prevent env file access
test: add destructive command policies
```

## Definition of Done

A feature is complete when implementation, tests, security behavior, error handling, audit behavior, and documentation are complete.
