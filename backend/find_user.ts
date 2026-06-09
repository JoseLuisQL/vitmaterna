import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({
    where: { dni: '75066503' }
  });
  if (user) {
    console.log(JSON.stringify(user, null, 2));
  } else {
    console.log('User not found');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
