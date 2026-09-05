import { PrismaClient, SUB_TYPE } from '@prisma/client';
import { PERMISSIONS } from '../src/api/auth/auth.enum';
import { ROLE_CODE } from '../src/api/role/role.enum';

const prisma = new PrismaClient();

// Barqaror ID'lar — mavjud muhitlardagi yozuvlar bilan mos kelishi uchun.
const SUPER_ADMIN_ROLE_ID = 'bfdc30ce-9442-4729-9f2c-4513d851052c';
const SUPER_ADMIN_USER_ID = 'ce22df22-85a2-45e8-a33a-3884f47aad4f';

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

async function seedSuperAdminUser(roleId: string) {
  const user = await prisma.user.upsert({
    where: { phone: '998995107444' },
    update: { roleId, subType: SUB_TYPE.ADMIN, active: true },
    create: {
      id: SUPER_ADMIN_USER_ID,
      firstName: 'Shohboz',
      lastName: 'Rahmonov',
      phone: '998995107444',
      email: 'shahbozbek10199701@gmail.com',
      gender: 'MALE',
      birthday: '01.11.1997',
      password: '$2b$10$Lh.0oN.tAwKRQIqTgyDa0upe0dyDtr5/kT5uy/VyHuRNvqyj2ue12',
      subType: SUB_TYPE.ADMIN,
      roleId,
      active: true,
      emailVerified: true,
      emailVerifiedAt: new Date(),
    },
  });

  console.log(`Super admin user: ${user.id}`);
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
