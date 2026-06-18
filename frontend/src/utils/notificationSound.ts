/**
 * VITMATERNA — Sonido de notificación (estilo WhatsApp).
 * Reproduce un tono corto cuando llega un mensaje/notificación en tiempo real
 * mientras la app está abierta. Usa expo-audio (createAudioPlayer) de forma
 * perezosa y con manejo de errores para no romper en web/Expo Go.
 */
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

let player: AudioPlayer | null = null;
let lastPlayed = 0;

// Evita "spam" de sonido si llegan varios eventos juntos (debounce ligero).
const MIN_INTERVAL_MS = 1200;

function getPlayer(): AudioPlayer | null {
  if (player) return player;
  try {
    // Permite sonar aunque el teléfono esté en modo silencioso (como los chats).
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
    player = createAudioPlayer(require('../../assets/notification.wav'));
    return player;
  } catch {
    return null;
  }
}

/** Reproduce el tono de notificación (no bloqueante, tolerante a fallos). */
export function playNotificationSound(): void {
  const now = Date.now();
  if (now - lastPlayed < MIN_INTERVAL_MS) return;
  lastPlayed = now;
  try {
    const p = getPlayer();
    if (!p) return;
    p.seekTo(0);
    p.play();
  } catch {
    /* silencioso: el sonido es un extra, no debe romper nada */
  }
}
