import type { Server } from 'socket.io';

/**
 * Registro simple de la instancia de Socket.io para que los servicios REST
 * puedan emitir eventos en tiempo real (p. ej. enviar un mensaje a una sala de
 * conversación) sin acoplarse a la creación del servidor.
 */
let ioInstance: Server | null = null;

export function setIO(io: Server): void {
  ioInstance = io;
}

export function getIO(): Server | null {
  return ioInstance;
}
