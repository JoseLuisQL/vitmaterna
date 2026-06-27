/**
 * Seed de PRODUCCIÓN para VITMATERNA.
 *
 * A diferencia de `seed.ts` (datos demo: 40 gestantes, obstetras, contenidos…),
 * este seed crea EXCLUSIVAMENTE un único usuario administrador. No inserta
 * ningún dato de prueba. Es idempotente: se puede correr varias veces sin
 * duplicar nada (upsert por DNI).
 *
 * Credenciales configurables por entorno (recomendado en producción):
 *   ADMIN_DNI        (def. 99999999)
 *   ADMIN_PASSWORD   (def. Admin@2026)  ← CÁMBIALA en producción
 *   ADMIN_FIRST_NAME (def. Administrador)
 *   ADMIN_LAST_NAME  (def. Sistema)
 *   ADMIN_PHONE      (def. +51999999999)
 *   ADMIN_EMAIL      (def. admin@vitmaterna.pe)
 *
 * Uso (en el contenedor, sobre el JS compilado):
 *   node dist/prisma/seed.prod.js
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const dni = process.env.ADMIN_DNI ?? '99999999';
  const password = process.env.ADMIN_PASSWORD ?? 'Admin@2026';
  const firstName = process.env.ADMIN_FIRST_NAME ?? 'Administrador';
  const lastName = process.env.ADMIN_LAST_NAME ?? 'Sistema';
  const phone = process.env.ADMIN_PHONE ?? '+51999999999';
  const email = process.env.ADMIN_EMAIL ?? 'admin@vitmaterna.pe';

  const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS ?? 12);
  const passwordHash = await bcrypt.hash(password, saltRounds);

  console.log('🌱 Seed de producción: creando/actualizando el único usuario admin…');

  const admin = await prisma.user.upsert({
    where: { dni },
    // En re-ejecuciones solo refresca la contraseña; no toca el resto.
    update: { passwordHash },
    create: {
      dni,
      passwordHash,
      role: 'admin',
      firstName,
      lastName,
      phone,
      email,
      isActive: true,
      isVerified: true,
      consentAccepted: true,
      consentDate: new Date(),
    },
  });

  console.log('✅ Admin listo.');
  console.log(`   ID:    ${admin.id}`);
  console.log(`   DNI:   ${dni}`);
  console.log(`   Email: ${email}`);

  // Interruptor global de canales de PAGO (SMS/WhatsApp). Por defecto ACTIVADO.
  // Se registra explícitamente para que aparezca en el panel de admin desde el
  // primer arranque. Idempotente: si ya existe, no se toca su valor.
  await prisma.systemConfig.upsert({
    where: { clave: 'paidChannelsEnabled' },
    update: {},
    create: {
      clave: 'paidChannelsEnabled',
      valor: true,
      descripcion: 'Interruptor global de canales de PAGO (SMS/WhatsApp). En false apaga todo envío que consume créditos.',
      updatedBy: admin.id,
    },
  });
  console.log('✅ Config: paidChannelsEnabled (activado por defecto).');
  if (password === 'Admin@2026') {
    console.warn(
      '⚠️  Estás usando la contraseña por defecto (Admin@2026). ' +
        'Define ADMIN_PASSWORD en producción y/o cámbiala tras el primer login.',
    );
  }
}

main()
  .catch((err) => {
    console.error('❌ Seed de producción falló:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
