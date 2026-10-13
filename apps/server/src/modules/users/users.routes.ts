import { Router } from 'express';
import { normalizeMobile, userCreateSchema, userUpdateSchema } from '@pool-quote/shared';
import { badRequest, notFound } from '../../lib/errors';
import { emptyToNull, param, parse } from '../../lib/http';
import { prisma } from '../../lib/prisma';
import { currentUser } from '../../middleware/authenticate';
import { hashPassword } from '../auth/auth.service';
import { toUserDTO } from './users.mapper';

/** Mounted behind `requireRole('ADMIN')`. */
export const usersRouter = Router();

const mobileOrNull = (value?: string) => (value ? normalizeMobile(value) : null);

usersRouter.get('/', async (_req, res) => {
  const users = await prisma.user.findMany({ orderBy: [{ isActive: 'desc' }, { name: 'asc' }] });
  res.json({ data: users.map(toUserDTO) });
});

usersRouter.post('/', async (req, res) => {
  const input = parse(userCreateSchema, req.body);
  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      mobile: mobileOrNull(input.mobile),
      role: input.role,
      passwordHash: await hashPassword(input.password),
    },
  });
  res.status(201).json(toUserDTO(user));
});

usersRouter.put('/:id', async (req, res) => {
  const id = param(req.params.id);
  const input = parse(userUpdateSchema, req.body);
  const me = currentUser(req);

  if (id === me.id && (!input.isActive || input.role !== 'ADMIN')) {
    throw badRequest('You cannot deactivate or demote your own account.');
  }
  if (!(await prisma.user.findUnique({ where: { id }, select: { id: true } }))) throw notFound('User');

  const user = await prisma.user.update({
    where: { id },
    data: {
      name: input.name,
      email: input.email,
      mobile: emptyToNull(mobileOrNull(input.mobile)),
      role: input.role,
      isActive: input.isActive,
      ...(input.password ? { passwordHash: await hashPassword(input.password) } : {}),
    },
  });
  res.json(toUserDTO(user));
});
