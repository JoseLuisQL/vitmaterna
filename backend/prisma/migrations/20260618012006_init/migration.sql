-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('gestante', 'obstetra', 'admin');

-- CreateEnum
CREATE TYPE "NivelEstudios" AS ENUM ('analfabeta', 'primaria', 'secundaria', 'superior', 'no_universitario');

-- CreateEnum
CREATE TYPE "EstadoCivil" AS ENUM ('casada', 'conviviente', 'soltera', 'otro');

-- CreateEnum
CREATE TYPE "GestacionAnterior" AS ENUM ('eutocico', 'distocico', 'aborto', 'ninguno');

-- CreateEnum
CREATE TYPE "ExamenMamas" AS ENUM ('sin_examen', 'normal', 'patologico');

-- CreateEnum
CREATE TYPE "NivelRiesgo" AS ENUM ('verde', 'amarillo', 'rojo');

-- CreateEnum
CREATE TYPE "EstadoGestante" AS ENUM ('activa', 'parto', 'puerperio', 'inactiva');

-- CreateEnum
CREATE TYPE "TipoAntecedente" AS ENUM ('familiar', 'personal');

-- CreateEnum
CREATE TYPE "EstadoCita" AS ENUM ('programada', 'confirmada', 'asistida', 'no_asistida', 'solicitud_reprogramacion', 'reprogramada', 'cancelada');

-- CreateEnum
CREATE TYPE "ModalidadCita" AS ENUM ('establecimiento', 'domiciliaria');

-- CreateEnum
CREATE TYPE "TipoTratamiento" AS ENUM ('acido_folico', 'sulfato_ferroso', 'calcio', 'otro');

-- CreateEnum
CREATE TYPE "EstadoTratamiento" AS ENUM ('activo', 'suspendido', 'completado');

-- CreateEnum
CREATE TYPE "TipoEcografia" AS ENUM ('genetica', 'morfologica', 'bienestar_fetal');

-- CreateEnum
CREATE TYPE "ClasificacionPeso" AS ENUM ('bajo', 'adecuado', 'alto');

-- CreateEnum
CREATE TYPE "EstadoVacuna" AS ENUM ('pendiente', 'aplicada', 'no_aplica');

-- CreateEnum
CREATE TYPE "SeveridadSigno" AS ENUM ('leve', 'moderado', 'grave');

-- CreateEnum
CREATE TYPE "EstadoSignoAlarma" AS ENUM ('pendiente', 'atendido', 'derivado');

-- CreateEnum
CREATE TYPE "EstadoPatologia" AS ENUM ('activa', 'resuelta', 'seguimiento');

-- CreateEnum
CREATE TYPE "TipoContenido" AS ENUM ('articulo', 'infografia', 'video', 'audio', 'faq');

-- CreateEnum
CREATE TYPE "CategoriaContenido" AS ENUM ('nutricion', 'suplementos', 'signos_alarma', 'parto', 'lactancia', 'cuidado_bebe', 'salud_mental', 'general');

-- CreateEnum
CREATE TYPE "CanalNotificacion" AS ENUM ('push', 'sms', 'whatsapp');

-- CreateEnum
CREATE TYPE "EstadoNotificacion" AS ENUM ('pendiente', 'enviada', 'entregada', 'leida', 'fallida');

-- CreateEnum
CREATE TYPE "TipoMensaje" AS ENUM ('texto', 'imagen', 'alerta_emergencia');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "dni" VARCHAR(8) NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "phone" VARCHAR(15),
    "email" VARCHAR(255),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMPTZ,
    "last_login_at" TIMESTAMPTZ,
    "last_seen_at" TIMESTAMPTZ,
    "biometric_enabled" BOOLEAN NOT NULL DEFAULT false,
    "notification_preferences" JSONB NOT NULL DEFAULT '{"push": true, "sms": true, "whatsapp": true}',
    "consent_accepted" BOOLEAN NOT NULL DEFAULT false,
    "consent_date" TIMESTAMPTZ,
    "reset_token_hash" TEXT,
    "reset_token_expires" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "refresh_token" TEXT NOT NULL,
    "device_info" JSONB,
    "ip_address" TEXT,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gestantes" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "historia_clinica" VARCHAR(20),
    "fecha_nacimiento" DATE NOT NULL,
    "age_at_registration" INTEGER,
    "direccion" TEXT,
    "localidad" VARCHAR(100),
    "domicilio_lat" DECIMAL(10,7),
    "domicilio_lng" DECIMAL(10,7),
    "referencia_domicilio" TEXT,
    "departamento" VARCHAR(50) DEFAULT 'Apurimac',
    "provincia" VARCHAR(50) DEFAULT 'Andahuaylas',
    "distrito" VARCHAR(50) DEFAULT 'Talavera',
    "establecimiento" VARCHAR(100) DEFAULT 'C.S. Talavera',
    "codigo_sis" VARCHAR(20),
    "ocupacion" VARCHAR(100),
    "nivel_estudios" "NivelEstudios",
    "estado_civil" "EstadoCivil",
    "padre_rn_nombre" VARCHAR(200),
    "padre_rn_dni" VARCHAR(8),
    "acompanante_phone" VARCHAR(15),
    "gestaciones" INTEGER NOT NULL DEFAULT 0,
    "partos_vaginales" INTEGER NOT NULL DEFAULT 0,
    "cesareas" INTEGER NOT NULL DEFAULT 0,
    "abortos" INTEGER NOT NULL DEFAULT 0,
    "nacidos_vivos" INTEGER NOT NULL DEFAULT 0,
    "nacidos_muertos" INTEGER NOT NULL DEFAULT 0,
    "hijos_vivos" INTEGER NOT NULL DEFAULT 0,
    "rn_mayor_peso" DECIMAL(5,2),
    "gestacion_anterior" "GestacionAnterior",
    "peso_habitual" DECIMAL(5,2),
    "peso_actual" DECIMAL(5,2),
    "talla" DECIMAL(5,2),
    "imc" DECIMAL(5,2),
    "clasificacion_imc" VARCHAR(20),
    "grupo_sanguineo" VARCHAR(3),
    "factor_rh" VARCHAR(10),
    "rh_sensitizado" BOOLEAN,
    "fum" DATE,
    "fum_dudosa" BOOLEAN NOT NULL DEFAULT false,
    "fpp_fum" DATE,
    "fpp_eco" DATE,
    "estado_general" VARCHAR(50),
    "estado_hidratacion" VARCHAR(50),
    "estado_nutricion" VARCHAR(50),
    "examen_mamas" "ExamenMamas",
    "cuello_uterino" TEXT,
    "pelvis" TEXT,
    "odontologia" TEXT,
    "nivel_riesgo" "NivelRiesgo" NOT NULL DEFAULT 'verde',
    "estado" "EstadoGestante" NOT NULL DEFAULT 'activa',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "gestantes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "antecedentes" (
    "id" UUID NOT NULL,
    "gestante_id" UUID NOT NULL,
    "tipo" "TipoAntecedente" NOT NULL,
    "condicion" VARCHAR(100) NOT NULL,
    "detalle" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "antecedentes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "obstetras" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "cop" VARCHAR(20) NOT NULL,
    "especialidad" VARCHAR(100),
    "establecimiento" VARCHAR(100) DEFAULT 'C.S. Talavera',
    "turno" VARCHAR(20),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "obstetras_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" UUID NOT NULL,
    "gestante_id" UUID NOT NULL,
    "obstetra_id" UUID,
    "motivo" VARCHAR(200) NOT NULL DEFAULT 'Control prenatal',
    "fecha" DATE NOT NULL,
    "hora" TIME NOT NULL,
    "estado" "EstadoCita" NOT NULL DEFAULT 'programada',
    "estado_previo" "EstadoCita",
    "modalidad" "ModalidadCita" NOT NULL DEFAULT 'establecimiento',
    "numero_control" INTEGER,
    "eg_semanas" INTEGER,
    "motivo_reprogramacion" TEXT,
    "fecha_reprogramada" DATE,
    "hora_reprogramada" TIME,
    "observaciones" TEXT,
    "es_auto_generada" BOOLEAN NOT NULL DEFAULT false,
    "recordatorio_3d" BOOLEAN NOT NULL DEFAULT false,
    "recordatorio_1d" BOOLEAN NOT NULL DEFAULT false,
    "recordatorio_2h" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "home_visits" (
    "id" UUID NOT NULL,
    "gestante_id" UUID NOT NULL,
    "obstetra_id" UUID NOT NULL,
    "appointment_id" UUID,
    "numero_visita" INTEGER NOT NULL,
    "fecha" DATE NOT NULL,
    "hora_llegada" TIME,
    "duracion_min" INTEGER,
    "motivo" VARCHAR(300) NOT NULL,
    "acciones" TEXT NOT NULL,
    "acuerdos" TEXT,
    "lat" DECIMAL(10,7),
    "lng" DECIMAL(10,7),
    "firma_gestante" BOOLEAN NOT NULL DEFAULT false,
    "firma_obstetra" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "home_visits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "treatments" (
    "id" UUID NOT NULL,
    "gestante_id" UUID NOT NULL,
    "obstetra_id" UUID,
    "nombre" VARCHAR(200) NOT NULL,
    "tipo" "TipoTratamiento",
    "dosis" VARCHAR(100) NOT NULL,
    "frecuencia" VARCHAR(50) NOT NULL,
    "via_administracion" VARCHAR(30) NOT NULL DEFAULT 'oral',
    "hora_toma" TIME,
    "indicaciones" TEXT,
    "fecha_inicio" DATE NOT NULL,
    "fecha_fin" DATE,
    "duracion_dias" INTEGER,
    "estado" "EstadoTratamiento" NOT NULL DEFAULT 'activo',
    "motivo_suspension" TEXT,
    "adherencia_pct" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "treatments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplement_logs" (
    "id" UUID NOT NULL,
    "treatment_id" UUID NOT NULL,
    "gestante_id" UUID NOT NULL,
    "fecha" DATE NOT NULL,
    "hora_registro" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tomado" BOOLEAN NOT NULL DEFAULT true,
    "notas" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supplement_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prenatal_controls" (
    "id" UUID NOT NULL,
    "gestante_id" UUID NOT NULL,
    "obstetra_id" UUID NOT NULL,
    "appointment_id" UUID,
    "numero_control" INTEGER NOT NULL,
    "fecha" TIMESTAMPTZ NOT NULL,
    "eg_semanas" INTEGER NOT NULL,
    "trimestre" INTEGER,
    "peso" DECIMAL(5,2),
    "temperatura" DECIMAL(4,1),
    "presion_sistolica" INTEGER,
    "presion_diastolica" INTEGER,
    "pulso_materno" INTEGER,
    "altura_uterina" DECIMAL(4,1),
    "situacion" VARCHAR(5),
    "presentacion" VARCHAR(5),
    "posicion" VARCHAR(5),
    "fcf" INTEGER,
    "movimiento_fetal" VARCHAR(10),
    "proteinuria" VARCHAR(10),
    "edema" VARCHAR(10),
    "reflejo_osteotendinoso" INTEGER,
    "examen_pezon" VARCHAR(20),
    "indicacion_hierro" TEXT,
    "indicacion_calcio" TEXT,
    "indicacion_acido_folico" TEXT,
    "orientacion" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "ecografia_control" TEXT,
    "perfil_biofisico" VARCHAR(20),
    "visita_domiciliaria" BOOLEAN,
    "plan_parto" VARCHAR(20),
    "proxima_cita" DATE,
    "establecimiento" VARCHAR(100),
    "responsable" VARCHAR(200),
    "nro_formato_sis" VARCHAR(30),
    "observaciones" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "prenatal_controls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lab_results" (
    "id" UUID NOT NULL,
    "gestante_id" UUID NOT NULL,
    "obstetra_id" UUID,
    "tipo_examen" VARCHAR(50) NOT NULL,
    "numero_toma" INTEGER NOT NULL DEFAULT 1,
    "valor" VARCHAR(50),
    "valor_numerico" DECIMAL(10,2),
    "valor_corregido" DECIMAL(10,2),
    "unidad" VARCHAR(20),
    "resultado" VARCHAR(30),
    "fecha_examen" DATE NOT NULL,
    "eg_semanas" INTEGER,
    "observaciones" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "lab_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ultrasounds" (
    "id" UUID NOT NULL,
    "gestante_id" UUID NOT NULL,
    "tipo" "TipoEcografia" NOT NULL,
    "numero" INTEGER,
    "eg_semanas" INTEGER,
    "eg_por_eco" INTEGER,
    "fecha" DATE NOT NULL,
    "resultado" TEXT,
    "hallazgos" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ultrasounds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weight_records" (
    "id" UUID NOT NULL,
    "gestante_id" UUID NOT NULL,
    "fecha" DATE NOT NULL,
    "eg_semanas" INTEGER NOT NULL,
    "peso" DECIMAL(5,2) NOT NULL,
    "ganancia_total" DECIMAL(5,2),
    "clasificacion" "ClasificacionPeso",
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "weight_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vaccination_records" (
    "id" UUID NOT NULL,
    "gestante_id" UUID NOT NULL,
    "vacuna" VARCHAR(50) NOT NULL,
    "dosis_numero" INTEGER NOT NULL DEFAULT 1,
    "eg_semanas_aplicacion" INTEGER,
    "fecha_aplicacion" DATE,
    "estado" "EstadoVacuna" NOT NULL DEFAULT 'pendiente',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "vaccination_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "danger_signs" (
    "id" UUID NOT NULL,
    "gestante_id" UUID NOT NULL,
    "tipo_signo" VARCHAR(100) NOT NULL,
    "descripcion" TEXT,
    "severidad" "SeveridadSigno",
    "accion_tomada" TEXT,
    "respondido_por" UUID,
    "tiempo_respuesta_min" INTEGER,
    "estado" "EstadoSignoAlarma" NOT NULL DEFAULT 'pendiente',
    "fecha_reporte" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "danger_signs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "violence_screenings" (
    "id" UUID NOT NULL,
    "gestante_id" UUID NOT NULL,
    "obstetra_id" UUID NOT NULL,
    "respuestas" JSONB NOT NULL,
    "puntaje_total" INTEGER NOT NULL,
    "tamizaje_positivo" BOOLEAN NOT NULL,
    "derivacion" BOOLEAN NOT NULL DEFAULT false,
    "observaciones" TEXT,
    "fecha" DATE NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "violence_screenings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mental_health_screenings" (
    "id" UUID NOT NULL,
    "gestante_id" UUID NOT NULL,
    "obstetra_id" UUID NOT NULL,
    "respuestas" JSONB NOT NULL,
    "puntaje_p1_18" INTEGER,
    "puntaje_p19_22" INTEGER,
    "pregunta_23" BOOLEAN,
    "puntaje_p24_28" INTEGER,
    "resultado" VARCHAR(30),
    "derivacion" BOOLEAN NOT NULL DEFAULT false,
    "observaciones" TEXT,
    "fecha" DATE NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mental_health_screenings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pathologies" (
    "id" UUID NOT NULL,
    "gestante_id" UUID NOT NULL,
    "codigo_cie10" VARCHAR(10) NOT NULL,
    "descripcion" VARCHAR(200),
    "fecha_diagnostico" DATE NOT NULL,
    "estado" "EstadoPatologia" NOT NULL DEFAULT 'activa',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pathologies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nutritional_counseling" (
    "id" UUID NOT NULL,
    "gestante_id" UUID NOT NULL,
    "obstetra_id" UUID NOT NULL,
    "historial_alimentario" TEXT,
    "frecuencia_alimentacion" INTEGER,
    "consumo_animales" BOOLEAN,
    "consumo_menestras" BOOLEAN,
    "consumo_frutas" BOOLEAN,
    "sal_yodada" BOOLEAN,
    "acuerdos" TEXT,
    "sesion_demostrativa" BOOLEAN NOT NULL DEFAULT false,
    "fecha_sesion_demo" DATE,
    "responsable_demo" VARCHAR(200),
    "fecha" DATE NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nutritional_counseling_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dental_records" (
    "id" UUID NOT NULL,
    "gestante_id" UUID NOT NULL,
    "estado_bucal" VARCHAR(50),
    "caries" TEXT,
    "tratamientos" TEXT,
    "codigo_cie10" VARCHAR(10),
    "fecha" DATE NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dental_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "educational_content" (
    "id" UUID NOT NULL,
    "titulo" VARCHAR(200) NOT NULL,
    "contenido" TEXT NOT NULL,
    "tipo" "TipoContenido",
    "categoria" "CategoriaContenido",
    "trimestre" INTEGER,
    "semana_inicio" INTEGER,
    "semana_fin" INTEGER,
    "idioma" VARCHAR(10) NOT NULL DEFAULT 'es',
    "media_url" TEXT,
    "thumbnail_url" TEXT,
    "duracion_min" INTEGER,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "views_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "educational_content_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "tipo" VARCHAR(50) NOT NULL,
    "canal" "CanalNotificacion" NOT NULL,
    "titulo" VARCHAR(200),
    "mensaje" TEXT NOT NULL,
    "datos" JSONB,
    "estado" "EstadoNotificacion" NOT NULL DEFAULT 'pendiente',
    "programada_para" TIMESTAMPTZ,
    "enviada_at" TIMESTAMPTZ,
    "leida_at" TIMESTAMPTZ,
    "error_detalle" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" UUID NOT NULL,
    "gestante_id" UUID NOT NULL,
    "obstetra_id" UUID NOT NULL,
    "ultimo_mensaje" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "sender_id" UUID NOT NULL,
    "contenido" TEXT NOT NULL,
    "tipo" "TipoMensaje" NOT NULL DEFAULT 'texto',
    "media_url" TEXT,
    "leido" BOOLEAN NOT NULL DEFAULT false,
    "leido_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "accion" VARCHAR(50) NOT NULL,
    "entidad" VARCHAR(50) NOT NULL,
    "entidad_id" UUID,
    "datos_anteriores" JSONB,
    "datos_nuevos" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "health_facilities" (
    "id" UUID NOT NULL,
    "nombre" VARCHAR(200) NOT NULL,
    "codigo" VARCHAR(20),
    "direccion" TEXT,
    "telefono" VARCHAR(15),
    "horarios" JSONB,
    "servicios" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "altitud_msnm" INTEGER NOT NULL DEFAULT 2926,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "health_facilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_config" (
    "id" UUID NOT NULL,
    "clave" VARCHAR(100) NOT NULL,
    "valor" JSONB NOT NULL,
    "descripcion" TEXT,
    "updated_by" UUID,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "system_config_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_dni_key" ON "users"("dni");

-- CreateIndex
CREATE INDEX "idx_users_dni" ON "users"("dni");

-- CreateIndex
CREATE INDEX "idx_users_role" ON "users"("role");

-- CreateIndex
CREATE INDEX "idx_sessions_user" ON "user_sessions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "gestantes_user_id_key" ON "gestantes"("user_id");

-- CreateIndex
CREATE INDEX "idx_gestantes_user" ON "gestantes"("user_id");

-- CreateIndex
CREATE INDEX "idx_antecedentes_gestante" ON "antecedentes"("gestante_id");

-- CreateIndex
CREATE UNIQUE INDEX "obstetras_user_id_key" ON "obstetras"("user_id");

-- CreateIndex
CREATE INDEX "idx_obstetras_user" ON "obstetras"("user_id");

-- CreateIndex
CREATE INDEX "idx_appointments_gestante" ON "appointments"("gestante_id", "fecha");

-- CreateIndex
CREATE INDEX "idx_appointments_obstetra" ON "appointments"("obstetra_id", "fecha");

-- CreateIndex
CREATE INDEX "idx_appointments_estado" ON "appointments"("estado");

-- CreateIndex
CREATE INDEX "idx_home_visits_gestante" ON "home_visits"("gestante_id", "fecha");

-- CreateIndex
CREATE INDEX "idx_home_visits_obstetra" ON "home_visits"("obstetra_id");

-- CreateIndex
CREATE INDEX "idx_treatments_gestante" ON "treatments"("gestante_id");

-- CreateIndex
CREATE INDEX "idx_supplement_logs_treatment" ON "supplement_logs"("treatment_id", "fecha");

-- CreateIndex
CREATE UNIQUE INDEX "uq_supplement_treatment_fecha" ON "supplement_logs"("treatment_id", "fecha");

-- CreateIndex
CREATE INDEX "idx_prenatal_controls_gestante" ON "prenatal_controls"("gestante_id");

-- CreateIndex
CREATE INDEX "idx_lab_results_gestante" ON "lab_results"("gestante_id");

-- CreateIndex
CREATE INDEX "idx_ultrasounds_gestante" ON "ultrasounds"("gestante_id");

-- CreateIndex
CREATE INDEX "idx_weight_records_gestante" ON "weight_records"("gestante_id");

-- CreateIndex
CREATE INDEX "idx_vaccination_records_gestante" ON "vaccination_records"("gestante_id");

-- CreateIndex
CREATE INDEX "idx_danger_signs_gestante" ON "danger_signs"("gestante_id");

-- CreateIndex
CREATE INDEX "idx_violence_screenings_gestante" ON "violence_screenings"("gestante_id");

-- CreateIndex
CREATE INDEX "idx_mental_health_screenings_gestante" ON "mental_health_screenings"("gestante_id");

-- CreateIndex
CREATE INDEX "idx_pathologies_gestante" ON "pathologies"("gestante_id");

-- CreateIndex
CREATE INDEX "idx_nutritional_counseling_gestante" ON "nutritional_counseling"("gestante_id");

-- CreateIndex
CREATE INDEX "idx_dental_records_gestante" ON "dental_records"("gestante_id");

-- CreateIndex
CREATE INDEX "idx_educational_content_category" ON "educational_content"("categoria", "activo");

-- CreateIndex
CREATE INDEX "idx_notifications_user" ON "notifications"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_conversations_gestante" ON "conversations"("gestante_id");

-- CreateIndex
CREATE INDEX "idx_conversations_obstetra" ON "conversations"("obstetra_id");

-- CreateIndex
CREATE INDEX "idx_messages_conversation" ON "messages"("conversation_id", "created_at");

-- CreateIndex
CREATE INDEX "idx_audit_user" ON "audit_logs"("user_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "system_config_clave_key" ON "system_config"("clave");

-- AddForeignKey
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gestantes" ADD CONSTRAINT "gestantes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "antecedentes" ADD CONSTRAINT "antecedentes_gestante_id_fkey" FOREIGN KEY ("gestante_id") REFERENCES "gestantes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "obstetras" ADD CONSTRAINT "obstetras_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_gestante_id_fkey" FOREIGN KEY ("gestante_id") REFERENCES "gestantes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_obstetra_id_fkey" FOREIGN KEY ("obstetra_id") REFERENCES "obstetras"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "home_visits" ADD CONSTRAINT "home_visits_gestante_id_fkey" FOREIGN KEY ("gestante_id") REFERENCES "gestantes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "home_visits" ADD CONSTRAINT "home_visits_obstetra_id_fkey" FOREIGN KEY ("obstetra_id") REFERENCES "obstetras"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "home_visits" ADD CONSTRAINT "home_visits_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatments" ADD CONSTRAINT "treatments_gestante_id_fkey" FOREIGN KEY ("gestante_id") REFERENCES "gestantes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatments" ADD CONSTRAINT "treatments_obstetra_id_fkey" FOREIGN KEY ("obstetra_id") REFERENCES "obstetras"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplement_logs" ADD CONSTRAINT "supplement_logs_treatment_id_fkey" FOREIGN KEY ("treatment_id") REFERENCES "treatments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplement_logs" ADD CONSTRAINT "supplement_logs_gestante_id_fkey" FOREIGN KEY ("gestante_id") REFERENCES "gestantes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prenatal_controls" ADD CONSTRAINT "prenatal_controls_gestante_id_fkey" FOREIGN KEY ("gestante_id") REFERENCES "gestantes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prenatal_controls" ADD CONSTRAINT "prenatal_controls_obstetra_id_fkey" FOREIGN KEY ("obstetra_id") REFERENCES "obstetras"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prenatal_controls" ADD CONSTRAINT "prenatal_controls_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_results" ADD CONSTRAINT "lab_results_gestante_id_fkey" FOREIGN KEY ("gestante_id") REFERENCES "gestantes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_results" ADD CONSTRAINT "lab_results_obstetra_id_fkey" FOREIGN KEY ("obstetra_id") REFERENCES "obstetras"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ultrasounds" ADD CONSTRAINT "ultrasounds_gestante_id_fkey" FOREIGN KEY ("gestante_id") REFERENCES "gestantes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weight_records" ADD CONSTRAINT "weight_records_gestante_id_fkey" FOREIGN KEY ("gestante_id") REFERENCES "gestantes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vaccination_records" ADD CONSTRAINT "vaccination_records_gestante_id_fkey" FOREIGN KEY ("gestante_id") REFERENCES "gestantes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "danger_signs" ADD CONSTRAINT "danger_signs_gestante_id_fkey" FOREIGN KEY ("gestante_id") REFERENCES "gestantes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "danger_signs" ADD CONSTRAINT "danger_signs_respondido_por_fkey" FOREIGN KEY ("respondido_por") REFERENCES "obstetras"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "violence_screenings" ADD CONSTRAINT "violence_screenings_gestante_id_fkey" FOREIGN KEY ("gestante_id") REFERENCES "gestantes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "violence_screenings" ADD CONSTRAINT "violence_screenings_obstetra_id_fkey" FOREIGN KEY ("obstetra_id") REFERENCES "obstetras"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mental_health_screenings" ADD CONSTRAINT "mental_health_screenings_gestante_id_fkey" FOREIGN KEY ("gestante_id") REFERENCES "gestantes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mental_health_screenings" ADD CONSTRAINT "mental_health_screenings_obstetra_id_fkey" FOREIGN KEY ("obstetra_id") REFERENCES "obstetras"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pathologies" ADD CONSTRAINT "pathologies_gestante_id_fkey" FOREIGN KEY ("gestante_id") REFERENCES "gestantes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nutritional_counseling" ADD CONSTRAINT "nutritional_counseling_gestante_id_fkey" FOREIGN KEY ("gestante_id") REFERENCES "gestantes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nutritional_counseling" ADD CONSTRAINT "nutritional_counseling_obstetra_id_fkey" FOREIGN KEY ("obstetra_id") REFERENCES "obstetras"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dental_records" ADD CONSTRAINT "dental_records_gestante_id_fkey" FOREIGN KEY ("gestante_id") REFERENCES "gestantes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_gestante_id_fkey" FOREIGN KEY ("gestante_id") REFERENCES "gestantes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_obstetra_id_fkey" FOREIGN KEY ("obstetra_id") REFERENCES "obstetras"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_config" ADD CONSTRAINT "system_config_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
