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
  console.log('--- SEEDING INITIAL DATA ---');
  
  // 1. Create Organization
  const org = await prisma.organization.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      name: 'Bosi Capital Limited',
      logoUrl: '/logo.png',
      slogan: 'Financial Freedom'
    }
  });
  console.log('Organization created:', org.name);

  // 2. Create Roles
  const roles = [
    { id: 'superadmin', name: 'Super Admin', systemRole: true },
    { id: 'admin', name: 'Admin', systemRole: true },
    { id: 'manager', name: 'Manager', systemRole: true },
    { id: 'loan_officer', name: 'Loan Officer', systemRole: true },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { id: role.id },
      update: {},
      create: {
        ...role,
        organizationId: org.id
      }
    });
  }
  console.log('Roles created.');

  // 3. Create Branch
  const branch = await prisma.branch.upsert({
    where: { id: 'main' },
    update: {},
    create: {
      id: 'main',
      organizationId: org.id,
      name: 'Main Branch',
      location: 'Nairobi',
      isMain: true
    }
  });
  console.log('Branch created.');

  // 4. Create Admin User
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const user = await prisma.user.upsert({
    where: { email: 'admin@bosicapital.com' },
    update: { password: hashedPassword },
    create: {
      email: 'admin@bosicapital.com',
      fullName: 'System Administrator',
      password: hashedPassword,
      organizationId: org.id,
      roleId: 'superadmin',
      status: 'active',
      branchIds: [branch.id]
    }
  });
  
  console.log('------------------------');
  console.log('SEEDING COMPLETE!');
  console.log('--- LOGIN CREDENTIALS ---');
  console.log('Email: admin@bosicapital.com');
  console.log('Password: admin123');
  console.log('------------------------');
}

main().catch(console.error).finally(() => prisma.$disconnect());
