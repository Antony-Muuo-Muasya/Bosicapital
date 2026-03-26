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
  console.log('--- SEEDING ROLES ---');
  
  // 1. Ensure Organization exists
  const org = await prisma.organization.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      name: 'Bosi Capital Limited',
    }
  });

  // 2. Define all roles
  const roles = [
    { id: 'superadmin', name: 'Super Admin', systemRole: true },
    { id: 'admin', name: 'Admin', systemRole: true },
    { id: 'manager', name: 'Manager', systemRole: true },
    { id: 'loan_officer', name: 'Loan Officer', systemRole: true },
  ];

  for (const role of roles) {
    const createdRole = await prisma.role.upsert({
      where: { id: role.id },
      update: {
        name: role.name,
        systemRole: role.systemRole,
        organizationId: org.id
      },
      create: {
        id: role.id,
        name: role.name,
        systemRole: role.systemRole,
        organizationId: org.id
      }
    });
    console.log(`Role confirmed: ${createdRole.name} (${createdRole.id})`);
  }

  console.log('------------------------');
  console.log('SUCCESS! All roles have been seeded/updated.');
}

main()
  .catch((e) => {
    console.error('Error seeding roles:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
