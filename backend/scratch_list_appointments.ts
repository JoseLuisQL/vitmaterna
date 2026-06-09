import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  const gestante = await prisma.gestante.findFirst({
    where: { user: { dni: '77777777' } }
  });

  if (!gestante) {
    console.error('Gestante not found!');
    return;
  }

  console.log('Gestante ID:', gestante.id);
  const appointments = await prisma.appointment.findMany({
    where: { gestanteId: gestante.id },
    orderBy: { fecha: 'asc' }
  });

  console.log('Appointments count:', appointments.length);
  console.log(JSON.stringify(appointments, null, 2));
  await prisma.$disconnect();
}

run();
