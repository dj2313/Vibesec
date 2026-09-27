# Security Policy

## Reporting Security Vulnerabilities

VibeSec takes security extremely seriously. If you discover a security vulnerability or policy bypass in VibeSec, please do **NOT** open a public GitHub issue.

Instead, please report the vulnerability privately by emailing security@vibesec.dev or opening a GitHub Private Security Advisory.

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Security Guarantees

1. **Zero Secret Logging**: VibeSec automatically scrubs AWS Keys, API tokens, Private Keys, and `.env` key-values prior to writing audit logs.
2. **Local Processing**: Security decisions are evaluated locally using deterministic algorithms. No secrets or source code are transmitted to external servers.
3. **Fail Closed**: Ambiguous or unparseable policy evaluations default to `BLOCK` or `ASK`.
