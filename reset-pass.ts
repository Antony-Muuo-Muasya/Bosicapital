import { Pool } from 'pg'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'

const prismaClientSingleton = () => {
  const pool = new Pool({ connectionString: "postgresql://postgres:Antonymuuo001%23@localhost:5432/postgres" })
  const adapter = new PrismaPg(pool as any)
  return new PrismaClient({ adapter })
}

const prisma = prismaClientSingleton()

async function main() {
  const users = await prisma.user.findMany();
  
  if (users.length === 0) {
    console.log('No users found.');
    return;
  }

  const user = users[0];
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashedPassword } as any
  });

  console.log('------------------------');
  console.log(`Updated user: ${user.email}`);
  console.log(`Password reset to: admin123`);
  console.log('------------------------');
}

main().catch(console.error).finally(() => prisma.$disconnect());
