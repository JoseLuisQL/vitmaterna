/**
 * VITMATERNA — Pruebas del motor del tour (controlador + registro de targets).
 *
 * Verifica la lógica pura, sin render nativo:
 *  - El controlador es no-op seguro cuando no hay host montado.
 *  - Registra/llama al host (start/stop/next/prev) cuando está montado.
 *  - El registro de targets registra, consulta y limpia refs por id.
 */
import {
  _registerTourHost,
  startTour,
  stopTour,
  nextTourStep,
  prevTourStep,
} from '../src/components/tour/tourController';
import {
  registerTarget,
  unregisterTarget,
  hasTarget,
} from '../src/components/tour/tourTargets';
import type { TourStep } from '../src/components/tour/types';

const demoSteps: TourStep[] = [
  { title: 'Paso 1', description: 'desc 1' },
  { title: 'Paso 2', description: 'desc 2', targetId: 'x' },
];

describe('tourController', () => {
  afterEach(() => _registerTourHost(null));

  it('es no-op seguro sin host montado', () => {
    _registerTourHost(null);
    expect(() => {
      startTour(demoSteps);
      nextTourStep();
      prevTourStep();
      stopTour();
    }).not.toThrow();
  });

  it('delega en el host registrado', () => {
    const host = {
      start: jest.fn(),
      stop: jest.fn(),
      next: jest.fn(),
      prev: jest.fn(),
    };
    _registerTourHost(host);

    startTour(demoSteps);
    nextTourStep();
    prevTourStep();
    stopTour();

    expect(host.start).toHaveBeenCalledWith(demoSteps);
    expect(host.next).toHaveBeenCalledTimes(1);
    expect(host.prev).toHaveBeenCalledTimes(1);
    expect(host.stop).toHaveBeenCalledTimes(1);
  });
});

describe('tourTargets registry', () => {
  it('registra, consulta y limpia un target por id', () => {
    const ref = { current: {} };
    expect(hasTarget('home-ribbon')).toBe(false);

    registerTarget('home-ribbon', ref);
    expect(hasTarget('home-ribbon')).toBe(true);

    unregisterTarget('home-ribbon', ref);
    expect(hasTarget('home-ribbon')).toBe(false);
  });

  it('no borra si el ref ya fue reemplazado por otro (carrera de montaje)', () => {
    const refA = { current: {} };
    const refB = { current: {} };

    registerTarget('dup', refA);
    registerTarget('dup', refB); // reemplaza
    unregisterTarget('dup', refA); // intento de limpiar el viejo: no debe borrar

    expect(hasTarget('dup')).toBe(true);

    unregisterTarget('dup', refB);
    expect(hasTarget('dup')).toBe(false);
  });
});
