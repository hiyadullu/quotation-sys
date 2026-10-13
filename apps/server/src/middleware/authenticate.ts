import type { NextFunction, Request, Response } from 'express';
import type { Role } from '@pool-quote/shared';
import { forbidden, unauthorized } from '../lib/errors';
import { prisma } from '../lib/prisma';
import { SESSION_COOKIE, verifySessionToken } from '../modules/auth/session';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

/** Requires a valid session cookie; re-reads the user so deactivation takes effect immediately. */
export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  const token = req.cookies?.[SESSION_COOKIE] as string | undefined;
  const userId = token ? verifySessionToken(token) : null;
  if (!userId) throw unauthorized();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true, isActive: true },
  });
  if (!user || !user.isActive) throw unauthorized('Your account is inactive. Contact the administrator.');

  req.user = { id: user.id, name: user.name, email: user.email, role: user.role };
  next();
}

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) throw unauthorized();
    if (!roles.includes(req.user.role)) throw forbidden('Only an administrator can do that.');
    next();
  };
}

/** Use inside handlers after `authenticate` has run. */
export function currentUser(req: Request): AuthUser {
  if (!req.user) throw unauthorized();
  return req.user;
}
