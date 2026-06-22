import React from 'react';
import { render, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ToastProvider } from '../src/components/ui/ToastProvider';

// Mock de la capa de datos: pacientes de ejemplo + mutación/disponibilidad.
jest.mock('../src/services/api-queries', () => ({
  usePatients: () => ({
    data: [
      { id: 'p1', firstName: 'Ana', lastName: 'Gómez', documentNumber: '33333333', riskLevel: 'Bajo', currentWeek: '24' },
      { id: 'p2', firstName: 'Lucía', lastName: 'Ramos', documentNumber: '44444444', riskLevel: 'Alto', currentWeek: '31' },
    ],
    isLoading: false,
  }),
  useCreateAppointment: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useAppointmentAvailability: () => ({ data: [], isLoading: false }),
}));

// Debounce inmediato para que el filtro se aplique sin temporizadores.
jest.mock('../src/hooks/useDebouncedValue', () => ({
  useDebouncedValue: (v: string) => v,
}));

import { NuevaCitaModal } from '../src/components/obstetra/NuevaCitaModal';

const METRICS = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

function renderModal() {
  return render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <ToastProvider>
        <NuevaCitaModal visible onClose={() => {}} />
      </ToastProvider>
    </SafeAreaProvider>,
  );
}

describe('NuevaCitaModal — búsqueda y selección de gestante', () => {
  it('abre el selector de paciente y lista las gestantes', () => {
    renderModal();
    expect(screen.getByText('Agenda una atención para una gestante')).toBeTruthy();
    fireEvent.press(screen.getByText('Buscar y seleccionar paciente…'));
    // Cambia al paso de selección con buscador.
    expect(screen.getByPlaceholderText('Buscar por nombre o DNI…')).toBeTruthy();
    expect(screen.getByText('Ana Gómez')).toBeTruthy();
    expect(screen.getByText('Lucía Ramos')).toBeTruthy();
  });

  it('filtra por DNI y muestra el contador de resultados', async () => {
    renderModal();
    fireEvent.press(screen.getByText('Buscar y seleccionar paciente…'));
    fireEvent.changeText(screen.getByPlaceholderText('Buscar por nombre o DNI…'), '44444444');
    await waitFor(() => {
      expect(screen.queryByText('Ana Gómez')).toBeNull();
      expect(screen.getByText('Lucía Ramos')).toBeTruthy();
    });
    expect(screen.getByText('1 paciente')).toBeTruthy();
  });

  it('al seleccionar, vuelve al formulario con la paciente en la tarjeta-resumen', async () => {
    renderModal();
    fireEvent.press(screen.getByText('Buscar y seleccionar paciente…'));
    fireEvent.press(screen.getByText('Ana Gómez'));
    await waitFor(() => {
      // Vuelve al formulario: aparecen los encabezados de paso.
      expect(screen.getByText('2 · Detalles')).toBeTruthy();
    });
    // La paciente quedó seleccionada (tarjeta con "Cambiar").
    expect(screen.getByText('Cambiar')).toBeTruthy();
    expect(screen.getByText('Ana Gómez')).toBeTruthy();
  });

  it('permite elegir "Otro…" y escribir un motivo personalizado', () => {
    renderModal();
    // Por defecto no se muestra el campo de motivo personalizado.
    expect(screen.queryByPlaceholderText('Escribe el motivo de la cita')).toBeNull();
    // Al tocar "Otro…" aparece el input de texto.
    fireEvent.press(screen.getByText('Otro…'));
    const input = screen.getByPlaceholderText('Escribe el motivo de la cita');
    expect(input).toBeTruthy();
    fireEvent.changeText(input, 'Control de presión arterial');
    expect(screen.getByDisplayValue('Control de presión arterial')).toBeTruthy();
  });
});
