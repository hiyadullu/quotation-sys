import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { changePasswordSchema, loginSchema } from '@pool-quote/shared';
import { env } from '../../config/env';
import { parse } from '../../lib/http';
import { prisma } from '../../lib/prisma';
import { authenticate, currentUser } from '../../middleware/authenticate';
import { toUserDTO } from '../users/users.mapper';
import { changePassword, verifyLogin } from './auth.service';
import { endSession, startSession } from './session';

export const authRouter = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.isTest ? 1000 : 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many sign-in attempts. Please wait a few minutes.' } },
});

authRouter.post('/login', loginLimiter, async (req, res) => {
  const { identifier, password } = parse(loginSchema, req.body);
  const user = await verifyLogin(identifier, password);
  startSession(res, user.id);
  res.json({ user: toUserDTO(user) });
});

authRouter.post('/logout', (_req, res) => {
  endSession(res);
  res.status(204).end();
});

authRouter.get('/me', authenticate, async (req, res) => {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: currentUser(req).id } });
  res.json({ user: toUserDTO(user) });
});

authRouter.post('/change-password', authenticate, async (req, res) => {
  const { currentPassword, newPassword } = parse(changePasswordSchema, req.body);
  await changePassword(currentUser(req).id, currentPassword, newPassword);
  res.status(204).end();
});
