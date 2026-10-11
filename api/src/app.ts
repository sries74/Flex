import Fastify, { type FastifyError, type FastifyInstance } from 'fastify';
import { ZodError } from 'zod';
import { AuthError, type TokenVerifier } from './auth/verifier.js';
import type { Db } from './db.js';
import { OcrProviderError, OcrRequest, RawOcrResponse, type OcrService } from './ocr/types.js';
import type { RateLimiter } from './rateLimit.js';
import * as repo from './repo.js';
import { ItineraryInput, UuidParam } from './schemas.js';

declare module 'fastify' {
  interface FastifyRequest {
    userId: string;
  }
}

export interface AppDeps {
  db: Db;
  verifier: TokenVerifier;
  /** Absent when no OCR provider is configured → POST /v1/ocr answers 503. */
  ocr?: OcrService;
  ocrLimiter?: RateLimiter;
  logger?: false | { level: string };
}

const OCR_BODY_LIMIT = 8 * 1024 * 1024;

export async function buildApp(deps: AppDeps): Promise<FastifyInstance> {
  const { db, verifier } = deps;

  const app = Fastify({
    logger:
      deps.logger === false
        ? false
        : {
            level: deps.logger?.level ?? 'info',
            // Never log credentials. Request bodies (addresses, images) are not logged by Fastify.
            redact: ['req.headers.authorization'],
          },
    bodyLimit: 1024 * 1024,
    trustProxy: true, // behind Caddy
  });

  app.decorateRequest('userId', '');

  app.setErrorHandler((err: FastifyError | Error, req, reply) => {
    if (err instanceof AuthError) return reply.code(401).send({ error: 'unauthorized' });
    if (err instanceof ZodError) {
      // Report which fields failed, never the submitted values.
      const fields = [...new Set(err.issues.map((i) => i.path.join('.')))];
      return reply.code(400).send({ error: 'invalid_request', fields });
    }
    const status = (err as FastifyError).statusCode;
    if (status && status >= 400 && status < 500) {
      return reply
        .code(status)
        .send({ error: status === 413 ? 'payload_too_large' : 'invalid_request' });
    }
    req.log.error(
      { err: { name: err.name, code: (err as { code?: string }).code } },
      'unhandled error',
    );
    return reply.code(500).send({ error: 'internal' });
  });

  app.get('/healthz', async () => ({ status: 'ok' }));

  app.get('/readyz', async (_req, reply) => {
    try {
      await db.query('SELECT 1');
      return { status: 'ready' };
    } catch {
      return reply.code(503).send({ status: 'unavailable' });
    }
  });

  await app.register(
    async (v1) => {
      v1.addHook('onRequest', async (req) => {
        const header = req.headers.authorization ?? '';
        const m = /^Bearer (.+)$/.exec(header);
        if (!m) throw new AuthError();
        const user = await verifier.verify(m[1]!);
        req.userId = (await repo.ensureUser(db, user.uid, user.email)).id;
      });

      v1.get('/me', async (req) => {
        const r = await db.query<{ id: string; email: string | null }>(
          'SELECT id, email FROM users WHERE id = $1',
          [req.userId],
        );
        return r.rows[0];
      });

      v1.delete('/me', async (req, reply) => {
        await repo.deleteUser(db, req.userId);
        return reply.code(204).send();
      });

      v1.get('/me/export', async (req) => repo.exportUser(db, req.userId));

      v1.post('/itineraries', async (req, reply) => {
        const input = ItineraryInput.parse(req.body);
        const id = await repo.createItinerary(db, req.userId, input);
        return reply.code(201).send({ id });
      });

      v1.get('/itineraries', async (req) => repo.listItineraries(db, req.userId));

      v1.get('/itineraries/:id', async (req, reply) => {
        const id = UuidParam.safeParse((req.params as { id: string }).id);
        const found = id.success ? await repo.getItinerary(db, req.userId, id.data) : null;
        if (!found) return reply.code(404).send({ error: 'not_found' });
        return found;
      });

      v1.delete('/itineraries/:id', async (req, reply) => {
        const id = UuidParam.safeParse((req.params as { id: string }).id);
        const removed = id.success && (await repo.deleteItinerary(db, req.userId, id.data));
        if (!removed) return reply.code(404).send({ error: 'not_found' });
        return reply.code(204).send();
      });

      v1.post('/ocr', { bodyLimit: OCR_BODY_LIMIT }, async (req, reply) => {
        if (!deps.ocr) return reply.code(503).send({ error: 'ocr_unavailable' });

        const limited = deps.ocrLimiter?.check(req.userId);
        if (limited && !limited.allowed) {
          return reply
            .code(429)
            .header('Retry-After', String(limited.retryAfterSec))
            .send({ error: 'rate_limited' });
        }

        const body = OcrRequest.parse(req.body);
        try {
          const out = RawOcrResponse.safeParse(
            await deps.ocr.extract({ base64: body.image, mimeType: body.mimeType }),
          );
          if (!out.success) throw new OcrProviderError('Provider returned an unusable shape');
          return out.data;
        } catch (e) {
          // Log the class of failure only: provider messages can echo image-derived text.
          req.log.warn(
            { kind: e instanceof OcrProviderError ? 'provider' : 'unknown' },
            'ocr failed',
          );
          return reply.code(502).send({ error: 'ocr_failed' });
        }
      });
    },
    { prefix: '/v1' },
  );

  return app;
}
