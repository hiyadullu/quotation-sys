import type { Prisma } from '@prisma/client';
import type { ZodTypeAny, z } from 'zod';
import { badRequest } from './errors';

/** Parse untrusted input with a zod schema, throwing a 400 that lists every field error. */
export function parse<S extends ZodTypeAny>(schema: S, data: unknown): z.output<S> {
  const result = schema.safeParse(data);
  if (result.success) return result.data;

  const details: Record<string, string[]> = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join('.') || '_';
    (details[key] ??= []).push(issue.message);
  }
  const first = result.error.issues[0];
  throw badRequest(first ? `${first.path.length ? `${first.path.join('.')}: ` : ''}${first.message}` : 'Invalid request.', details);
}

/** Prisma returns Decimal objects; the API speaks plain numbers. */
export const num = (value: Prisma.Decimal | number | string): number => Number(value);

/** HTML form inputs send '' for "nothing": store that as NULL. */
export const emptyToNull = (value: string | undefined | null): string | null => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

/** Express 5 types params as string | string[]; our routes only use single-segment params. */
export const param = (value: string | string[] | undefined): string => (Array.isArray(value) ? (value[0] ?? '') : (value ?? ''));
