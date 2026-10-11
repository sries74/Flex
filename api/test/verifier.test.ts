import {
  SignJWT,
  createLocalJWKSet,
  exportJWK,
  generateKeyPair,
  type JWK,
  type KeyObject,
} from 'jose';
import { beforeAll, describe, expect, it } from 'vitest';
import { AuthError, createFirebaseVerifier } from '../src/auth/verifier.js';

const PROJECT = 'flex-test';
const ISSUER = `https://securetoken.google.com/${PROJECT}`;

let signing: { privateKey: KeyObject; jwk: JWK };
let other: { privateKey: KeyObject };
let verify: (token: string) => Promise<{ uid: string; email: string | null }>;

beforeAll(async () => {
  const pair = await generateKeyPair('RS256');
  const jwk = { ...(await exportJWK(pair.publicKey)), kid: 'k1', alg: 'RS256', use: 'sig' };
  signing = { privateKey: pair.privateKey as KeyObject, jwk };
  other = { privateKey: (await generateKeyPair('RS256')).privateKey as KeyObject };
  const v = createFirebaseVerifier({
    projectId: PROJECT,
    keys: createLocalJWKSet({ keys: [jwk] }),
  });
  verify = (t) => v.verify(t);
});

function token(
  claims: Record<string, unknown> = {},
  opts: {
    key?: KeyObject;
    issuer?: string;
    audience?: string;
    exp?: string | number;
    sub?: string | null;
  } = {},
) {
  let jwt = new SignJWT({
    email: 'driver@example.com',
    auth_time: Math.floor(Date.now() / 1000) - 60,
    ...claims,
  })
    .setProtectedHeader({ alg: 'RS256', kid: 'k1' })
    .setIssuer(opts.issuer ?? ISSUER)
    .setAudience(opts.audience ?? PROJECT)
    .setIssuedAt()
    .setExpirationTime(opts.exp ?? '1h');
  if (opts.sub !== null) jwt = jwt.setSubject(opts.sub ?? 'uid-123');
  return jwt.sign(opts.key ?? signing.privateKey);
}

describe('createFirebaseVerifier', () => {
  it('accepts a valid token and returns uid and email', async () => {
    expect(await verify(await token())).toEqual({ uid: 'uid-123', email: 'driver@example.com' });
  });

  it('returns a null email when the token has none', async () => {
    expect((await verify(await token({ email: undefined }))).email).toBeNull();
  });

  it.each([
    ['expired', () => token({}, { exp: Math.floor(Date.now() / 1000) - 3600 })],
    ['wrong audience', () => token({}, { audience: 'someone-else' })],
    ['wrong issuer', () => token({}, { issuer: 'https://securetoken.google.com/other' })],
    ['signed by an unknown key', () => token({}, { key: other.privateKey })],
    ['missing subject', () => token({}, { sub: null })],
    ['empty subject', () => token({}, { sub: '' })],
    ['auth_time in the future', () => token({ auth_time: Math.floor(Date.now() / 1000) + 3600 })],
  ])('rejects a token that is %s', async (_name, make) => {
    await expect(verify(await make())).rejects.toBeInstanceOf(AuthError);
  });

  it('rejects an unsigned (alg none) token', async () => {
    // jose v6 has no PlainJWT, so build the unsigned token by hand.
    const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const t = `${b64({ alg: 'none' })}.${b64({ sub: 'uid-123', iss: ISSUER, aud: PROJECT, exp, auth_time: 1 })}.`;
    await expect(verify(t)).rejects.toBeInstanceOf(AuthError);
  });

  it('rejects an HS256 token signed with the public key (algorithm confusion)', async () => {
    const secret = new TextEncoder().encode(JSON.stringify(signing.jwk));
    const t = await new SignJWT({ auth_time: 1 })
      .setProtectedHeader({ alg: 'HS256', kid: 'k1' })
      .setIssuer(ISSUER)
      .setAudience(PROJECT)
      .setSubject('uid-123')
      .setExpirationTime('1h')
      .sign(secret);
    await expect(verify(t)).rejects.toBeInstanceOf(AuthError);
  });

  it.each(['', 'not-a-jwt', 'a.b.c', 'Bearer abc'])('rejects garbage %j', async (t) => {
    await expect(verify(t)).rejects.toBeInstanceOf(AuthError);
  });

  it('never leaks verification internals in the error message', async () => {
    const err = await verify(await token({}, { audience: 'x' })).catch((e: Error) => e);
    expect((err as Error).message).toBe('Invalid token');
  });
});
