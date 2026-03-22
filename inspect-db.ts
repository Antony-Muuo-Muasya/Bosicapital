import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const org = await prisma.organization.findFirst();
  const role = await prisma.role.findFirst({ where: { id: 'superadmin' } });
  const users = await prisma.user.findMany({ take: 5 });
  
  console.log('Org:', org?.id, org?.name);
  console.log('Superadmin Role:', role?.id);
  console.log('Users (first 5):', users.map(u => ({ email: u.email, hasPassword: !!u.password })));
}

main().catch(console.error).finally(() => prisma.$disconnect());
