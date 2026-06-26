/**
 * VITMATERNA — Pasos del tour por rol.
 *
 * Devuelve la secuencia de pasos del tour guiado según el rol del usuario. Los
 * `targetId` deben coincidir con los registrados vía `useTourTarget` en las
 * pantallas. Los pasos sin `targetId` se muestran centrados.
 */
import type { UserRole } from '../../../types/user';
import type { TourStep } from '../types';
import { gestanteTourSteps } from './gestante.steps';
import { obstetraTourSteps } from './obstetra.steps';
import { adminTourSteps } from './admin.steps';

export { TOUR_TARGETS } from './targets';

export function tourStepsForRole(role: UserRole | undefined): TourStep[] {
  switch (role) {
    case 'obstetra':
      return obstetraTourSteps;
    case 'admin':
      return adminTourSteps;
    case 'gestante':
    default:
      return gestanteTourSteps;
  }
}

export { gestanteTourSteps, obstetraTourSteps, adminTourSteps };
