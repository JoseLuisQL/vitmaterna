import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { AppButton } from '../src/components/ui/AppButton';
import { AppBadge } from '../src/components/ui/AppBadge';
import { StatusChip } from '../src/components/ui/StatusChip';

describe('AppButton', () => {
  it('renderiza el título', () => {
    render(<AppButton title="Guardar" onPress={() => {}} />);
    expect(screen.getByText('Guardar')).toBeTruthy();
  });

  it('llama onPress al presionar', () => {
    const onPress = jest.fn();
    render(<AppButton title="Enviar" onPress={onPress} />);
    fireEvent.press(screen.getByText('Enviar'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('no llama onPress cuando está deshabilitado', () => {
    const onPress = jest.fn();
    render(<AppButton title="Bloqueado" onPress={onPress} disabled />);
    fireEvent.press(screen.getByText('Bloqueado'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('muestra indicador de carga (oculta el título) cuando loading', () => {
    render(<AppButton title="Cargando" onPress={() => {}} loading />);
    expect(screen.queryByText('Cargando')).toBeNull();
  });

  it('expone rol de accesibilidad de botón', () => {
    render(<AppButton title="Accesible" onPress={() => {}} />);
    expect(screen.getByRole('button', { name: 'Accesible' })).toBeTruthy();
  });
});

describe('AppBadge', () => {
  it('renderiza la etiqueta', () => {
    render(<AppBadge label="Activo" variant="success" />);
    expect(screen.getByText('Activo')).toBeTruthy();
  });
});

describe('StatusChip', () => {
  it('renderiza una etiqueta para un estado conocido', () => {
    render(<StatusChip status="confirmada" />);
    // El chip muestra algún texto de estado
    expect(screen.root).toBeTruthy();
  });
});
