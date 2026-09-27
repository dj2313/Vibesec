# VibeSec — Architecture

## 1. Philosophy

VibeSec follows:

**Prevent → Observe → Explain → Verify → Recover**

The core should be local-first for privacy and fast control.

## 2. System Architecture

```text
                    +-------------------+
                    |   AI Coding Agent |
                    | Claude/Cursor/... |
                    +---------+---------+
                              |
                              v
                    +-------------------+
                    |  Agent Gateway    |
                    +---------+---------+
                              |
                              v
                    +-------------------+
                    | Policy Engine     |
                    +---------+---------+
                              |
                    +---------+---------+
                    |                   |
                    v                   v
              Risk Engine        Activity Ledger
                    |
          +---------+---------+
          |         |         |
        ALLOW      ASK      BLOCK
          |         |         |
          +---------+---------+
                    |
                    v
              Action Executor
                    |
                    v
             Project Changes
                    |
                    v
           Change Intelligence
                    |
                    v
          Verification Engine
            /       |       \
         Tests    Build   Security
                    |
                    v
              Result Engine
                    |
             +------+------+
             |             |
           PASS           FAIL
             |             |
             v             v
         Completed      Recovery
```

## 3. Architecture Layers

1. **Agent Integration** — normalize agent actions.
2. **Control** — evaluate permissions and risk.
3. **Execution** — execute approved actions.
4. **Intelligence** — understand changes.
5. **Verification** — run deterministic checks.
6. **Recovery** — rollback or retry.
7. **Analytics** — store events for dashboard/team reporting.

## 4. Future SaaS Architecture

```text
CLI / IDE / GitHub
       |
       v
API Gateway
       |
+------+----------------+
|      |        |       |
Auth  Policy   Events  Projects
       |        |       |
       +--------+-------+
                |
           PostgreSQL
                |
             Dashboard
```

## 5. Critical Design Rule

The LLM may recommend an action.

**VibeSec decides whether the action is allowed.**
