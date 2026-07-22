import { NextFunction, Request, Response } from 'express';

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

function clientIp(req: Request) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0]?.trim() || req.ip;
  return req.ip || req.socket.remoteAddress || 'unknown';
}

function policy(path: string) {
  if (path.includes('/auth/login')) return { limit: 8, windowMs: 60_000 };
  if (path.includes('/auth/register')) return { limit: 5, windowMs: 60_000 };
  if (path.includes('/orders/public/checkout')) return { limit: 12, windowMs: 60_000 };
  if (path.includes('/payments/wompi/webhook')) return { limit: 120, windowMs: 60_000 };
  return { limit: 240, windowMs: 60_000 };
}

export function rateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
  const now = Date.now();
  const { limit, windowMs } = policy(req.path);
  const key = `${clientIp(req)}:${req.method}:${req.path}`;
  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return next();
  }

  current.count += 1;
  if (current.count > limit) {
    res.setHeader('Retry-After', Math.ceil((current.resetAt - now) / 1000));
    return res.status(429).json({ statusCode: 429, message: 'Demasiadas solicitudes. Intenta nuevamente en un momento.' });
  }

  return next();
}
