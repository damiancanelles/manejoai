import { PrismaClient, StaffRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { slugify } from '../src/common/slugify';

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
  const businessName = process.env.COMPANY_NAME || 'SCG SERVICES LLC';
  await prisma.user.create({
    data: {
      email,
      passwordHash,
      name: 'Admin',
      role: StaffRole.ADMIN,
      business: {
        connectOrCreate: {
          where: { id: 'default-business' },
          create: {
            id: 'default-business',
            name: businessName,
            addressLine1: process.env.COMPANY_ADDRESS_LINE1 || '131 Hillcrest Dr SW',
            addressLine2: process.env.COMPANY_ADDRESS_LINE2 || 'Austell, GA 30168-6737',
            phone: process.env.COMPANY_PHONE || '404-507-4044',
            emailSlug: slugify(businessName),
            replyToEmail: email,
            // The original single-tenant business predates subscription
            // billing - grandfathered active, same as the migration did
            // for every business that already existed when it shipped.
            subscriptionStatus: 'active',
          },
        },
      },
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
