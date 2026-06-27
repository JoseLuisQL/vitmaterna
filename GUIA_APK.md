<div align="center">

<img src="vitmaterna_logo.png" alt="VITMATERNA" width="120" />

# Guía para generar el APK de VITMATERNA

Paso a paso para construir el instalable Android (.apk) en tu PC,
tanto para **pruebas con backend local** como para **producción**.

</div>

---

## Tabla de contenidos

1. [Cómo funciona la configuración](#1-cómo-funciona-la-configuración)
2. [Requisitos previos](#2-requisitos-previos)
3. [Opción A — APK en la nube (EAS Build, la más fácil)](#3-opción-a--apk-en-la-nube-eas-build-la-más-fácil)
4. [Opción B — APK 100% local (sin nube)](#4-opción-b--apk-100-local-sin-nube)
5. [Configurar para LOCAL (backend en tu PC)](#5-configurar-para-local-backend-en-tu-pc)
6. [Configurar para PRODUCCIÓN](#6-configurar-para-producción)
7. [Actualizaciones OTA (EAS Update) — sin reinstalar el APK](#7-actualizaciones-ota-eas-update--sin-reinstalar-el-apk)
8. [Instalar el APK en el celular](#8-instalar-el-apk-en-el-celular)
9. [Solución de problemas](#9-solución-de-problemas)

---

## 1. Cómo funciona la configuración

La app decide a qué backend conectarse mediante **dos variables**:

| Variable | Para qué sirve | Ejemplo |
|---|---|---|
| `EXPO_PUBLIC_API_URL` | URL del backend que usará la app | `http://192.168.18.21:3000/v1` |
| `APP_ENV` | `local` o `production` (controla el HTTP en claro) | `local` |

- En **desarrollo** (Metro / `npm start`) estas variables salen de `frontend/.env`.
- En **builds de APK** salen del perfil de `frontend/eas.json` (campo `env`).
- `app.config.js` las inyecta en la app y, **solo en local**, habilita el
  tráfico HTTP en claro (Android 9+ lo bloquea por defecto). En producción
  exige HTTPS automáticamente.

> No tienes que tocar el código: solo eliges el **perfil** correcto al construir.

---

## 2. Requisitos previos

En tu PC necesitas:

- **Node.js ≥ 22** y **npm**
- Una **cuenta de Expo** gratuita → <https://expo.dev/signup>
- **EAS CLI**:
  ```bash
  npm install -g eas-cli
  eas login
  ```
- Instalar dependencias del proyecto (una sola vez):
  ```bash
  cd frontend
  npm install
  ```

> **Solo para la Opción B (build local):** además necesitas **Android Studio**
> con el SDK de Android y **JDK 17**. Para la Opción A (nube) NO hace falta nada
> de Android instalado.

La **primera vez** vincula el proyecto a tu cuenta Expo (crea el `projectId`) y
configura las actualizaciones OTA (rellena `updates.url` en `app.json`):

```bash
cd frontend
eas init                # crea el projectId y lo guarda en app.json
eas update:configure    # configura EAS Update (OTA) para este proyecto
```

> `eas update:configure` completa automáticamente el `updates.url` en `app.json`.
> El bloque `updates` y el `runtimeVersion` (policy `appVersion`) ya vienen
> preparados en el repo — ver [sección 7](#7-actualizaciones-ota-eas-update--sin-reinstalar-el-apk).

---

## 3. Opción A — APK en la nube (EAS Build, la más fácil)

Expo compila el APK en sus servidores y te da un enlace de descarga.
**No necesitas Android Studio.**

### APK de PRUEBA contra tu backend local

1. Pon la IP de tu PC en el perfil `apk-local` de `frontend/eas.json`
   (ver [sección 5](#5-configurar-para-local-backend-en-tu-pc)).
2. Construye:
   ```bash
   cd frontend
   npm run build:apk:local
   ```
3. Al terminar, EAS te da una URL. Ábrela en el celular y descarga el `.apk`.

> ⚠️ Para que este APK funcione, tu **PC y tu celular deben estar en la misma
> red Wi-Fi** y el backend debe estar corriendo (`cd backend && npm run dev`).

### APK de PRODUCCIÓN

```bash
cd frontend
npm run build:apk:prod
```

Usa la URL pública (HTTPS) definida en el perfil `production-apk` de `eas.json`.

| Comando | Perfil | Resultado |
|---|---|---|
| `npm run build:apk:local` | `apk-local` | APK que apunta a tu PC (LAN) |
| `npm run build:apk:preview` | `preview` | APK de prueba con backend de producción |
| `npm run build:apk:prod` | `production-apk` | **APK final** de producción |
| `npm run build:aab:prod` | `production` | `.aab` para subir a Google Play |

---

## 4. Opción B — APK 100% local (sin nube)

Si prefieres compilar en tu propia PC (requiere Android Studio + JDK 17):

```bash
cd frontend
npm run build:apk:local:here      # APK de prueba (backend local)
npm run build:apk:prod:here       # APK de producción
```

El `.apk` queda en la carpeta `frontend/` al terminar.

> La primera vez tarda más porque descarga y compila las dependencias nativas.

---

## 5. Configurar para LOCAL (backend en tu PC)

Objetivo: probar el APK en un celular físico conectándose al backend que corre
en tu PC.

### Paso 1 — Averigua la IP de tu PC en la red

- **Windows:** `ipconfig` → busca "Dirección IPv4" (ej. `192.168.18.21`)
- **Linux/Mac:** `ip a` o `ifconfig` → busca tu IP `192.168.x.x`

### Paso 2 — Pon esa IP en `frontend/eas.json` (perfil `apk-local`)

```json
"apk-local": {
  "distribution": "internal",
  "android": { "buildType": "apk" },
  "env": {
    "APP_ENV": "local",
    "EXPO_PUBLIC_API_URL": "http://192.168.18.21:3000/v1"
  }
}
```

> Cambia `192.168.18.21` por **la IP de TU PC**. Mantén el puerto `:3000` y el
> sufijo `/v1`.

### Paso 3 — Levanta el backend escuchando en la red

```bash
cd backend
npm run dev
```

Y añade la IP del celular/LAN a `CORS_ORIGINS` en `backend/.env` si pruebas
también desde el navegador (para el APK no hace falta; las apps no envían
`Origin`). El backend ya acepta peticiones de apps móviles.

### Paso 4 — (Solo para desarrollo con Metro) ajusta `frontend/.env`

Si vas a usar **Expo Go / `npm start`** en vez de un APK:

```bash
cd frontend
cp .env.local.example .env
# edita .env y pon la IP de tu PC
npm start
```

### Paso 5 — Construye el APK local

```bash
cd frontend
npm run build:apk:local        # nube (Opción A)
# o
npm run build:apk:local:here   # local (Opción B)
```

---

## 6. Configurar para PRODUCCIÓN

Objetivo: un APK que cualquier usuario pueda instalar y que funcione desde
cualquier red (no depende de tu PC).

### Paso 1 — Ten el backend publicado por HTTPS

El backend debe estar desplegado en un servidor con dominio y certificado
(ej. `https://vitmaterna.qware.me`). En producción **es obligatorio HTTPS**.

> Con el despliegue Docker de este repo, la API vive en el **mismo dominio** bajo
> `/api` (`https://vitmaterna.qware.me/api/v1`). Ver `DEPLOY_DOCKER.md`.

### Paso 2 — El dominio ya está en `frontend/eas.json` (perfiles `production-apk` y `production`)

```json
"production-apk": {
  "distribution": "internal",
  "channel": "production",
  "autoIncrement": true,
  "android": { "buildType": "apk" },
  "env": {
    "APP_ENV": "production",
    "EXPO_PUBLIC_API_URL": "https://vitmaterna.qware.me/api/v1"
  }
}
```

> Si **cambias de dominio**, reemplaza `https://vitmaterna.qware.me/api/v1` por el
> nuevo en ambos perfiles (`production-apk` y `production`) y reconstruye el APK.

### Paso 3 — Construye

```bash
cd frontend
npm run build:apk:prod     # APK para repartir directamente
# o, para publicar en Google Play:
npm run build:aab:prod     # genera el .aab que se sube a Play Console
```

---

## 7. Actualizaciones OTA (EAS Update) — sin reinstalar el APK

Una vez que un usuario tiene el APK instalado, **no necesitas regenerar ni
reinstalar el APK cada vez que cambias código**. VITMATERNA usa **EAS Update**
(actualizaciones "Over The Air"): publicas la nueva versión del JavaScript y los
dispositivos la descargan solos al abrir la app.

### ¿Qué se actualiza por OTA y qué necesita un APK nuevo?

| Tipo de cambio | ¿Cómo se entrega? |
|---|---|
| Pantallas, componentes, hooks, lógica, llamadas a la API, estilos, textos, **fix de bugs** | ✅ **OTA** — `eas update`, sin reinstalar |
| Imágenes/assets empaquetados en el bundle JS | ✅ **OTA** |
| Nueva **librería con código nativo**, subir de **Expo SDK** / React Native | 🔁 **Rebuild + reinstalar** APK |
| Cambiar **permisos**, ícono, `package`, `usesCleartextTraffic`, plugins nativos | 🔁 **Rebuild + reinstalar** APK |

> **Regla práctica:** tocaste solo archivos `.ts`/`.tsx` → OTA. Tocaste dependencias
> nativas o configuración nativa (`app.json`) → APK nuevo.

### Cómo está configurado (ya viene listo en el repo)

- `app.json` → bloque `updates` (`enabled: true`, `checkAutomatically: ON_LOAD`)
  y `runtimeVersion` con **policy `appVersion`**.
- `eas.json` → cada perfil de producción declara su **canal**:
  `preview` → canal `preview`, `production-apk` y `production` → canal `production`.

El **`runtimeVersion = appVersion`** es la pieza de seguridad clave: ata cada OTA
a la `version` del APK (hoy `1.0.0`). Un dispositivo solo recibe updates compatibles
con su binario nativo. Cuando cambies algo **nativo**, sube la `version` en
`app.json`, reconstruye el APK, y los nuevos OTAs irán a esa versión.

### Publicar una actualización OTA

```bash
cd frontend

# Publica al canal de PRODUCCIÓN (lo que usan los APK de producción ya instalados)
eas update --branch production --message "fix: corrige cálculo en pantalla de citas"

# Publica al canal de PRUEBA (APK del perfil preview)
eas update --branch preview --message "prueba: nueva pantalla de educación"
```

Los dispositivos con la app abierta verifican el canal al iniciar
(`checkAutomatically: ON_LOAD`): descargan el update en segundo plano y lo aplican
en el **siguiente arranque** de la app.

### Flujo de trabajo recomendado

```
1. Programas una función nueva (solo JS/TS).
2. eas update --branch production --message "..."
3. Los usuarios reciben el cambio al reabrir la app. (sin reinstalar)

   ─── pero si tocaste algo NATIVO ───
1. Sube "version" en app.json (p.ej. 1.0.0 → 1.1.0).
2. npm run build:apk:prod   (APK nuevo)
3. Los usuarios reinstalan ese APK una vez; a partir de ahí, OTAs de nuevo.
```

> **Importante:** EAS Update solo funciona en builds hechos con EAS que incluyen
> `expo-updates` (los perfiles `preview`/`production*`). En desarrollo con Metro
> (`npm start`) o en el perfil `apk-local` no aplica — ahí el código se recarga solo.

---

## 8. Instalar el APK en el celular

1. Descarga el `.apk` (desde el enlace de EAS o cópialo por USB).
2. En el celular: **Ajustes → Seguridad → "Instalar apps de fuentes
   desconocidas"** y permítelo para tu navegador o gestor de archivos.
3. Abre el `.apk` y pulsa **Instalar**.
4. Abre **VITMATERNA** y entra con tus credenciales.

---

## 9. Solución de problemas

| Síntoma | Causa probable | Solución |
|---|---|---|
| La app abre pero **no carga datos** / "error de conexión" | El APK apunta a `localhost` o a una IP equivocada | Verifica `EXPO_PUBLIC_API_URL` en el perfil de `eas.json` y reconstruye |
| Funciona en Wi-Fi pero **no con datos móviles** | El backend es local (solo accesible en tu red) | Usa un APK de **producción** con backend público |
| "Cleartext HTTP not permitted" | Build de producción apuntando a `http://` | Usa `https://`, o `APP_ENV=local` si es para pruebas |
| El celular **no encuentra** la PC | No están en la misma Wi-Fi, o firewall | Misma red; permite el puerto 3000 en el firewall de la PC |
| `eas: command not found` | EAS CLI no instalado | `npm install -g eas-cli` |
| Pide `projectId` | Proyecto no vinculado | `cd frontend && eas init` |
| Build local falla por SDK/JDK | Falta Android Studio o JDK 17 | Instálalos, o usa la **Opción A** (nube) |
| `eas update` no llega a la app | El APK no se construyó con `expo-updates`, o canal distinto | Reconstruye con un perfil de producción; verifica que el `--branch` coincide con el `channel` del perfil |
| El OTA se publica pero la app sigue igual | `runtimeVersion` distinto (cambió la `version` nativa) | El OTA solo llega a APKs con la misma `version`; reconstruye el APK o publica al runtime correcto |

---

### Resumen rápido

```bash
# 1. Preparar (una vez)
npm install -g eas-cli && eas login
cd frontend && npm install && eas init && eas update:configure

# 2. LOCAL: pon tu IP en eas.json (perfil apk-local) y:
npm run build:apk:local

# 3. PRODUCCIÓN: el dominio HTTPS ya está en eas.json (https://vitmaterna.qware.me/api/v1)
npm run build:apk:prod

# 4. Cambiaste solo código JS/TS → actualización OTA (sin reinstalar):
eas update --branch production --message "describe el cambio"
```
