import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const existingRole = await prisma.role.findUnique({
    where: { id: 'bfdc30ce-9442-4729-9f2c-4513d851052c' },
  });

  if (!existingRole) {
    const superAdminRole = await prisma.role.create({
      data: {
        id: 'bfdc30ce-9442-4729-9f2c-4513d851052c',
        nameUz: 'Super admin Uz',
        nameRu: 'Super Admin Ru',
        active: true,
        permissions: [
          'ADMIN__CREATE',
          'ADMIN__VIEW',
          'ADMIN__UPDATE',
          'ADMIN__DELETE',
          'ROLE__CREATE',
          'ROLE__VIEW',
          'ROLE__UPDATE',
          'ROLE__DELETE',
          'ROLE__PERMISSION__VIEW',
          'CATEGORY__CREATE',
          'CATEGORY__VIEW',
          'CATEGORY__UPDATE',
          'CATEGORY__DELETE',
          'FILE__UPLOAD',
          'FILE__VIEW',
          'PAGE__CREATE',
          'PAGE__VIEW',
          'PAGE__UPDATE',
          'PAGE__DELETE',
          'BADGE__CREATE',
          'BADGE__VIEW',
          'BADGE__UPDATE',
          'BADGE__DELETE',
          'BANNER__CREATE',
          'BANNER__VIEW',
          'BANNER__UPDATE',
          'BANNER__DELETE',
          'STORE__CREATE',
          'STORE__VIEW',
          'STORE__UPDATE',
          'STORE__DELETE',
        ],
      },
    });

    await prisma.user.create({
      data: {
        id: 'ce22df22-85a2-45e8-a33a-3884f47aad4f',
        firstName: 'Shohboz',
        lastName: 'Rahmonov',
        phone: '998995107444',
        email: 'shahbozbek10199701@gmail.com',
        gender: 'MALE',
        birthday: '01.11.1997',
        password:
          '$2b$10$Lh.0oN.tAwKRQIqTgyDa0upe0dyDtr5/kT5uy/VyHuRNvqyj2ue12',
        subType: 'ADMIN',
        roleId: superAdminRole.id,
        active: true,
      },
    });

    console.log('Created Super Admin user');
  } else {
    console.log('Super Admin role already exists');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
