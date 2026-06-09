import { PrismaClient } from '@prisma/client';
import { patientService } from './src/modules/patients/patient.service.js';

const prisma = new PrismaClient();

async function run() {
  console.log('Searching for user with DNI 77777777...');
  const user = await prisma.user.findUnique({
    where: { dni: '77777777' },
    include: { gestante: true }
  });

  if (!user || !user.gestante) {
    console.error('User or Gestante profile not found! Current users:');
    const all = await prisma.user.findMany({ select: { dni: true, role: true } });
    console.log(all);
    return;
  }

  console.log('Found gestante profile ID:', user.gestante.id);
  console.log('Attempting update with updatePatient...');
  
  try {
    const result = await patientService.updatePatient(user.gestante.id, {
      firstName: user.firstName,
      lastName: 'Quispe Ramos',
      phone: '951753456',
      email: null,
      fechaNacimiento: user.gestante.fechaNacimiento ? user.gestante.fechaNacimiento.toISOString() : null,
      fum: new Date('2026-03-17').toISOString(),
    });
    console.log('Update successful!', result);
  } catch (error: any) {
    console.error('Error during update:');
    console.error(error);
    if (error.stack) console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

run();
