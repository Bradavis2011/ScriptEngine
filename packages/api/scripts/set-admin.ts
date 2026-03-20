/**
 * One-time script: grant admin (unlimited) access to a user by email.
 * Run on Railway: npx ts-node src/scripts/set-admin.ts bradavis2011@gmail.com
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error('Usage: npx ts-node scripts/set-admin.ts <email>');
    process.exit(1);
  }

  const result = await prisma.tenant.updateMany({
    where: { email },
    data: { isAdmin: true, tier: 'founders', scriptsPerDay: 9999 },
  });

  if (result.count === 0) {
    console.error(`No tenant found with email: ${email}`);
    console.error('Make sure the user has signed in and completed onboarding first.');
    process.exit(1);
  }

  console.log(`✓ Granted admin + founders access to ${email} (${result.count} record updated)`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
