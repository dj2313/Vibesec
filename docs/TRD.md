# VibeSec — Technical Requirements Document

## 1. Technical Goal

Build VibeSec as a local-first developer control layer with a CLI as the primary interface. The architecture must support future IDE extensions, GitHub integration, SaaS dashboards, and team policies.

## 2. High-Level Architecture

```text
AI Coding Agent
Claude / Cursor / Codex
        |
        v
+----------------------+
| VibeSec Agent Gateway|
+----------+-----------+
           |
           v
+----------------------+
| Policy / Permission  |
| Engine               |
+----------+-----------+
           |
     +-----+------+
     |            |
     v            v
 Risk Engine   Activity Ledger
     |
     v
ALLOW / ASK / BLOCK
     |
     v
Action Executor
     |
     v
Project Changes
     |
     v
Verification Engine
     |
     +----> Tests
     +----> Build
     +----> Security
     +----> Policy
     |
     v
PASS / FAIL
     |
     v
Recovery / Rollback
```

## 3. Recommended Stack

### CLI/Core
- TypeScript
- Node.js
- SQLite
- JSON/YAML policies

### Backend
- FastAPI or Node.js
- PostgreSQL

### Dashboard
- React + TypeScript

### Authentication
- GitHub OAuth/GitHub App for SaaS phase

## 4. Core Modules

### Agent Adapter
Normalizes different agent actions.

```json
{
  "agent": "claude",
  "action": "read_file",
  "target": ".env",
  "risk": "high"
}
```

### Policy Engine

```text
Action
  |
  v
Policy Engine
  |
  +--> ALLOW
  +--> ASK
  +--> BLOCK
```

### Risk Engine

Risk factors include:
- sensitive resources
- destructive commands
- production environment
- external network
- privilege escalation
- dependency installation
- large-scale modifications

### Verification Engine

```text
Changed Project
      |
      +--> Tests
      +--> Build
      +--> Security
      +--> Policy
```

### Activity Ledger

```json
{
  "timestamp": "...",
  "agent": "claude",
  "action": "execute_command",
  "target": "...",
  "decision": "blocked",
  "reason": "...",
  "project": "..."
}
```

## 5. Example Policy

```yaml
rules:
  - resource: ".env"
    action: "read"
    decision: "block"

  - command: "git push --force"
    decision: "ask"

  - command: "npm install"
    decision: "allow"

  - environment: "production"
    decision: "ask"
```

## 6. Security Requirements

- Critical actions must fail closed.
- Secrets must not be sent externally by default.
- Logs must never contain secret values.
- High-risk approvals must be explicit.
- Policies must be auditable.
- LLM responses must not be the sole proof of safety.

## 7. Performance

- Normal policy checks should add minimal latency.
- Policy evaluation should happen locally.
- Expensive AI analysis should happen only when needed.

## 8. Deployment

### MVP

```text
Developer Laptop
 ├── VibeSec CLI
 ├── SQLite
 ├── Policy files
 └── Agent integration
```

### SaaS Phase

```text
CLI / Extension
      |
      v
API
      |
      v
Backend
      |
      v
PostgreSQL
      |
      v
Dashboard
```
