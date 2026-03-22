import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.count();
  console.log('User count:', users);
  const orgs = await prisma.organization.count();
  console.log('Org count:', orgs);
  const roles = await prisma.role.count();
  console.log('Role count:', roles);
}

main().catch(console.error).finally(() => prisma.$disconnect());
