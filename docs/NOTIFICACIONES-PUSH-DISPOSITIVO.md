# VITMATERNA — Notificaciones push en el dispositivo (centro de notificaciones)

## ¿Por qué no funcionan en Expo Go?

Desde **Expo SDK 53**, las **notificaciones push remotas fueron eliminadas de
Expo Go**. Por eso, aunque el código está completo, en Expo Go:
- No se puede obtener un *Expo Push Token* del dispositivo.
- Las notificaciones **no aparecen** en el centro de notificaciones del teléfono.

Esto **no es un error del proyecto** — es una limitación de Expo Go. La app
detecta Expo Go y desactiva el push para no crashear; en su lugar usa la
**bandeja in-app** (la campana 🔔).

> Resumen: para ver las notificaciones en la barra del sistema (Android/iOS)
> necesitas un **Development Build** (una app nativa tuya), no Expo Go.

---

## Lo que YA está implementado (no hay que tocar nada de código)

- Cliente: registro del Expo Push Token al iniciar sesión, handler de primer
  plano, listeners de recepción y de toque (deep-link), canal Android.
- Servidor: envío real vía **Expo Push Service**
  (`expo.sendPushNotificationsAsync`) en cada evento (cita confirmada, signo de
  alarma, recordatorios, etc.).
- Config: `expo-notifications` y `expo-dev-client` instalados, `eas.json` listo.

---

## Pasos para generar el Development Build (una sola vez)

Requisitos: una cuenta gratuita en https://expo.dev y Node instalado.

```powershell
cd C:\Proyectos\vitmaterna\frontend

# 1. Instalar EAS CLI (una vez en tu PC)
npm install -g eas-cli

# 2. Iniciar sesión en tu cuenta Expo
eas login

# 3. Vincular el proyecto (crea extra.eas.projectId en app.json automáticamente)
eas init

# 4. Generar el build de desarrollo para Android (APK instalable)
eas build --profile development --platform android
```

- El build se hace en la nube de Expo (~10-20 min). Al terminar te da un **enlace
  y un QR** para descargar el **APK**.
- Instala ese APK en tu teléfono o emulador (es tu app "VITMATERNA", reemplaza a
  Expo Go).

### Correr la app sobre el build

```powershell
npx expo start --dev-client
```

Abre tu app VITMATERNA (no Expo Go) y escanea el QR. A partir de aquí:
- Al iniciar sesión, el teléfono pedirá **permiso de notificaciones** → acéptalo.
- Las notificaciones llegarán al **centro de notificaciones del dispositivo**,
  incluso con la app cerrada.

> iOS: para push en iPhone físico necesitas cuenta de Apple Developer. En
> Android no hace falta nada extra.

---

## Cómo probar que llegan al dispositivo

1. Inicia sesión como **gestante** en el dev build (acepta el permiso de push).
2. Desde otra sesión, como **obstetra**, genera un evento que notifique
   (por ejemplo, aprueba/!rechaza una reprogramación, o registra una visita).
3. La gestante recibe la notificación en la **barra del sistema** del teléfono.
   Al tocarla, abre la pantalla correspondiente (deep-link).

También puedes probar el envío directo con la herramienta de Expo:
https://expo.dev/notifications (pega el Expo Push Token que se registró).

---

## Alternativa rápida sin build (solo para demo)

Si solo quieres mostrar el flujo sin generar el build, la **campana in-app** 🔔
ya funciona en Expo Go y muestra todas las notificaciones (con badge de no
leídas). No es el centro del sistema, pero demuestra el circuito completo.
