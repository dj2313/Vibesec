# VibeSec — Deployment

## Phase 1: Local MVP

```text
Developer Machine
├── VibeSec CLI
├── SQLite
├── Policy Configuration
└── Agent Integration
```

Install:

```bash
npm install -g vibesec
```

Initialize:

```bash
cd my-project
vibesec init
```

Start:

```bash
vibesec start
```

## Phase 2: GitHub Integration

```text
GitHub Repository
       |
       v
GitHub App / Actions
       |
       v
VibeSec Scanner
       |
       v
Security + Policy Results
```

Use CI to verify pull requests.

## Phase 3: SaaS

```text
Developer
   |
CLI / Extension
   |
API Gateway
   |
Backend
   |
PostgreSQL
   |
Dashboard
```

## Deployment Principles

- Keep secrets in environment variables or a managed secret store.
- Never commit credentials.
- Use least-privilege GitHub permissions.
- Separate development and production.
- Enable audit logging.
- Back up SaaS database data.
- Rate-limit public APIs.

## Recommended MVP Deployment

Do not deploy a complex cloud backend initially.

Prove the local control loop first:

**agent → VibeSec → decision → execution → verification**

Then add SaaS infrastructure.
