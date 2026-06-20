/**
 * Fase 5 · Capa 1 — Estados de pantalla.
 *
 * ScreenLayout es el "molde" que heredan casi todas las pantallas; sus 4
 * estados (cargando con skeleton, error con reintento, vacío con CTA y
 * contenido) son el contrato común. Probarlos aquí cubre el comportamiento
 * de estado de todas las pantallas que lo usan.
 */
import React from 'react';
import { Text } from 'react-native';
import { fireEvent, screen } from '@testing-library/react-native';
import { Inbox } from 'lucide-react-native';
import { ScreenLayout } from '../src/components/layout/ScreenLayout';
import { renderWithSafeArea } from './helpers/renderWithProviders';

describe('ScreenLayout — los 4 estados', () => {
  it('CONTENIDO: muestra título y children', () => {
    renderWithSafeArea(
      <ScreenLayout role="obstetra" title="Gestantes">
        <Text>contenido real</Text>
      </ScreenLayout>,
    );
    expect(screen.getByText('Gestantes')).toBeTruthy();
    expect(screen.getByText('contenido real')).toBeTruthy();
  });

  it('CARGANDO: no pinta el contenido mientras loading', () => {
    renderWithSafeArea(
      <ScreenLayout role="obstetra" title="Gestantes" loading>
        <Text>contenido real</Text>
      </ScreenLayout>,
    );
    expect(screen.queryByText('contenido real')).toBeNull();
  });

  it('VACÍO: muestra el estado vacío y oculta el contenido', () => {
    renderWithSafeArea(
      <ScreenLayout
        role="obstetra"
        title="Gestantes"
        isEmpty
        emptyIcon={Inbox}
        emptyTitle="Sin pacientes"
        emptyMessage="Aún no tienes gestantes asignadas."
      >
        <Text>contenido real</Text>
      </ScreenLayout>,
    );
    expect(screen.getByText('Sin pacientes')).toBeTruthy();
    expect(screen.getByText('Aún no tienes gestantes asignadas.')).toBeTruthy();
    expect(screen.queryByText('contenido real')).toBeNull();
  });

  it('ERROR: muestra mensaje y botón Reintentar que dispara onRetry', () => {
    const onRetry = jest.fn();
    renderWithSafeArea(
      <ScreenLayout
        role="obstetra"
        title="Gestantes"
        error
        onRetry={onRetry}
        errorTitle="No se pudo cargar"
      >
        <Text>contenido real</Text>
      </ScreenLayout>,
    );
    expect(screen.getByText('No se pudo cargar')).toBeTruthy();
    expect(screen.queryByText('contenido real')).toBeNull();
    fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
