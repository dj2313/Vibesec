# VibeSec — Application Flow State

## 1. Main State Machine

```text
START
  |
  v
PROJECT_CONNECTED
  |
  v
AGENT_CONNECTED
  |
  v
AGENT_RUNNING
  |
  v
ACTION_DETECTED
  |
  v
RISK_EVALUATION
  |
  +-------------------+
  |        |          |
  v        v          v
ALLOW     ASK        BLOCK
  |        |          |
  |        v          v
  |   WAITING_FOR   ACTION_LOGGED
  |    APPROVAL
  |        |
  |    +---+---+
  |    |       |
  |  APPROVE  DENY
  |    |       |
  +----+-------+
       |
       v
ACTION_EXECUTED
       |
       v
CHANGES_DETECTED
       |
       v
VERIFICATION
       |
   +---+---+
   |       |
   v       v
 PASS     FAIL
   |       |
   v       v
COMPLETED RECOVERY
           |
      +----+----+
      |         |
      v         v
   ROLLBACK   RETRY
      |         |
      +----+----+
           |
           v
       VERIFICATION
```

## 2. Application States

### SETUP
No project connected.

### PROJECT_CONNECTED
Project is registered.

### AGENT_CONNECTED
AI agent is configured.

### AGENT_RUNNING
Agent is actively working.

### ACTION_DETECTED
VibeSec receives an agent action.

### RISK_EVALUATION
Policy and risk are evaluated.

### WAITING_FOR_APPROVAL
Human decision is required.

### BLOCKED
Action is rejected.

### EXECUTING
Approved action runs.

### VERIFYING
Project is being checked.

### PASSED
Required checks passed.

### FAILED
One or more checks failed.

### RECOVERY
Rollback or retry is being prepared.

### COMPLETED
Task completed successfully.

## 3. User-Facing Flow

```text
AI Working
    |
    v
Action Detected
    |
    +--> Safe ------> Execute
    |
    +--> Risky -----> Ask User
    |
    +--> Dangerous -> Block
                         |
                         v
                     Explain
```

## 4. Verification Flow

```text
AI Change
   |
   v
Tests
   |
   v
Build
   |
   v
Security
   |
   v
Policy
   |
   v
PASS / FAIL
```

## 5. Important Rules

- Blocked actions never execute.
- Denied actions never execute.
- Critical actions require explicit approval.
- High-impact changes require verification.
- Failed verification cannot be reported as successful.
- Rollbacks create audit events.
