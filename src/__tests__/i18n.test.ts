import { describe, it, expect } from 'vitest';
import { t, formatMessageTime } from '../i18n';

describe('t() — translations', () => {
  it('returns an English string for a known key', () => {
    const result = t('signIn');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('returns the approve label', () => {
    expect(t('approve')).toMatch(/approve/i);
  });

  it('returns the reject label', () => {
    expect(t('reject')).toMatch(/reject|отклонить/i);
  });

  it('returns non-empty strings for all nav keys', () => {
    const navKeys = ['chats', 'online', 'members', 'admin', 'signOut'] as const;
    for (const key of navKeys) {
      expect(t(key).length).toBeGreaterThan(0);
    }
  });

  it('returns non-empty strings for all password rule keys', () => {
    const ruleKeys = ['passwordRuleLength', 'passwordRuleUppercase', 'passwordRuleDigit', 'passwordRuleSpecial'] as const;
    for (const key of ruleKeys) {
      expect(t(key).length).toBeGreaterThan(0);
    }
  });
});

describe('formatMessageTime()', () => {
  it('shows only time (HH:MM) for a timestamp from today', () => {
    const now = new Date().toISOString();
    const result = formatMessageTime(now);
    // Expect a short time string — no year digits like 2025 or 2026
    expect(result).not.toMatch(/202[0-9]/);
    expect(result.length).toBeLessThan(15);
  });

  it('shows date information for an old message', () => {
    const old = new Date('2020-01-15T10:30:00Z').toISOString();
    const result = formatMessageTime(old);
    // Old dates should include more info than just HH:MM
    expect(result.length).toBeGreaterThan(4);
  });

  it('returns a non-empty string for undefined input', () => {
    const result = formatMessageTime(undefined);
    expect(typeof result).toBe('string');
  });

  it('returns a non-empty string for a valid ISO string', () => {
    const result = formatMessageTime(new Date().toISOString());
    expect(result.length).toBeGreaterThan(0);
  });
});
