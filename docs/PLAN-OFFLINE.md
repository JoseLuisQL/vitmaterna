# Plan — Módulo Offline-First (VITMATERNA)

> Objetivo: un módulo offline **completo, funcional, sin bugs, rápido,
> optimizado y preciso**. La app debe seguir siendo útil sin conexión
> (lectura de datos clave + registro de consumo de suplementos y signos de
> alarma encolados) y reconciliar automáticamente al reconectar, sin perder
> ni duplicar datos.

---

## A. Diagnóstico del estado actual (auditado en código)

### 🔴 Hallazgo central: el offline NO funciona hoy
1. **SQLite es código muerto.** `database/init.ts` crea 5 tablas pero
   **ningún componente lee ni escribe** en ellas. La única referencia fuera
   de `database/` es `initializeDatabase()` en `_layout.tsx`. Las tablas se
   crean y nunca se usan.
2. **La app es 100% online.** Todas las pantallas dependen de Axios → REST.
   Sin red: las queries fallan, no hay datos cacheados, las mutaciones se
   pierden (no hay cola).
3. **React Query sin persistencia.** `gcTime` 30 min en memoria, pero al
   cerrar la app se pierde toda la caché. No hay `persistQueryClient`.
4. **No hay detección de red.** No está instalado `NetInfo`; el chat usa el
   estado del socket, pero el resto de la app no sabe si está online.
5. **El backend `/v1/sync` existe pero nadie lo llama.** `pullChanges`/
   `pushChanges` están escritos para WatermelonDB (campos `_status`,
   `_changed`), que **no está instalado**. Hay bugs latentes:
   - `pushChanges` hace `create` con el `id` del cliente sin `upsert` →
     **falla si el registro ya existe** (reintentos rompen).
   - `pullChanges` declara `createdWhere`/`softDeletedWhere` sin usarlos
     (código muerto) y no maneja tombstones reales.
   - `cleanData` convierte fechas por heurística frágil de nombres.
6. **Faltan dependencias** del PRD: el PRD pide WatermelonDB; no está. No hay
   `NetInfo`, ni `AsyncStorage`, ni persisters de React Query.
7. **Web roto a propósito:** `expo-sqlite` se omite en web (requiere
   COOP/COEP). El offline debe degradar con elegancia en web.

### Conclusión
No vale la pena "arreglar" el esqueleto WatermelonDB/sync actual: está
desalineado con las libs instaladas y con la realidad de la app (React Query
+ Axios). La estrategia correcta y de menor riesgo es construir un offline
**nativo de React Query** sobre `expo-sqlite`, alineado a la matriz del PRD.

---

## B. Alcance (matriz del PRD, sección 9)

| Funcionalidad | Lectura offline | Escritura offline |
|--------------|:-:|:-:|
| Ver citas | ✅ | ❌ |
| Ver tratamientos | ✅ | ❌ |
| **Registrar consumo de suplemento** | ✅ | ✅ (encolado) |
| Contenido educativo | ✅ (precargado) | ❌ |
| Señales de peligro (lectura) | ✅ | ❌ |
| Calculadora EG | ✅ | N/A |
| **Reportar signo de alarma** | ❌ | ✅ (envía al reconectar) |
| Controles prenatales | ✅ (lectura) | ❌ |
| Chat | ❌ | ❌ |

**Resumen de escrituras offline a soportar (cola):**
`POST /treatments/:id/log` (consumo de suplemento) y
`POST /clinical/danger-signs` (signo de alarma). Todo lo demás es
**lectura cacheada**.

---

## C. Arquitectura propuesta (3 capas, sin WatermelonDB)

### Capa 1 — Detección de red (`onlineManager`)
- Instalar `@react-native-community/netinfo`.
- Conectar `NetInfo` al `onlineManager` de React Query → React Query pausa/
  reanuda queries y mutaciones automáticamente según conectividad.
- `focusManager` con AppState para refrescar al volver a foreground.
- Hook `useNetworkStatus()` + banner global "Sin conexión / Reconectando".

### Capa 2 — Caché de lectura persistente (React Query Persister)
- Instalar `@react-native-async-storage/async-storage`,
  `@tanstack/react-query-persist-client`,
  `@tanstack/query-async-storage-persister`.
- `persistQueryClient` con throttling: la caché de queries sobrevive al
  cierre de la app. Al reabrir sin red, las pantallas muestran los últimos
  datos (citas, tratamientos, controles, educación, perfil).
- `networkMode: 'offlineFirst'` en queries: sirve caché y reintenta al volver.
- Precarga (prefetch) tras login de los queries clave de la matriz, para
  garantizar disponibilidad offline desde el primer uso.
- En **web** el persister usa `localStorage` (sin SQLite) → degrada bien.

### Capa 3 — Cola de escrituras (outbox) sobre expo-sqlite
- Reemplazar el esquema muerto por una única tabla `outbox`:
  `id, type, endpoint, method, payload(JSON), dedupe_key, created_at,
   attempts, last_error, status`.
- API del módulo: `enqueue(op)`, `flush()`, `getPending()`, `clear()`.
- Las mutaciones offline (consumo, signo de alarma) usan
  `onMutate` (optimista en caché) → si no hay red, `enqueue` en outbox.
- `flush()` se dispara: al reconectar (`onlineManager`), al volver a
  foreground, y con reintento exponencial. Procesa FIFO, idempotente.
- **Idempotencia**: cada op lleva `dedupe_key` (p.ej.
  `supplement:<treatmentId>:<YYYY-MM-DD>`). El cliente no reenvía la misma;
  el backend ignora duplicados (ver D).
- **Persistencia real**: en nativo usa `expo-sqlite` (sobrevive a cierres);
  en web usa fallback en memoria + `localStorage` (la matriz no exige
  escritura offline crítica en web).

### Por qué NO WatermelonDB
- No está instalado y su sync bidireccional total es excesivo para la matriz
  (solo 2 escrituras offline). React Query ya gestiona el 90% (caché de
  lectura + mutaciones + reintentos). Menos superficie = menos bugs, más
  rápido, más preciso. (Se documenta como decisión; si el cliente exige
  WatermelonDB del PRD, es un plan alterno mayor.)

---

## D. Backend (robustez de la cola)
- **Idempotencia en las 2 escrituras encolables:**
  - `supplement log`: ya es "1 por día por tratamiento" (`@@unique`); volver
    el endpoint idempotente (si ya existe el log del día, responder 200 con
    el existente, no 409). Verificar y ajustar.
  - `danger-signs`: aceptar `clientId`/`dedupeKey` opcional y deduplicar por
    él en una ventana corta para evitar duplicados por reintento.
- **Arreglar/retirar `/v1/sync`:** como no se usará con WatermelonDB, se
  marca como deprecado o se corrige `pushChanges` a `upsert` y se limpia el
  código muerto de `pullChanges`. (Decisión: deprecar para no mantener algo
  sin uso; documentar.)
- Sin cambios de esquema salvo (si hace falta) un campo `dedupeKey` opcional
  en `DangerSign`.

---

## E. Rendimiento, precisión y robustez
- **Rápido:** caché instantánea (no spinner si hay datos), `staleTime`
  por tipo de dato (educación largo, citas corto), `getItemLayout`/FlashList
  en listas, throttle del persister (1–2 s), `flush` por lotes.
- **Preciso:** optimistic updates consistentes con el rollback de React
  Query; `dedupe_key` evita doble registro; relojes: usar fecha del servidor
  en la respuesta para reconciliar.
- **Sin bugs:** estados de la outbox (`pending`/`sent`/`failed`),
  límite de reintentos con backoff, no bloquear UI, manejo de errores 4xx
  (descartar op inválida) vs 5xx/red (reintentar).
- **Observabilidad:** indicador "N cambios pendientes de sincronizar" en
  perfil; log de errores de sync.

---

## F. Plan por fases (cada una verificada + commit a `main`)

### Fase 1 — Infraestructura de red + caché de lectura  🔴
- Instalar NetInfo + persist-client + async-storage.
- `onlineManager`/`focusManager`, `networkMode: offlineFirst`,
  `persistQueryClient`, banner de conexión, hook `useNetworkStatus`.
- Prefetch post-login de queries de la matriz.
- **Verificación:** cargar datos online → activar modo avión (simulado:
  bloquear API) → reabrir y navegar: citas/tratamientos/controles/educación
  se ven desde caché; banner "sin conexión" visible.

### Fase 2 — Outbox (cola de escrituras) + consumo de suplemento offline  🔴
- Tabla `outbox` en expo-sqlite + módulo `outbox.ts` (enqueue/flush/get).
- Migrar `useLogTreatment` y el reporte de signo de alarma a:
  optimista en caché → si offline, encola; al reconectar, flush idempotente.
- Indicador de "pendientes de sincronizar".
- **Verificación:** sin red, registrar consumo y signo de alarma → quedan
  optimistas + en outbox; reconectar → se envían una sola vez (sin
  duplicados); verificado contra la BD real.

### Fase 3 — Backend idempotente + limpieza de /sync  🟠
- Endpoints idempotentes (supplement log, danger-signs con dedupeKey).
- Deprecar/corregir `/v1/sync`; quitar código muerto.
- **Verificación:** reintentos no duplican; tests de integración.

### Fase 4 — Precarga, rendimiento y QA  🟡
- Prefetch afinado por rol, `staleTime` por recurso, FlashList donde aplique.
- QA: navegador (degradación web) + lógica de cola; tsc + tests.

---

## G. Dependencias a agregar
```
@react-native-community/netinfo            (detección de red, SDK 56)
@react-native-async-storage/async-storage  (persistencia de caché RQ)
@tanstack/react-query-persist-client
@tanstack/query-async-storage-persister
```
`expo-sqlite` ya está instalado (se reutiliza para la outbox).
WatermelonDB: **no** se agrega (ver C).

## H. Criterios de éxito
- [ ] Sin red, la app abre y muestra citas, tratamientos, controles,
      educación y perfil desde caché.
- [ ] Sin red, "tomar suplemento" y "reportar signo de alarma" funcionan
      (optimista) y quedan en cola.
- [ ] Al reconectar, la cola se vacía automáticamente, sin duplicados ni
      pérdidas (verificado contra BD).
- [ ] Banner de conexión + contador de pendientes.
- [ ] Web degrada sin romperse.
- [ ] tsc backend+frontend, tests OK, verificación en navegador en cada fase.
