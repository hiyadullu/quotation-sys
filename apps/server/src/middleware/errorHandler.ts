import type { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import multer from 'multer';
import { ZodError } from 'zod';
import { AppError } from '../lib/errors';
import { logger } from '../lib/logger';

function send(res: Response, status: number, code: string, message: string, details?: Record<string, string[]>) {
  res.status(status).json({ error: { code, message, ...(details ? { details } : {}) } });
}

export function notFoundHandler(req: Request, res: Response) {
  send(res, 404, 'NOT_FOUND', `Route ${req.method} ${req.path} not found.`);
}

// Express identifies error handlers by their four-argument signature.
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) return send(res, err.status, err.code, err.message, err.details);

  if (err instanceof ZodError) {
    return send(res, 400, 'BAD_REQUEST', err.issues[0]?.message ?? 'Invalid request.');
  }

  if (err instanceof multer.MulterError) {
    const message = err.code === 'LIMIT_FILE_SIZE' ? 'That file is too large (max 2 MB).' : err.message;
    return send(res, 400, 'BAD_REQUEST', message);
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') return send(res, 409, 'CONFLICT', 'A record with those details already exists.');
    if (err.code === 'P2025') return send(res, 404, 'NOT_FOUND', 'Record not found.');
    if (err.code === 'P2003') return send(res, 409, 'CONFLICT', 'This record is still in use and cannot be removed.');
  }

  if (typeof err === 'object' && err !== null && (err as { type?: string }).type === 'entity.parse.failed') {
    return send(res, 400, 'BAD_REQUEST', 'Request body is not valid JSON.');
  }

  logger.error({ err, path: req.path, method: req.method }, 'Unhandled error');
  return send(res, 500, 'INTERNAL', 'Something went wrong on our side. Please try again.');
}
