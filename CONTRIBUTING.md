# Contributing to VibeSec 🛡️

Thank you for your interest in contributing to VibeSec!

## Development Setup

1. **Fork and Clone the Repository**:
   ```bash
   git clone https://github.com/your-username/vibesec.git
   cd vibesec
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Run Build & Test Suite**:
   ```bash
   npm run build
   npm test
   ```

## Pull Request Guidelines

- Keep security-critical code modular and deterministic.
- Every new feature or bugfix must include corresponding unit/integration tests in `tests/`.
- Run `npm run build` and `npm test` before submitting your PR.
