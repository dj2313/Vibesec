# VibeSec — Product Requirements Document

## 1. Product Overview

**VibeSec** is a developer control layer for AI coding agents such as Claude Code, Cursor, and Codex.

Instead of only scanning code after an AI generates it, VibeSec helps developers:

**Observe → Control → Explain → Verify → Recover**

## 2. Problem

AI coding agents can read files, execute commands, install dependencies, modify code, access tools, and interact with Git. Developers need visibility and control over these actions.

## 3. Target Users

- Individual developers using AI coding agents
- Freelancers
- Startup engineering teams
- Engineering/security teams

## 4. Core User Flow

1. Install VibeSec CLI.
2. Connect a project.
3. Connect/configure an AI coding agent.
4. Start coding normally.
5. VibeSec observes agent actions.
6. Safe actions are allowed automatically.
7. Risky actions require approval or are blocked.
8. VibeSec records actions.
9. Changes are verified.
10. Failed changes can be recovered or rolled back.

## 5. MVP Features

### Agent Gateway
Intercept and normalize important agent actions.

### Permission Engine
Rules: `ALLOW`, `ASK`, `BLOCK`.

### Sensitive Resource Protection
Protect `.env`, SSH keys, cloud credentials, API keys, and production configuration.

### Dangerous Command Guard
Detect destructive commands, force pushes, database destruction, suspicious shell pipelines, and similar actions.

### Change Intelligence
Summarize files, dependencies, authentication, database, and configuration changes.

### Verification
Run tests, build checks, security checks, and policy checks.

### Activity Ledger
Record agent, action, timestamp, target, decision, reason, and result.

### Recovery
Support safe rollback and retry after failed verification.

## 6. Future Features

- MCP tool governance
- Network/egress control
- AI cost tracking
- Multi-agent management
- Team policies
- GitHub integration
- Web dashboard
- AI development analytics
- Automatic remediation
- Production environment gates

## 7. Non-Goals for MVP

- Mobile application
- Full SIEM
- Complete cloud security platform
- Custom foundation model
- Generic vulnerability scanner as the main product

## 8. Success Criteria

A developer should be able to answer:

> What is my AI doing, what is it allowed to do, what changed, and did the resulting project actually work?

## 9. Product Principle

**Never blindly trust an AI agent.**

VibeSec keeps the developer in control while making AI-assisted development safer and easier to understand.
