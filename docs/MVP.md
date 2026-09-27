# VibeSec — MVP

## Goal

Build the smallest version that proves VibeSec can act as a control layer between an AI coding agent and a developer project.

## MVP User Journey

```text
Install VibeSec
      ↓
Initialize project
      ↓
Configure agent
      ↓
Agent performs task
      ↓
VibeSec intercepts action
      ↓
ALLOW / ASK / BLOCK
      ↓
Action executes
      ↓
Changes verified
      ↓
Result shown
```

## MVP Features

### 1. CLI
Commands:

```bash
vibesec init
vibesec start
vibesec status
vibesec policy
vibesec logs
vibesec verify
```

### 2. Policy Engine

Support:
- file rules
- command rules
- environment rules
- approval rules

### 3. Protected Resources

Initial protected resources:

```text
.env
.env.*
~/.ssh/*
~/.aws/*
credentials files
production config
```

### 4. Command Guard

Initial high-risk patterns:

```text
rm -rf
git push --force
DROP DATABASE
terraform destroy
sudo
curl ... | sh
wget ... | sh
```

Use command parsing rather than naive substring matching where possible.

### 5. Audit Log

Record every intercepted high-impact action.

### 6. Verification

Support:

```text
test
build
policy check
security check
```

### 7. Recovery

Create a safe checkpoint before high-impact changes and allow rollback.

## MVP UI

Start with CLI output.

Example:

```text
VibeSec
Project: my-app
Agent: Claude

✓ npm install
✓ edited src/login.ts

⚠ Agent wants to read .env
Reason: sensitive file

[1] Allow once
[2] Deny
[3] Always block

Choice:
```

## MVP Acceptance Criteria

- User can initialize a project.
- User can configure policies.
- Agent actions can be intercepted through the supported integration.
- Safe actions execute.
- Blocked actions do not execute.
- Approval actions wait for the user.
- Audit logs are created.
- Verification runs after selected changes.
- Failed verification can trigger rollback.
- No secrets appear in logs.

## After MVP

Next priorities:

1. GitHub integration
2. Web dashboard
3. MCP governance
4. network controls
5. AI cost tracking
6. multi-agent analytics
7. team policies
