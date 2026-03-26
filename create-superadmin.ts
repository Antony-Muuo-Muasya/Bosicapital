import { Pool } from 'pg'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'

// This script will use the DATABASE_URL from your .env file
const prismaClientSingleton = () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  const adapter = new PrismaPg(pool as any)
  return new PrismaClient({ adapter })
}

const prisma = prismaClientSingleton()

async function main() {
  console.log('--- CREATING SUPERADMIN USER ---');
  
  // 1. Ensure Organization exists
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
  console.log('Organization confirmed:', org.name);

  // 2. Ensure Superadmin Role exists
  const role = await prisma.role.upsert({
    where: { id: 'superadmin' },
    update: {},
    create: {
      id: 'superadmin',
      organizationId: org.id,
      name: 'Super Admin',
      systemRole: true,
      permissions: ['*'] 
    }
  });
  console.log('Role confirmed:', role.name);

  // 3. Ensure Main Branch exists (required for user status in some patterns)
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
  console.log('Branch confirmed:', branch.name);

  // 4. Create the requested Superadmin User
  const email = 'superadmin@bosicapital.com';
  const rawPassword = 'superadmin123';
  const hashedPassword = await bcrypt.hash(rawPassword, 10);

  const user = await prisma.user.upsert({
    where: { email: email },
    update: { 
      password: hashedPassword,
      roleId: role.id,
      organizationId: org.id,
      status: 'active'
    },
    create: {
      email: email,
      fullName: 'Super Administrator',
      password: hashedPassword,
      organizationId: org.id,
      roleId: role.id,
      status: 'active',
      branchIds: [branch.id]
    }
  });
  
  console.log('------------------------');
  console.log('SUCCESS! Superadmin user created/updated.');
  console.log('Email:', email);
  console.log('Password:', rawPassword);
  console.log('------------------------');
}

main()
  .catch((e) => {
    console.error('Error creating superadmin:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
