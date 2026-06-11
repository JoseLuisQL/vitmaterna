/**
 * Configuración global de pruebas.
 * Silencia los logs de la app durante los tests para una salida limpia,
 * salvo que se exporte LOG_LEVEL explícitamente.
 */
process.env.LOG_LEVEL = process.env.LOG_LEVEL || 'silent';
process.env.NODE_ENV = 'test';
