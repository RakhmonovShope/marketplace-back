import { PrismaClient, SUB_TYPE } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PERMISSIONS } from '../src/api/auth/auth.enum';
import { ROLE_CODE } from '../src/api/role/role.enum';

const prisma = new PrismaClient();

// Barqaror rol ID'si — mavjud muhitlardagi yozuvlar bilan mos kelishi uchun.
const SUPER_ADMIN_ROLE_ID = 'bfdc30ce-9442-4729-9f2c-4513d851052c';

/**
 * Seed IDEMPOTENT: `upsert` ishlatiladi, ikki marta ishga tushirilsa dublikat bo'lmaydi.
 * Super-admin roli har safar BARCHA permission'larni oladi (yangi modul qo'shilganda
 * qo'lda ro'yxatni yangilash shart emas).
 */
async function seedRoles() {
  const allPermissions = Object.values(PERMISSIONS);

  const superAdmin = await prisma.role.upsert({
    where: { code: ROLE_CODE.SUPER_ADMIN },
    update: { permissions: allPermissions, isSystem: true, active: true },
    create: {
      id: SUPER_ADMIN_ROLE_ID,
      code: ROLE_CODE.SUPER_ADMIN,
      nameUz: 'Super admin',
      nameRu: 'Супер администратор',
      isSystem: true,
      active: true,
      permissions: allPermissions,
    },
  });

  const customer = await prisma.role.upsert({
    where: { code: ROLE_CODE.CUSTOMER },
    update: { isSystem: true, active: true },
    create: {
      code: ROLE_CODE.CUSTOMER,
      nameUz: 'Mijoz',
      nameRu: 'Клиент',
      isSystem: true,
      active: true,
      permissions: [], // mijozga admin permission'lar kerak emas
    },
  });

  console.log(`Roles: SUPER_ADMIN=${superAdmin.id}, CUSTOMER=${customer.id}`);

  return { superAdmin, customer };
}

/**
 * Super-admin foydalanuvchi — ma'lumotlar ENV'dan (repo'da shaxsiy ma'lumot/hash saqlanmaydi):
 *   SEED_ADMIN_PHONE (majburiy), SEED_ADMIN_PASSWORD (yangi yaratishda majburiy),
 *   SEED_ADMIN_EMAIL, SEED_ADMIN_FIRST_NAME, SEED_ADMIN_LAST_NAME (ixtiyoriy).
 * Mavjud foydalanuvchi (telefon bo'yicha) faqat rol/faollik bo'yicha yangilanadi —
 * paroli o'zgartirilmaydi.
 */
/** Bo'sh string ham "berilmagan" hisoblanadi (.env.example'dagi bo'sh qatorlar). */
const env = (key: string): string | undefined => process.env[key] || undefined;

async function seedSuperAdminUser(roleId: string) {
  const phone = env('SEED_ADMIN_PHONE');

  if (!phone) {
    console.warn(
      'SEED_ADMIN_PHONE berilmagan — super-admin foydalanuvchi yaratilmadi (rollar seed qilindi).',
    );
    return;
  }

  const existing = await prisma.user.findUnique({ where: { phone } });

  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: { roleId, subType: SUB_TYPE.ADMIN, active: true, deletedAt: null },
    });
    console.log(`Super admin user updated: ${existing.id}`);
    return;
  }

  const password = env('SEED_ADMIN_PASSWORD');

  if (!password || password.length < 8) {
    console.warn(
      'SEED_ADMIN_PASSWORD (kamida 8 belgi) berilmagan — yangi super-admin yaratilmadi.',
    );
    return;
  }

  const rounds = Number(process.env.BCRYPT_ROUNDS) || 12;

  const user = await prisma.user.create({
    data: {
      firstName: env('SEED_ADMIN_FIRST_NAME') ?? 'Super',
      lastName: env('SEED_ADMIN_LAST_NAME') ?? 'Admin',
      phone,
      email: env('SEED_ADMIN_EMAIL') ?? `admin+${phone}@example.com`,
      gender: 'MALE',
      birthday: '01.01.1990',
      password: await bcrypt.hash(password, rounds),
      subType: SUB_TYPE.ADMIN,
      roleId,
      active: true,
      emailVerified: true,
      emailVerifiedAt: new Date(),
    },
  });

  console.log(`Super admin user created: ${user.id}`);
}

async function main() {
  const { superAdmin } = await seedRoles();
  await seedSuperAdminUser(superAdmin.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
