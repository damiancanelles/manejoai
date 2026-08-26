import { PrismaClient, StaffRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL || 'admin@manejoai.local';
  const password = process.env.SEED_ADMIN_PASSWORD || 'changeme123';

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Admin user ${email} already exists, skipping.`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: {
      email,
      passwordHash,
      name: 'Admin',
      role: StaffRole.ADMIN,
    },
  });

  console.log(`Created admin user: ${email} / ${password}`);
  console.log('Log in with these, then change the password (there is no change-password endpoint yet - update it directly with Prisma Studio for now).');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
