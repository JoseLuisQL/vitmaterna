# Pruebas de Rendimiento — VITMATERNA Backend

Herramienta: [autocannon](https://github.com/mcollina/autocannon) (`npm run perf`).

## Objetivo

Verificar los requisitos no funcionales de rendimiento:

- **RNF-2.01** — Tiempo de respuesta: cada operación de lectura < 3 s.
- **RNF-2.04** — Concurrencia: soportar ≥ 100 usuarios simultáneos.

El script `scripts/perf-test.mjs` autentica con los usuarios sembrados y somete
a carga los endpoints más representativos (lectura simple, listas y
agregaciones), reportando latencia (media/p97.5/p99/max), throughput y errores.
Falla si algún escenario supera p99 > 3000 ms o produce errores/no-2xx.

## Cómo ejecutar

```bash
# Backend corriendo y BD sembrada
CONNECTIONS=100 DURATION=10 npm run perf
```

> Nota: el limitador de tasa (rate limiter) está activo en producción
> (RNF de seguridad). Para medir el rendimiento puro de la aplicación, la
> corrida de carga se hace con los límites elevados por variables de entorno
> (`RATE_LIMIT_GLOBAL_MAX`, `RATE_LIMIT_MAX_REQUESTS`), como es práctica
> estándar en pruebas de carga. En operación normal el limitador protege la API.

## Resultados de referencia

Entorno: contenedor Linux, Node 22, PostgreSQL 16 y Redis 7 locales.
Configuración: **100 conexiones concurrentes**, 10 s por escenario.

| Escenario | req/s | media (ms) | p97.5 (ms) | p99 (ms) | max (ms) | errores |
|---|---|---|---|---|---|---|
| GET /health (sin auth) | 5557 | 17.5 | 28 | 41 | 1221 | 0 |
| GET /patients (lista, obstetra) | 448 | 220.5 | 311 | 649 | 849 | 0 |
| GET /appointments (obstetra) | 329 | 299.2 | 419 | 518 | 608 | 0 |
| GET /reports/clinic (agregaciones) | 104 | 924.4 | 1372 | 1377 | 1387 | 0 |
| GET /clinical/treatments (gestante) | 635 | 156.3 | 254 | 316 | 582 | 0 |

## Conclusiones

- **RNF-2.01 cumplido**: el p99 de todos los escenarios (máx. 1377 ms en el
  reporte agregado) está muy por debajo del umbral de 3 s, incluso bajo carga
  concurrente alta y sin la latencia de red real.
- **RNF-2.04 cumplido**: la API atiende 100 usuarios concurrentes sin errores
  ni timeouts.
- El endpoint más costoso es `/reports/clinic` por sus agregaciones; aun así se
  mantiene dentro del umbral. Es el principal candidato a optimización futura
  (índices/caché) si la población de gestantes crece de forma significativa.

> El destino del estudio (~40 gestantes en el C.S. Talavera) genera una carga
> muy inferior a la probada aquí, por lo que el rendimiento tiene amplio margen.
