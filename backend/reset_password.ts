import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const newPassword = 'Password@2026';
  const hashedPassword = await bcrypt.hash(newPassword, 12);
  
  const user = await prisma.user.update({
    where: { dni: '75066503' },
    data: { 
      passwordHash: hashedPassword,
      failedLoginAttempts: 0,
    }
  });
  
  if (user) {
    console.log(`Password successfully reset!`);
    console.log(`DNI: ${user.dni}`);
    console.log(`New Password: ${newPassword}`);
  } else {
    console.log('User not found');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
