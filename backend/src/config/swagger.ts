import swaggerJsdoc from 'swagger-jsdoc';

const swaggerDefinition: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.1.0',
    info: {
      title: 'VITMATERNA API',
      version: '1.0.0',
      description:
        'API REST para la plataforma de salud prenatal VITMATERNA. ' +
        'Diseñada para mejorar la adherencia a controles prenatales y suplementación ' +
        'en gestantes del Centro de Salud Talavera (Andahuaylas, Apurímac, Perú).',
      contact: {
        name: 'VITMATERNA Dev Team',
        email: 'dev@vitmaterna.pe',
      },
      license: {
        name: 'Proprietary',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development Server',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Access token JWT obtenido desde /v1/auth/login',
        },
      },
      schemas: {
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string', example: 'VALIDATION_ERROR' },
                message: { type: 'string', example: 'El campo DNI es requerido' },
                details: { type: 'array', items: { type: 'object' } },
              },
            },
          },
        },
        SuccessResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: { type: 'object' },
            meta: {
              type: 'object',
              properties: {
                page: { type: 'integer', example: 1 },
                limit: { type: 'integer', example: 20 },
                total: { type: 'integer', example: 150 },
                totalPages: { type: 'integer', example: 8 },
              },
            },
          },
        },
      },
    },
    security: [{ BearerAuth: [] }],
    tags: [
      { name: 'Auth', description: 'Autenticación y gestión de sesiones' },
      { name: 'Gestantes', description: 'Gestión de perfiles de gestantes' },
      { name: 'Appointments', description: 'Citas prenatales' },
      { name: 'Treatments', description: 'Tratamientos y suplementación' },
      { name: 'Clinical', description: 'Seguimiento clínico' },
      { name: 'Education', description: 'Contenido educativo' },
      { name: 'Notifications', description: 'Notificaciones' },
      { name: 'Reports', description: 'Reportes y estadísticas' },
      { name: 'Messages', description: 'Mensajería' },
      { name: 'Admin', description: 'Administración del sistema' },
    ],
  },
  apis: ['./src/modules/**/*.routes.ts', './src/modules/**/*.schema.ts'],
};

export const swaggerSpec = swaggerJsdoc(swaggerDefinition);
