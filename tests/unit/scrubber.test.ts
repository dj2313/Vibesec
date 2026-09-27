import { describe, it, expect } from 'vitest';
import { redactSecrets } from '../../src/utils/scrubber.js';

describe('redactSecrets', () => {
  it('redacts AWS Access Keys', () => {
    const raw = 'Configuring access with AKIAIOSFODNN7EXAMPLE key';
    const res = redactSecrets(raw);
    expect(res.secretRedacted).toBe(true);
    expect(res.redactedText).not.toContain('AKIAIOSFODNN7EXAMPLE');
    expect(res.redactedText).toContain('[REDACTED_SECRET]');
  });

  it('redacts OpenAI / Anthropic API Keys', () => {
    const raw = 'Using API key sk-ant-api03-abcdef1234567890abcdef1234567890';
    const res = redactSecrets(raw);
    expect(res.secretRedacted).toBe(true);
    expect(res.redactedText).not.toContain('sk-ant-api03-abcdef1234567890abcdef1234567890');
  });

  it('redacts Bearer tokens', () => {
    const raw = 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
    const res = redactSecrets(raw);
    expect(res.secretRedacted).toBe(true);
    expect(res.redactedText).toContain('Authorization: [REDACTED_SECRET]');
  });

  it('redacts key-value environment secrets', () => {
    const raw = 'API_KEY=super_secret_token_123';
    const res = redactSecrets(raw);
    expect(res.secretRedacted).toBe(true);
    expect(res.redactedText).toBe('API_KEY=[REDACTED_SECRET]');
  });

  it('leaves clean text untouched', () => {
    const raw = 'npm install vitest';
    const res = redactSecrets(raw);
    expect(res.secretRedacted).toBe(false);
    expect(res.redactedText).toBe('npm install vitest');
  });
});
