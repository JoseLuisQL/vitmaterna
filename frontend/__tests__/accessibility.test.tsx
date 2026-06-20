/**
 * Fase 5 · Capa 3 — Accesibilidad de las primitivas.
 *
 * Verifica el "suelo de calidad" de a11y: roles correctos, labels presentes y
 * estados (disabled/selected) expuestos a lectores de pantalla. Si una
 * primitiva pierde su rol/label, estas pruebas lo detectan.
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { Heart, Plus } from 'lucide-react-native';
import { AppButton } from '../src/components/ui/AppButton';
import { IconButton } from '../src/components/ui/IconButton';
import { LinkButton } from '../src/components/ui/LinkButton';
import { TextField, SelectField } from '../src/components/ui/Field';
import { AppBadge } from '../src/components/ui/AppBadge';

describe('Accesibilidad — botones', () => {
  it('AppButton expone rol button y su título como label', () => {
    render(<AppButton title="Guardar cambios" onPress={() => {}} />);
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeTruthy();
  });

  it('AppButton deshabilitado marca accessibilityState.disabled', () => {
    render(<AppButton title="Enviar" onPress={() => {}} disabled />);
    const btn = screen.getByRole('button', { name: 'Enviar' });
    expect(btn.props.accessibilityState?.disabled).toBe(true);
  });

  it('IconButton requiere y expone un label descriptivo', () => {
    render(<IconButton icon={Plus} onPress={() => {}} accessibilityLabel="Crear registro" />);
    expect(screen.getByRole('button', { name: 'Crear registro' })).toBeTruthy();
  });

  it('LinkButton expone rol button y su etiqueta', () => {
    render(<LinkButton label="Ver todas" onPress={() => {}} />);
    expect(screen.getByRole('button', { name: 'Ver todas' })).toBeTruthy();
  });
});

describe('Accesibilidad — campos', () => {
  it('TextField asocia el label al control', () => {
    render(<TextField label="Correo" value="" onChangeText={() => {}} />);
    expect(screen.getByLabelText('Correo')).toBeTruthy();
  });

  it('TextField deshabilitado expone disabled', () => {
    render(<TextField label="DNI" value="" onChangeText={() => {}} disabled />);
    expect(screen.getByLabelText('DNI').props.accessibilityState?.disabled).toBe(true);
  });

  it('SelectField anuncia label + valor seleccionado', () => {
    render(<SelectField label="Sede" valueLabel="Talavera" onPress={() => {}} />);
    expect(screen.getByRole('button', { name: 'Sede: Talavera' })).toBeTruthy();
  });
});

describe('Accesibilidad — estado', () => {
  it('AppBadge expone su etiqueta como texto accesible', () => {
    render(<AppBadge label="Alto riesgo" variant="danger" />);
    expect(screen.getByLabelText('Alto riesgo')).toBeTruthy();
  });
});
