import prisma from './src/lib/db.ts';
import bcrypt from 'bcryptjs';

async function main() {
  const users = await prisma.user.findMany({ 
    include: { organization: true, role: true } 
  });
  
  if (users.length === 0) {
    console.log('No users found in database.');
    return;
  }

  console.log('Found', users.length, 'users.');
  const firstUser = users[0];
  console.log('Resetting password for:', firstUser.email);
  
  const hashedPassword = await bcrypt.hash('admin123', 10);
  await prisma.user.update({
    where: { id: firstUser.id },
    data: { password: hashedPassword } as any
  });
  
  console.log('Password reset to: admin123');
  console.log('You can now log in with:', firstUser.email);
}

main().catch(console.error).finally(() => prisma.$disconnect());
