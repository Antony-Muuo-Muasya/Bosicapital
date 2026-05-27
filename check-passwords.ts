import prisma from './src/lib/db.ts';

async function main() {
  const users = await prisma.user.findMany({ 
      where: { password: { not: null } },
      select: { email: true } 
  });
  console.log('Users with passwords:', users);
}

main().catch(console.error).finally(() => prisma.$disconnect());
