import { User } from '@prisma/client';
import { UserResponseDto } from './admin.dto';

/**
 * Prisma `User` → API javobi. OQ RO'YXAT: faqat shu yerda sanalgan maydonlar chiqadi.
 * `password` (bcrypt hash) va kelajakdagi ichki maydonlar hech qachon javobga tushmaydi.
 * Prisma obyektini to'g'ridan-to'g'ri qaytarish taqiqlanadi (docs/04-API-CONVENTIONS.md §3).
 */
export const toUserResponse = (user: User): UserResponseDto => ({
  id: user.id,
  firstName: user.firstName,
  lastName: user.lastName,
  phone: user.phone,
  email: user.email,
  emailVerified: user.emailVerified,
  emailVerifiedAt: user.emailVerifiedAt,
  gender: user.gender,
  birthday: user.birthday,
  name: user.name,
  subType: user.subType,
  roleId: user.roleId,
  active: user.active,
  deletedAt: user.deletedAt,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});
