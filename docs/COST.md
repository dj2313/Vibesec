# VibeSec — Cost Plan

## MVP Principle

Keep the first version as close to zero-cost as possible.

## Local MVP

| Component | Cost |
|---|---:|
| TypeScript/Node.js | Free |
| SQLite | Free |
| Git | Free |
| GitHub | Free tier available |
| Local policy engine | Free |
| Local tests | Free |

**Expected infrastructure cost: $0/month** for the local MVP.

## SaaS Prototype

Possible services:

| Component | Low-cost choice |
|---|---|
| Frontend | Vercel/Cloudflare |
| Backend | Render/Fly.io/Cloudflare Workers |
| Database | Supabase/Postgres |
| Authentication | GitHub OAuth |
| Error monitoring | Sentry free tier |
| CI | GitHub Actions |

Actual cost depends on traffic and free-tier limits.

## AI Cost

AI remediation should be optional.

Do not send every action to an LLM.

Use deterministic rules first:

```text
Action
 ↓
Local policy
 ↓
Local risk analysis
 ↓
Only if needed → LLM
```

This keeps costs low.

## Main Cost Risks

- LLM remediation
- repository analysis
- high-frequency event storage
- large team usage
- hosted CI
- network scanning

## Cost Control

- local-first processing
- event batching
- retention limits
- caching
- opt-in AI remediation
- configurable log retention
