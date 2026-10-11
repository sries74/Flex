import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import type { Db } from '../src/db.js';
import { auth, setup, stop } from './helpers.js';

let app: FastifyInstance;
let db: Db;
let close: () => Promise<void>;

beforeAll(async () => {
  ({ app, db, close } = await setup());
});
afterAll(() => close());

const post = (uid: string, url: string, payload: unknown) =>
  app.inject({
    method: 'POST',
    url,
    headers: { ...auth(uid), 'content-type': 'application/json' },
    payload: JSON.stringify(payload),
  });
const get = (uid: string, url: string) => app.inject({ method: 'GET', url, headers: auth(uid) });
const del = (uid: string, url: string) => app.inject({ method: 'DELETE', url, headers: auth(uid) });

const create = async (uid: string, stops = [stop(1), stop(2)]) => {
  const r = await post(uid, '/v1/itineraries', { source: 'manual', stops });
  return r.json<{ id: string }>().id;
};

describe('health', () => {
  it('/healthz is public', async () => {
    const r = await app.inject({ method: 'GET', url: '/healthz' });
    expect(r.statusCode).toBe(200);
    expect(r.json()).toEqual({ status: 'ok' });
  });

  it('/readyz checks the database', async () => {
    const r = await app.inject({ method: 'GET', url: '/readyz' });
    expect(r.statusCode).toBe(200);
  });
});

describe('authentication', () => {
  it.each([
    ['no header', {}],
    ['wrong scheme', { authorization: 'Basic abc' }],
    ['empty bearer', { authorization: 'Bearer ' }],
    ['bad token', { authorization: 'Bearer nope' }],
  ])('rejects %s with 401 and a generic body', async (_n, headers) => {
    const r = await app.inject({ method: 'GET', url: '/v1/me', headers });
    expect(r.statusCode).toBe(401);
    expect(r.json()).toEqual({ error: 'unauthorized' });
  });

  it('protects every /v1 route', async () => {
    for (const [method, url] of [
      ['GET', '/v1/me'],
      ['DELETE', '/v1/me'],
      ['GET', '/v1/me/export'],
      ['POST', '/v1/itineraries'],
      ['GET', '/v1/itineraries'],
      ['GET', '/v1/itineraries/00000000-0000-0000-0000-000000000000'],
      ['DELETE', '/v1/itineraries/00000000-0000-0000-0000-000000000000'],
      ['POST', '/v1/ocr'],
    ] as const) {
      const r = await app.inject({ method, url });
      expect(r.statusCode, `${method} ${url}`).toBe(401);
    }
  });
});

describe('authentication happens before the body is read', () => {
  it('answers 401, not 413, to an unauthenticated oversized body', async () => {
    const r = await app.inject({
      method: 'POST',
      url: '/v1/itineraries',
      headers: { 'content-type': 'application/json' },
      payload: JSON.stringify({ pad: 'x'.repeat(2 * 1024 * 1024) }),
    });
    expect(r.statusCode).toBe(401);
  });
});

describe('/v1/me', () => {
  it('creates the user on first sight and returns the same id afterwards', async () => {
    const a = (await get('me-1', '/v1/me')).json<{ id: string; email: string }>();
    const b = (await get('me-1', '/v1/me')).json<{ id: string }>();
    expect(a.email).toBe('me-1@example.com');
    expect(b.id).toBe(a.id);
  });
});

describe('itineraries', () => {
  it('creates, reads back (stops ordered) and lists', async () => {
    const id = await create('it-1', [stop(2), stop(1, { packageCount: 3, needsReview: true })]);
    const r = await get('it-1', `/v1/itineraries/${id}`);
    expect(r.statusCode).toBe(200);
    const body = r.json<{ id: string; source: string; stops: Array<Record<string, unknown>> }>();
    expect(body.source).toBe('manual');
    expect(body.stops.map((s) => s.stopNumber)).toEqual([1, 2]);
    expect(body.stops[0]).toMatchObject({ packageCount: 3, needsReview: true, windowEndMin: 1110 });

    const list = (await get('it-1', '/v1/itineraries')).json<
      Array<{ id: string; stopCount: number }>
    >();
    expect(list.find((i) => i.id === id)).toMatchObject({ stopCount: 2 });
  });

  it('lists newest first', async () => {
    const first = await create('it-order');
    await new Promise((r) => setTimeout(r, 5));
    const second = await create('it-order');
    const list = (await get('it-order', '/v1/itineraries')).json<Array<{ id: string }>>();
    expect(list.map((i) => i.id)).toEqual([second, first]);
  });

  it("never exposes another user's itinerary (404, not 403) or lets them delete it", async () => {
    const id = await create('owner');
    expect((await get('intruder', `/v1/itineraries/${id}`)).statusCode).toBe(404);
    expect((await del('intruder', `/v1/itineraries/${id}`)).statusCode).toBe(404);
    expect((await get('intruder', '/v1/itineraries')).json()).toEqual([]);
    expect((await get('owner', `/v1/itineraries/${id}`)).statusCode).toBe(200);
  });

  it('deletes your own itinerary and its stops', async () => {
    const id = await create('deleter');
    expect((await del('deleter', `/v1/itineraries/${id}`)).statusCode).toBe(204);
    expect((await get('deleter', `/v1/itineraries/${id}`)).statusCode).toBe(404);
    const left = await db.query('SELECT 1 FROM stops WHERE itinerary_id = $1', [id]);
    expect(left.rows).toEqual([]);
  });

  it('treats a malformed id as not found rather than a server error', async () => {
    expect((await get('it-1', '/v1/itineraries/not-a-uuid')).statusCode).toBe(404);
  });

  it('is atomic: a bad stop leaves no half-created itinerary', async () => {
    const before = (await get('atomic', '/v1/itineraries')).json<unknown[]>().length;
    const r = await post('atomic', '/v1/itineraries', {
      source: 'manual',
      stops: [stop(1), stop(1)], // duplicate number
    });
    expect(r.statusCode).toBe(400);
    expect((await get('atomic', '/v1/itineraries')).json<unknown[]>().length).toBe(before);
  });

  it.each([
    ['no stops', { source: 'manual', stops: [] }],
    ['bad source', { source: 'telepathy', stops: [stop(1)] }],
    ['blank address', { source: 'manual', stops: [stop(1, { address: '   ' })] }],
    ['address too long', { source: 'manual', stops: [stop(1, { address: 'x'.repeat(501) })] }],
    ['stop number 0', { source: 'manual', stops: [stop(0)] }],
    ['window out of range', { source: 'manual', stops: [stop(1, { windowEndMin: 1440 })] }],
    ['negative packages', { source: 'manual', stops: [stop(1, { packageCount: -1 })] }],
    [
      'too many stops',
      { source: 'manual', stops: Array.from({ length: 501 }, (_, i) => stop(i + 1)) },
    ],
    ['not an object', 'hello'],
  ])('rejects %s with 400', async (_n, payload) => {
    const r = await post('validator', '/v1/itineraries', payload);
    expect(r.statusCode).toBe(400);
    expect(r.json<{ error: string }>().error).toBe('invalid_request');
  });

  it('does not echo submitted values back in validation errors', async () => {
    const r = await post('validator', '/v1/itineraries', {
      source: 'manual',
      stops: [stop(1, { address: '', secret: 'hunter2' })],
    });
    expect(r.body).not.toContain('hunter2');
  });

  it('accepts exactly 500 stops', async () => {
    const stops = Array.from({ length: 500 }, (_, i) => stop(i + 1));
    expect(
      (await post('big', '/v1/itineraries', { source: 'scan', scannedAt: 1700000000000, stops }))
        .statusCode,
    ).toBe(201);
  });
});

describe('account deletion and export', () => {
  it('exports only your own data', async () => {
    await create('exp-a', [stop(1)]);
    await create('exp-b', [stop(1, { address: '999 Other Road' })]);
    const r = await get('exp-a', '/v1/me/export');
    expect(r.statusCode).toBe(200);
    const body = r.json<{ user: { email: string }; itineraries: Array<{ stops: unknown[] }> }>();
    expect(body.user.email).toBe('exp-a@example.com');
    expect(body.itineraries).toHaveLength(1);
    expect(r.body).not.toContain('999 Other Road');
  });

  it('DELETE /v1/me erases the user, itineraries and stops, and nothing of anyone else', async () => {
    await create('gone', [stop(1), stop(2)]);
    await create('stays', [stop(1)]);
    expect((await del('gone', '/v1/me')).statusCode).toBe(204);

    const users = await db.query<{ firebase_uid: string }>(
      `SELECT firebase_uid FROM users WHERE firebase_uid IN ('gone','stays')`,
    );
    expect(users.rows.map((u) => u.firebase_uid)).toEqual(['stays']);
    const stays = (await get('stays', '/v1/itineraries')).json<unknown[]>();
    expect(stays).toHaveLength(1);
  });
});
