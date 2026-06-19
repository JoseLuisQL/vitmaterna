# Plan — Arreglar y mejorar la "Vista previa" de contenido educativo

**Ubicación:** `frontend/app/(obstetra)/gestante/[id].tsx` → modal "Recomendar contenido educativo" (se abre desde el ícono 📖 en la cabecera de la Historia Clínica).

## Diagnóstico (bug reproducido en navegador)

Flujo actual del modal:
1. **Paso 1 — Lista:** búsqueda + lista de recursos. Funciona.
2. **Paso 2 — "Previsualizar y enviar":** muestra un resumen del recurso, un campo de nota y una **maqueta de la burbuja del chat** con una tarjeta que dice *"Toca para leer"*.

**El problema:** esa tarjeta de "vista previa" **NO es interactiva** y **no muestra el contenido real** del recurso. El obstetra nunca puede *leer/previsualizar* el artículo que está por enviar — solo ve un mockup de cómo se verá el aviso en el chat de la gestante. Es decir, la "vista previa del contenido" no funciona: no hay forma de ver el cuerpo del contenido (`contenido`, multimedia, tiempo de lectura real, etc.).

## Objetivos

1. **Arreglar la vista previa**: que el obstetra pueda leer realmente el contenido del recurso antes de enviarlo (título, categoría, tipo, tiempo de lectura, cuerpo con formato `RichText`, y enlace multimedia si existe).
2. **Diseño más profesional**: tarjeta de cabecera tipo "artículo" (portada/ícono + badge de categoría + meta), separadores claros, jerarquía tipográfica y espaciado consistentes con el resto del design system (igual que la vista de la gestante y el preview del admin).
3. **Más cómodo de usar**:
   - En la **lista**, cada fila tiene un botón rápido **"Vista previa"** (ojo) que abre la lectura del recurso sin tener que seleccionarlo para enviar.
   - En el **paso de envío**, el contenido real se muestra colapsable ("Ver contenido completo") para no saturar, y la maqueta del chat queda claramente etiquetada como tal.

## Cambios concretos

### `frontend/app/(obstetra)/gestante/[id].tsx`
- Importar `RichText` y `readingTime` (de `educationMeta`), e íconos `Eye`, `Clock`, `ExternalLink`, `PlayCircle`, `FileText`/`ChevronDown` según necesidad.
- Nuevo estado `recExpanded` (mostrar/ocultar el cuerpo completo en el paso de envío).
- **Paso 2 (preview step) rediseñado:**
  - Tarjeta "artículo": portada (`thumbnailUrl`) o ícono de categoría grande, badge de categoría coloreado, título `h2`, meta (`tipo · tiempo de lectura · trimestre`).
  - Si hay `mediaUrl`: tarjeta-enlace "Ver video / Escuchar audio / Abrir recurso" (abre con `Linking`).
  - Bloque **"Contenido"** con el cuerpo real renderizado con `RichText` (este es el fix central), colapsable con un botón "Ver contenido completo / Ver menos".
  - Campo de **nota** (se mantiene).
  - Maqueta del chat (se mantiene, pulida y claramente rotulada "Así lo verá en su chat").
- **Lista (paso 1):** añadir botón "Vista previa" (ícono ojo) por fila que setea el seleccionado y un flag de solo-lectura para abrir la lectura; mantener el chevron para "elegir y enviar".
- Estilos nuevos/ajustados (`recArticleCard`, `recCatBadge`, `recArticleTitle`, `recArticleMeta`, `recMediaCard`, `recSectionLabel`, `recBodyWrap`, `recExpandBtn`, `recPreviewIconBtn`, etc.) usando tokens del tema.

## Verificación
- Recargar la app (Metro hot reload), entrar a Historia Clínica → 📖 → seleccionar un recurso → confirmar que el **cuerpo del contenido** se ve y se puede leer; que el botón "Vista previa" de la lista abre la lectura; que "Enviar al chat" sigue funcionando (toast de éxito) y aparece en Educación de la gestante.
- `npm run tsc` sin errores nuevos en el archivo.

## Entrega
- Commit y **push a `main`** del repositorio remoto (GitHub).
