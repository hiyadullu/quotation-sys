import type { User } from '@prisma/client';
import type { UserDTO } from '@pool-quote/shared';

export const toUserDTO = (u: User): UserDTO => ({
  id: u.id,
  name: u.name,
  email: u.email,
  mobile: u.mobile,
  role: u.role,
  isActive: u.isActive,
  createdAt: u.createdAt.toISOString(),
});
