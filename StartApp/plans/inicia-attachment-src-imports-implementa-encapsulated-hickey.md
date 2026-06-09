# Plan: VITMATERNA — Aplicativo Web de Salud Prenatal

## Context

El usuario ha proporcionado un plan de requerimientos completo para **VITMATERNA**, un aplicativo de seguimiento prenatal para el Centro de Salud Talavera (Andahuaylas, Apurímac, Perú). El objetivo es construir un prototipo web funcional y visualmente completo de este sistema usando React + Tailwind + shadcn/ui.

El proyecto está en blanco (`App.tsx` vacío). Tiene shadcn/ui, react-router, recharts, lucide-react, motion, y react-hook-form ya instalados. No hay paquetes `@make-kits`.

---

## Enfoque de Implementación

Construir una SPA multi-rol con mock data que demuestre todas las funcionalidades clave definidas en los requerimientos. El sistema tiene 3 roles: **Gestante** (panel morado), **Obstetra** (panel rosa/magenta), **Administrador**.

---

## Arquitectura

### Routing (react-router)
```
/                   → Login (selección de rol)
/gestante           → Panel Gestante (dashboard)
/gestante/citas     → Mis Citas
/gestante/tratamiento → Mi Tratamiento Prenatal
/gestante/educacion → Educación en Salud
/gestante/reportes  → Reporte de Adherencia
/gestante/alarmas   → Reportar Signo de Alarma
/obstetra           → Panel Obstetra (dashboard)
/obstetra/gestantes → Lista de Gestantes
/obstetra/citas     → Cronograma de Citas
/obstetra/nueva-gestante → Registrar Gestante
/obstetra/gestante/:id → Perfil Completo de Gestante
/obstetra/reportes  → Reportes y Estadísticas
/admin              → Panel Administrador
```

### Estado Global
- Context API con `AuthContext` (usuario, rol, logout)
- Mock data centralizado en `src/app/data/mockData.ts`

---

## Archivos a Crear

### Estructura
```
src/app/
├── App.tsx                          # Router + AuthProvider (MODIFICAR)
├── data/
│   └── mockData.ts                  # Datos simulados completos
├── context/
│   └── AuthContext.tsx              # Contexto de autenticación + rol
├── components/
│   ├── figma/ImageWithFallback.tsx  # Ya existe
│   ├── ui/                          # shadcn/ui (ya existen)
│   ├── layout/
│   │   ├── SidebarGestante.tsx
│   │   ├── SidebarObstetra.tsx
│   │   └── TopBar.tsx
│   ├── shared/
│   │   ├── SemaforoRiesgo.tsx       # Badge verde/amarillo/rojo
│   │   ├── AdherenciaBar.tsx        # Barra de progreso adherencia
│   │   └── GravidezBadge.tsx
│   └── charts/
│       ├── PesoChart.tsx            # Curva de peso por semanas
│       └── AlturaUterina.tsx        # Gráfica altura uterina
├── pages/
│   ├── LoginPage.tsx                # Login + selección rol
│   ├── gestante/
│   │   ├── DashboardGestante.tsx    # Panel principal gestante
│   │   ├── CitasGestante.tsx        # Ver citas programadas
│   │   ├── TratamientoGestante.tsx  # Ver suplementos + registrar consumo
│   │   ├── EducacionGestante.tsx    # Contenido educativo por trimestre
│   │   ├── ReporteAdherencia.tsx    # Reporte visual adherencia
│   │   └── SignosAlarma.tsx         # Reportar signo de peligro
│   ├── obstetra/
│   │   ├── DashboardObstetra.tsx    # Panel + KPIs + alertas
│   │   ├── ListaGestantes.tsx       # Tabla búsqueda + semáforo riesgo
│   │   ├── PerfilGestante.tsx       # Historia clínica completa
│   │   ├── NuevaGestante.tsx        # Formulario registro gestante
│   │   ├── CitasObstetra.tsx        # Cronograma de citas + gestión
│   │   └── ReportesObstetra.tsx     # Reportes + gráficas estadísticas
│   └── admin/
│       └── DashboardAdmin.tsx       # Gestión usuarios + config
```

---

## Pantallas Detalladas

### 1. Login Page
- Logo + nombre VITMATERNA
- Cards de selección de rol (Gestante / Obstetra / Admin) con íconos
- Formulario DNI + contraseña
- Colores: morado para gestante, rosa para obstetra

### 2. Dashboard Gestante
- Saludo personalizado + semanas de embarazo
- Semáforo de riesgo (verde/amarillo/rojo)
- Card: Próxima cita prenatal (fecha, hora, motivo)
- Card: Suplementos de hoy (tomar hierro, calcio, ácido fólico) con botón "Registrar consumo"
- Card: Semana de embarazo con descripción del desarrollo fetal
- Card: Adherencia actual (barra de progreso)
- Botón de emergencia prominente
- Acceso a educación: tips del trimestre actual

### 3. Mis Citas (Gestante)
- Lista de citas: fecha, hora, motivo, estado (badge colorido)
- Botón "Confirmar asistencia" / "Solicitar reprogramar"
- Historial de citas pasadas

### 4. Mi Tratamiento Prenatal (Gestante)
- Cards por suplemento: Sulfato Ferroso, Carbonato de Calcio, Ácido Fólico
- % de adherencia con barra de progreso (verde/amarillo/rojo)
- Botón "Registrar consumo de hoy"
- Historial semanal (qué días tomó/omitió)

### 5. Educación en Salud (Gestante)
- Tabs por trimestre (1ro / 2do / 3ro)
- Cards educativas con íconos
- Sección "Señales de Peligro" con iconografía visual clara
- Calculadora de EG (ingresar FUM → mostrar semanas, FPP, trimestre)

### 6. Reporte de Adherencia (Gestante)
- Calendario visual de tomas (días marcados verde/rojo)
- % total + racha de días consecutivos
- Gráfica de adherencia por semana

### 7. Signos de Alarma (Gestante)
- Lista de síntomas con checkbox
- Botón "Enviar alerta al obstetra"
- Confirmación visual de envío

### 8. Dashboard Obstetra
- KPIs: total gestantes activas, citas del día, gestantes en riesgo, adherencia promedio
- Lista de alertas pendientes
- Citas del día con estado
- Gráfica: distribución de gestantes por trimestre

### 9. Lista de Gestantes (Obstetra)
- Tabla con: nombre, DNI, EG (semanas), FPP, semáforo riesgo, % adherencia, última cita
- Búsqueda por DNI o nombre
- Filtros por riesgo, trimestre

### 10. Perfil Completo de Gestante (Obstetra)
- Tabs: Datos Personales | Controles Prenatales | Tratamientos | Laboratorio | Educación
- Datos personales + antecedentes obstétricos
- Gráfica de peso por semanas (recharts) con percentiles P25/P90
- Gráfica de altura uterina
- Historial de controles en tabla
- Formulario para registrar nuevo control prenatal

### 11. Nueva Gestante (Obstetra)
- Formulario multi-paso:
  - Paso 1: Datos personales
  - Paso 2: Antecedentes obstétricos
  - Paso 3: Peso, talla, IMC + tipo de sangre
  - Paso 4: FUM + cálculo automático FPP

### 12. Citas Obstetra
- Vista calendario/lista de todas las citas
- Botones "Asistió" / "No asistió"
- Formulario para programar nueva cita

### 13. Reportes Obstetra
- Gráficas: adherencia promedio por mes, asistencia a controles, distribución por riesgo
- Tabla de gestantes con menor adherencia
- KPIs MINSA: % con ≥6 controles, % inicio 1er trimestre

### 14. Admin Dashboard
- Tabla de usuarios (gestantes y obstetras)
- Toggle activar/desactivar usuarios
- Métricas globales del sistema

---

## Paleta de Colores (basada en prototipo actual)

- **Gestante:** Morado/Púrpura → `#7C3AED` (primary), fondo `#F5F3FF`
- **Obstetra:** Rosa/Magenta → `#DB2777` (primary), fondo `#FFF1F6`
- **Admin:** Azul → `#2563EB`, fondo `#EFF6FF`
- **Semáforo:** Verde `#16A34A`, Amarillo `#CA8A04`, Rojo `#DC2626`
- **Neutros:** Grises de shadcn/ui

---

## Mock Data (mockData.ts)

- 5 gestantes con datos completos (nombre, DNI, EG, FPP, riesgo, suplementos, citas)
- 3 controles prenatales por gestante (peso, PA, FCF, AU, etc.)
- Histórico de adherencia (últimos 30 días) por suplemento
- Lista de citas programadas + pasadas
- Exámenes de laboratorio simulados
- Contenido educativo por trimestre

---

## Componentes Reutilizables Clave

| Componente | Propósito |
|------------|-----------|
| `SemaforoRiesgo` | Badge verde/amarillo/rojo según clasificación |
| `AdherenciaBar` | Progress bar con color dinámico (>80% verde, 50-80% amarillo, <50% rojo) |
| `PesoChart` | recharts LineChart con línea de peso real + bandas P25/P90 |
| `AlturaUterinaChart` | recharts LineChart altura uterina vs semanas |

---

## Verificación

1. **Login funcional:** Seleccionar rol → navegar al dashboard correcto
2. **Gestante:** Registrar consumo de suplemento → adherencia sube en tiempo real
3. **Gestante:** Reportar signo de alarma → toast de confirmación
4. **Obstetra:** Ver lista de gestantes con semáforo de riesgo
5. **Obstetra:** Abrir perfil de gestante → ver gráficas de peso y altura uterina con recharts
6. **Obstetra:** Programar cita → aparece en cronograma
7. **Admin:** Ver tabla de usuarios
8. Navegación fluida entre secciones con sidebar
9. Diseño responsive y colores diferenciados por rol
