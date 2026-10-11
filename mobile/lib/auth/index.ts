import { readFirebaseConfig } from './config';
import { createFirebaseAuthService } from './firebase';
import type { AuthService } from './types';
import { unconfiguredAuthService } from './unconfigured';

export type { AuthService, AuthUser } from './types';
export { authErrorMessage } from './errors';
export { validateCredentials } from './validation';

let instance: AuthService | undefined;

/** App-wide auth service: Firebase when configured, otherwise an explicit "not configured" stub. */
export function getAuthService(): AuthService {
  if (!instance) {
    const config = readFirebaseConfig();
    instance = config ? createFirebaseAuthService(config) : unconfiguredAuthService;
  }
  return instance;
}
