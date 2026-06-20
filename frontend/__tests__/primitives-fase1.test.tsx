/**
 * Fase 1 — Pruebas de las primitivas nuevas del sistema de diseño:
 * Field (familia), IconButton, LinkButton, Overlay/ConfirmSheet, skeletons de
 * dominio y el helper de estado→variante.
 */
import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { Heart } from 'lucide-react-native';
import { TextField, SearchField, SelectField, NumberField } from '../src/components/ui/Field';
import { IconButton } from '../src/components/ui/IconButton';
import { LinkButton } from '../src/components/ui/LinkButton';
import { ConfirmSheet } from '../src/components/patterns/ConfirmSheet';
import { TableSkeleton, FormSkeleton, KpiRowSkeleton } from '../src/components/ui/SkeletonLoader';
import { riskMeta, normalizeRisk, riskShortLabel } from '../src/utils/statusVariant';

describe('Field (familia)', () => {
  it('TextField muestra label, valor y propaga cambios', () => {
    const onChange = jest.fn();
    render(<TextField label="Nombre" value="Ana" onChangeText={onChange} />);
    expect(screen.getByText('Nombre')).toBeTruthy();
    const input = screen.getByDisplayValue('Ana');
    fireEvent.changeText(input, 'Ana María');
    expect(onChange).toHaveBeenCalledWith('Ana María');
  });

  it('TextField muestra el mensaje de error sobre el helper', () => {
    render(<TextField label="DNI" value="" onChangeText={() => {}} error="Ingresa tu DNI" helperText="8 dígitos" />);
    expect(screen.getByText('Ingresa tu DNI')).toBeTruthy();
    expect(screen.queryByText('8 dígitos')).toBeNull();
  });

  it('SearchField limpia el texto al pulsar la X', () => {
    const onChange = jest.fn();
    render(<SearchField value="hola" onChangeText={onChange} />);
    fireEvent.press(screen.getByLabelText('Limpiar búsqueda'));
    expect(onChange).toHaveBeenCalledWith('');
  });

  it('SelectField muestra placeholder y dispara onPress', () => {
    const onPress = jest.fn();
    render(<SelectField label="Sede" placeholder="Selecciona…" onPress={onPress} />);
    fireEvent.press(screen.getByText('Selecciona…'));
    expect(onPress).toHaveBeenCalled();
  });

  it('NumberField renderiza con teclado numérico', () => {
    render(<NumberField label="Peso" value="60" onChangeText={() => {}} />);
    expect(screen.getByDisplayValue('60')).toBeTruthy();
  });
});

describe('IconButton', () => {
  it('expone rol y label de accesibilidad y dispara onPress', () => {
    const onPress = jest.fn();
    render(<IconButton icon={Heart} onPress={onPress} accessibilityLabel="Me gusta" />);
    const btn = screen.getByRole('button', { name: 'Me gusta' });
    fireEvent.press(btn);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('no dispara onPress cuando está deshabilitado', () => {
    const onPress = jest.fn();
    render(<IconButton icon={Heart} onPress={onPress} accessibilityLabel="Bloqueado" disabled />);
    fireEvent.press(screen.getByRole('button', { name: 'Bloqueado' }));
    expect(onPress).not.toHaveBeenCalled();
  });
});

describe('LinkButton', () => {
  it('renderiza la etiqueta y dispara onPress', () => {
    const onPress = jest.fn();
    render(<LinkButton label="Ver todas" onPress={onPress} />);
    fireEvent.press(screen.getByText('Ver todas'));
    expect(onPress).toHaveBeenCalled();
  });
});

describe('ConfirmSheet', () => {
  it('muestra título/mensaje y resuelve confirmar/cancelar', () => {
    const onConfirm = jest.fn();
    const onCancel = jest.fn();
    render(
      <ConfirmSheet
        visible
        title="Eliminar registro"
        message="Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        onConfirm={onConfirm}
        onCancel={onCancel}
        destructive
      />,
    );
    expect(screen.getByText('Eliminar registro')).toBeTruthy();
    fireEvent.press(screen.getByText('Eliminar'));
    expect(onConfirm).toHaveBeenCalled();
    fireEvent.press(screen.getByText('Cancelar'));
    expect(onCancel).toHaveBeenCalled();
  });
});

describe('Skeletons de dominio', () => {
  it('renderizan sin romper', () => {
    expect(() => render(<TableSkeleton rows={3} cols={4} />)).not.toThrow();
    expect(() => render(<FormSkeleton fields={3} />)).not.toThrow();
    expect(() => render(<KpiRowSkeleton count={3} />)).not.toThrow();
  });
});

describe('Helper estado→variante (riesgo)', () => {
  it('normaliza español/inglés/UI al mismo nivel', () => {
    expect(normalizeRisk('rojo')).toBe(2);
    expect(normalizeRisk('Alto')).toBe(2);
    expect(normalizeRisk('high')).toBe(2);
    expect(normalizeRisk('amarillo')).toBe(1);
    expect(normalizeRisk('moderado')).toBe(1);
    expect(normalizeRisk('verde')).toBe(0);
    expect(normalizeRisk(undefined)).toBe(0);
  });

  it('mapea a variante y etiqueta consistentes', () => {
    expect(riskMeta('Alto').variant).toBe('danger');
    expect(riskMeta('Medio').variant).toBe('warning');
    expect(riskMeta('Bajo').variant).toBe('success');
    expect(riskShortLabel('rojo')).toBe('Alto');
  });
});
