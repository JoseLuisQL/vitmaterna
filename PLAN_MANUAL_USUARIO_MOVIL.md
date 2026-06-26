# Plan — Manual de Usuario Móvil VITMATERNA (PDF + DOCX con capturas)

> Manual de usuario **profesional, claro y preciso** de la app móvil VITMATERNA,
> con capturas de pantalla reales ordenadas, anotadas y numeradas por pasos,
> entregable en **PDF y DOCX**. Pensado para entregar a clientes (centros de
> salud / MINSA) como documentación oficial del producto.

---

## 1. Fundamento: investigación de buenas prácticas

Basado en TechSmith ("How to Build the Best User Manual"), MadCap, Ritza Style
Guide y guías en español (Grupo Carricay, Sonat). Reglas que el manual va a
respetar:

### Estructura canónica de un manual de usuario
1. **Portada** (título, producto, versión, logo, fecha, autor/empresa).
2. **Página de créditos / derechos de autor** y aviso de confidencialidad.
3. **Índice de contenidos** (navegable; el manual es de consulta, no se lee de corrido).
4. **Introducción** (qué es el producto, a quién va dirigido, alcance del manual).
5. **Requisitos previos** (dispositivo, instalación, conexión, credenciales).
6. **Convenciones del documento** (qué significan los íconos, marcas de paso ①②③, notas, advertencias).
7. **Primeros pasos / Inicio rápido** (login, recorrido guiado).
8. **Secciones por proceso** (organizadas por TAREA del usuario, no por feature suelto — regla clave de TechSmith/Writing SE).
9. **Solución de problemas (Troubleshooting)**.
10. **Preguntas frecuentes (FAQ)**.
11. **Glosario** de términos.
12. **Datos de contacto / soporte**.

### Principios obligatorios (no negociables)
- **Lenguaje sencillo**: escribir para la usuaria final (gestante, obstetra), sin jerga técnica. Tratar al lector como principiante.
- **"Show, don't tell"**: cada tarea con captura anotada. (Estudio TechSmith: 67% completa mejor las tareas con capturas anotadas vs. solo texto).
- **Pasos secuenciales numerados**: una acción por paso, en orden de ejecución.
- **Texto ANTES de la captura**: contexto primero, luego la imagen que lo ilustra (regla Writing SE).
- **Jerarquía lógica**: de lo básico a lo avanzado; títulos y subtítulos consistentes.
- **Capturas anotadas con marcas de paso**: círculos/recuadros rojos numerados ①②③ sobre el elemento exacto; color de realce consistente (rojo por defecto, azul si hay mucho rojo en pantalla).
- **Consistencia visual**: misma tipografía, colores de marca (teal gestante, azul obstetra, slate admin), tamaños y estilos de figura en todo el documento.
- **Accesibilidad**: contraste AA, texto alternativo en figuras, numeración de figuras.
- **Resolución del problema**: explicar cada función en el contexto de la tarea que resuelve.

---

## 2. Alcance y estructura del manual VITMATERNA

El sistema tiene **3 roles**. Para que el manual sea completo pero usable, se
estructura en **un manual con 3 partes** (una por rol), cada una organizada por
las tareas reales que ya mapeamos para los tours:

```
PORTADA
Créditos y confidencialidad
Índice
1. Introducción
   1.1 ¿Qué es VITMATERNA?
   1.2 ¿A quién está dirigido este manual?
   1.3 Alcance
2. Antes de empezar
   2.1 Requisitos (dispositivo Android/iOS, conexión)
   2.2 Instalación de la app
   2.3 Convenciones de este manual (íconos, marcas de paso, notas/avisos)
3. Acceso al sistema
   3.1 Iniciar sesión
   3.2 Recuperar contraseña
   3.3 Registro de cuenta (si aplica)
   3.4 El recorrido guiado "Conoce tu app"

PARTE A — MANUAL DE LA GESTANTE
   A1. Pantalla de inicio (semanas, próxima cita, tratamiento, ayuda rápida)
   A2. Mis citas (ver, confirmar, reprogramar)
   A3. Mi tratamiento (marcar suplementos, ver adherencia)
   A4. Chat con mi obstetra (escribir, enviar foto)
   A5. Educación (buscar, leer, guardar, recomendados)
   A6. Signos de alarma y emergencia
   A7. Mi perfil (datos, FUM, notificaciones, repetir recorrido)

PARTE B — MANUAL DE LA OBSTETRA
   B1. Panel de inicio (KPIs, riesgo, citas de hoy)
   B2. Gestantes (buscar, filtrar, registrar nueva)
   B3. Ficha clínica (4 pestañas + acciones: llamar/WhatsApp/recomendar)
   B4. Atender una cita (flujo de 4 pasos)
   B5. Agenda (atender, reprogramar, nueva cita)
   B6. Reportes (KPIs, MINSA, exportar Excel/PDF)
   B7. Chat y mensaje masivo
   B8. Notificaciones

PARTE C — MANUAL DEL ADMINISTRADOR
   C1. Panel de control (pendientes, KPIs, estado, accesos)
   C2. Usuarios (crear, aprobar, editar, activar/desactivar)
   C3. Contenido educativo (crear, editar, estadísticas)
   C4. Canales de notificación (SMS / WhatsApp)
   C5. Configuración (parámetros, mantenimiento)
   C6. Sedes / establecimientos
   C7. Auditoría y backup
   C8. Supervisión (reportes y vistas globales)

4. Solución de problemas (Troubleshooting)
5. Preguntas frecuentes (FAQ)
6. Glosario
7. Soporte y contacto
CONTRAPORTADA
```

> Cada sub-sección (A1, B3, etc.) sigue el mismo patrón: **objetivo de la tarea
> → pasos numerados → captura anotada con marcas ①②③ → nota/aviso si aplica.**

---

## 3. Producción de las capturas de pantalla (móvil)

### 3.1 Captura en viewport móvil real
- Servir la app web (ya corriendo en `localhost:8081`) y conducirla con
  **agent-browser** en **viewport móvil 390×844** (iPhone 13 / tamaño estándar),
  con `device-scale-factor` 2 para nitidez (retina).
- Login por rol mediante inyección de token (método ya validado en QA), usando
  los datos del **seeder completo** (pantallas llenas y realistas).
- Recorrer cada pantalla y capturar PNG a pantalla completa del viewport móvil.
- Nomenclatura ordenada: `A1-01-inicio.png`, `A2-03-confirmar-cita.png`, …
  (parte-tarea-secuencia-descripcion) → orden garantizado en el documento.

### 3.2 Anotación profesional (marcas de paso)
- Script Python con **Pillow**: superpone sobre cada captura
  - **marcadores numerados** ①②③ (círculo relleno con número blanco) en las
    coordenadas del elemento a tocar,
  - **recuadros/realces** redondeados alrededor del control,
  - color de realce **consistente** (rojo `#D64545`; alterna a azul si el área ya es roja),
  - sombra sutil para legibilidad.
- Las coordenadas de cada marca se definen en un **manifiesto** por captura
  (JSON), de modo que las marcas caen exactamente sobre el botón correcto.
- Marco de "teléfono" opcional (bisel) para dar contexto de que es app móvil.

### 3.3 Mockup de dispositivo (opcional, profesional)
- Insertar cada captura dentro de un **marco de smartphone** (PNG con esquinas
  redondeadas + barra de estado) para presentación tipo catálogo. Configurable
  (con/sin marco) según preferencia del cliente.

---

## 4. Generación de los documentos

### 4.1 DOCX (editable, fuente de verdad)
- **python-docx** construye el `.docx` con estilos profesionales:
  - portada con logo (`vitmaterna_logo.png` del repo) y barra de color de marca,
  - estilos de título H1/H2/H3, cuerpo, notas y avisos (cuadros con color),
  - **índice** (campo TOC actualizable en Word),
  - **figuras numeradas** con epígrafe ("Figura A2-1. Confirmar asistencia a la cita"),
  - listas numeradas para los pasos,
  - encabezado/pie con logo, título y número de página,
  - tabla de convenciones (íconos y marcas).
- Las capturas anotadas se insertan **centradas, a ancho controlado** (~9–10 cm
  para que el largo del móvil quepa en página y se vea nítido), con su epígrafe.

### 4.2 PDF (entregable final)
- Conversión **DOCX → PDF con LibreOffice** headless
  (`soffice --headless --convert-to pdf`), que preserva fielmente el formato,
  TOC, figuras y saltos de página. Garantiza paridad 1:1 entre ambos formatos.

### 4.3 Estructura de archivos en el repo
```
docs/manual/
  build/
    manual_usuario_vitmaterna_movil.docx
    manual_usuario_vitmaterna_movil.pdf
  assets/
    screens_raw/        # capturas crudas por rol
    screens_annotated/  # capturas con marcas ①②③
    device_frame.png    # marco de smartphone
  manifest/
    shots.json          # lista de capturas + anotaciones (coordenadas, pasos)
    content.json        # texto del manual (títulos, pasos, notas) por sección
  scripts/
    01_capture.mjs      # agent-browser: login por rol + capturas móviles
    02_annotate.py      # Pillow: marcas de paso y realces
    03_build_docx.py    # python-docx: arma el .docx
    04_to_pdf.sh        # LibreOffice: .docx → .pdf
    build_all.sh        # corre todo el pipeline
```

---

## 5. Fases de ejecución (con verificación)

1. **Fase 0 — Andamiaje**: crear `docs/manual/`, definir `content.json`
   (todo el texto del manual, por sección, en español claro) y `shots.json`
   (qué pantalla capturar, a qué ruta navegar, y las marcas de cada paso).
2. **Fase 1 — Captura (gestante)**: levantar app, login gestante, capturar las
   ~12–16 pantallas de la Parte A en viewport 390×844. Revisar nitidez.
3. **Fase 2 — Captura (obstetra y admin)**: ídem para Partes B y C
   (aprovechando los datos del seeder: listas llenas, alertas, KPIs).
4. **Fase 3 — Anotación**: ejecutar `02_annotate.py`; revisar que cada marca
   ①②③ caiga sobre el control correcto.
5. **Fase 4 — DOCX**: ejecutar `03_build_docx.py`; revisar portada, índice,
   figuras, epígrafes, saltos de página.
6. **Fase 5 — PDF**: convertir con LibreOffice; abrir el PDF y verificar paridad.
7. **Fase 6 — QA del manual**: checklist (abajo) + revisión visual página por
   página. Mostrar PDF y DOCX al cliente.
8. **Fase 7 — Entrega**: commit + push de `docs/manual/` (documentos + fuentes).

> Sugerencia: empezar por la **Parte A (gestante) de punta a punta** (captura →
> anotación → DOCX → PDF de esa parte) para que valides el estilo y el nivel de
> detalle antes de producir las 3 partes completas.

---

## 6. Checklist de calidad (QA del manual)

- [ ] Portada con logo, versión y fecha; índice navegable correcto.
- [ ] Cada tarea: objetivo + pasos numerados + captura anotada + nota si aplica.
- [ ] Texto siempre ANTES de la figura que lo ilustra.
- [ ] Marcas ①②③ sobre el control exacto; color de realce consistente.
- [ ] Figuras numeradas con epígrafe; numeración correlativa por parte.
- [ ] Capturas nítidas (retina), tamaño uniforme, sin datos sensibles reales.
- [ ] Lenguaje sencillo, una acción por paso, sin jerga.
- [ ] Encabezado/pie con paginación en todas las páginas.
- [ ] Troubleshooting + FAQ + glosario + contacto presentes.
- [ ] PDF y DOCX idénticos en contenido y formato.
- [ ] Revisado en español (ortografía/gramática).

---

## 7. Decisiones que necesito confirmar contigo

1. **Alcance inicial**: ¿genero el manual **completo de los 3 roles** de una vez,
   o empiezo por la **Parte A (gestante)** para que apruebes el estilo y luego
   sigo con obstetra y admin? *(Recomiendo empezar por gestante.)*
2. **Marco de teléfono**: ¿capturas dentro de un **mockup de smartphone**
   (más vistoso) o capturas limpias del viewport (más sobrias)?
3. **Idioma**: español (asumido). ¿Algún término o nombre de marca a respetar?
4. **Datos del cliente** para la portada/soporte: nombre de la clínica/empresa,
   logo alternativo, correo y teléfono de soporte, versión a imprimir.
5. **Branding**: ¿uso el logo `vitmaterna_logo.png` del repo y los colores de
   marca actuales, o tienes una guía/identidad específica?

---

## 8. Resumen ejecutivo

- **Qué**: manual de usuario móvil profesional (PDF + DOCX), por los 3 roles,
  organizado por tarea, con capturas reales anotadas con marcas de paso ①②③.
- **Cómo**: capturas en viewport móvil 390×844 con agent-browser (datos del
  seeder) → anotación con Pillow → armado en python-docx → PDF con LibreOffice.
- **Respeta**: estructura canónica (portada, índice, intro, requisitos,
  convenciones, secciones por proceso, troubleshooting, FAQ, glosario, contacto)
  y principios (lenguaje simple, "show don't tell", pasos numerados, texto antes
  de figura, jerarquía lógica, consistencia, accesibilidad).
- **Toolchain**: ya instalado y verificado (python-docx 1.1.0, Pillow 10.2.0,
  LibreOffice 24.2, agent-browser).
- **Entregable**: `docs/manual/build/manual_usuario_vitmaterna_movil.{pdf,docx}`
  + fuentes reproducibles (`scripts/`, `assets/`, `manifest/`).

> Pendiente de tu visto bueno y de las respuestas de la sección 7 para empezar
> por la **Parte A (gestante)** y mostrarte el primer PDF/DOCX de muestra.
