import { describe, expect, it } from 'vitest';
import { validateCredentials } from './validation';

describe('validateCredentials', () => {
  it('accepts a valid email and password', () => {
    expect(validateCredentials('driver@example.com', 'hunter22')).toEqual({});
  });

  it('flags an empty email', () => {
    expect(validateCredentials('', 'hunter22').email).toBe('Enter your email address.');
  });

  it('flags a malformed email', () => {
    expect(validateCredentials('not-an-email', 'hunter22').email).toBe(
      'Enter a valid email address.',
    );
  });

  it('trims surrounding whitespace before validating email', () => {
    expect(validateCredentials('  driver@example.com  ', 'hunter22')).toEqual({});
  });

  it('flags an empty password', () => {
    expect(validateCredentials('driver@example.com', '').password).toBe('Enter your password.');
  });

  it('flags short passwords only when creating an account', () => {
    expect(validateCredentials('driver@example.com', 'abc', { newAccount: true }).password).toBe(
      'Use at least 8 characters.',
    );
    expect(validateCredentials('driver@example.com', 'abc').password).toBeUndefined();
  });
});
