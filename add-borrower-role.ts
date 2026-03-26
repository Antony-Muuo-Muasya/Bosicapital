import { Pool } from 'pg'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const prismaClientSingleton = () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  const adapter = new PrismaPg(pool as any)
  return new PrismaClient({ adapter })
}

const prisma = prismaClientSingleton()

async function main() {
  const role = await prisma.role.upsert({
    where: { id: 'borrower' },
    update: {},
    create: {
      id: 'borrower',
      name: 'Borrower',
      systemRole: true,
      organizationId: 'default'
    }
  });
  console.log('Role created:', role.id);
}

main().catch(console.error).finally(() => prisma.$disconnect());
