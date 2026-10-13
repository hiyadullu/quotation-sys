import bcrypt from 'bcryptjs';
import { normalizeMobile } from '@pool-quote/shared';
import { badRequest, unauthorized } from '../../lib/errors';
import { prisma } from '../../lib/prisma';

const BCRYPT_ROUNDS = 12;
// Compared against when the account does not exist so response time doesn't reveal valid logins.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', BCRYPT_ROUNDS);

export const hashPassword = (password: string) => bcrypt.hash(password, BCRYPT_ROUNDS);

export async function verifyLogin(identifier: string, password: string) {
  const trimmed = identifier.trim();
  const where = trimmed.includes('@')
    ? { email: trimmed.toLowerCase() }
    : { mobile: normalizeMobile(trimmed) ?? '__invalid__' };

  const user = await prisma.user.findUnique({ where });
  const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);

  if (!user || !ok) throw unauthorized('Incorrect email/mobile or password.');
  if (!user.isActive) throw unauthorized('Your account is inactive. Contact the administrator.');
  return user;
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
    throw badRequest('Your current password is incorrect.', { currentPassword: ['Incorrect password'] });
  }
  await prisma.user.update({ where: { id: userId }, data: { passwordHash: await hashPassword(newPassword) } });
}
