import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from 'jose';

export interface VerifiedUser {
  uid: string;
  email: string | null;
}

export interface TokenVerifier {
  verify(token: string): Promise<VerifiedUser>;
}

/** Any failure to authenticate. The message is deliberately generic: it goes back to the client. */
export class AuthError extends Error {
  constructor() {
    super('Invalid token');
    this.name = 'AuthError';
  }
}

export const GOOGLE_SECURETOKEN_JWKS =
  'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';

/**
 * Verifies Firebase ID tokens per Firebase's documented rules: RS256 signature against Google's
 * securetoken keys, `iss` = https://securetoken.google.com/<project>, `aud` = <project>, not expired,
 * non-empty `sub`, `auth_time` not in the future.
 *
 * Note: this does not check for revoked sessions (that needs the Admin SDK and a service account).
 * Tokens live ≤ 1 hour, which bounds the exposure; revisit if revocation becomes a requirement.
 */
export function createFirebaseVerifier(opts: {
  projectId: string;
  keys?: JWTVerifyGetKey;
}): TokenVerifier {
  const keys = opts.keys ?? createRemoteJWKSet(new URL(GOOGLE_SECURETOKEN_JWKS));

  return {
    async verify(token) {
      try {
        const { payload } = await jwtVerify(token, keys, {
          algorithms: ['RS256'],
          issuer: `https://securetoken.google.com/${opts.projectId}`,
          audience: opts.projectId,
        });
        if (typeof payload.sub !== 'string' || payload.sub.length === 0) throw new AuthError();
        const authTime = payload.auth_time;
        if (typeof authTime !== 'number' || authTime > Math.floor(Date.now() / 1000) + 5) {
          throw new AuthError();
        }
        return {
          uid: payload.sub,
          email: typeof payload.email === 'string' ? payload.email : null,
        };
      } catch {
        throw new AuthError();
      }
    },
  };
}
