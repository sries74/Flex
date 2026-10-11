export interface CredentialErrors {
  email?: string;
  password?: string;
}

// Deliberately loose: the server is the source of truth, this only catches obvious typos.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateCredentials(
  email: string,
  password: string,
  opts: { newAccount?: boolean } = {},
): CredentialErrors {
  const errors: CredentialErrors = {};
  const trimmed = email.trim();

  if (!trimmed) errors.email = 'Enter your email address.';
  else if (!EMAIL_RE.test(trimmed)) errors.email = 'Enter a valid email address.';

  if (!password) errors.password = 'Enter your password.';
  else if (opts.newAccount && password.length < 8) errors.password = 'Use at least 8 characters.';

  return errors;
}
