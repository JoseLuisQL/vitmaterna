/**
 * Fase 2 — Pruebas de los patrones de pantalla (Nivel 2):
 * SectionCard, ListScreen (estados/dual render), FormScreen, DetailScreen,
 * DashboardScreen. Se envuelven en SafeAreaProvider porque ScreenLayout usa
 * safe-area.
 */
import React from 'react';
import { Text, View } from 'react-native';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Baby } from 'lucide-react-native';
import { SectionCard } from '../src/components/patterns/SectionCard';
import { ListScreen } from '../src/components/patterns/ListScreen';
import { FormScreen } from '../src/components/patterns/FormScreen';
import { DetailScreen } from '../src/components/patterns/DetailScreen';
import { DashboardScreen } from '../src/components/patterns/DashboardScreen';
import { obstetraColors } from '../src/theme/colors';

const wrap = (ui: React.ReactElement) =>
  render(
    <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }}>
      {ui}
    </SafeAreaProvider>,
  );

describe('SectionCard', () => {
  it('muestra título y dispara la acción de cabecera', () => {
    const onPress = jest.fn();
    wrap(
      <SectionCard title="Citas de hoy" action={{ label: 'Ver todas', onPress }}>
        <Text>contenido</Text>
      </SectionCard>,
    );
    expect(screen.getByText('Citas de hoy')).toBeTruthy();
    expect(screen.getByText('contenido')).toBeTruthy();
    fireEvent.press(screen.getByText('Ver todas'));
    expect(onPress).toHaveBeenCalled();
  });
});

describe('ListScreen', () => {
  const cols = [
    { key: 'nombre', header: 'Nombre', render: (r: any) => r.nombre },
  ];

  it('muestra el título de la pantalla', () => {
    wrap(
      <ListScreen
        role="obstetra"
        title="Gestantes"
        accentColor={obstetraColors.primary}
        data={[{ id: '1', nombre: 'Ana' }]}
        keyExtractor={(r) => r.id}
        renderCard={(r) => <Text>{r.nombre}</Text>}
        columns={cols}
      />,
    );
    expect(screen.getByText('Gestantes')).toBeTruthy();
  });

  it('muestra el estado vacío con su mensaje', () => {
    wrap(
      <ListScreen
        role="obstetra"
        title="Gestantes"
        accentColor={obstetraColors.primary}
        data={[]}
        keyExtractor={(r: any) => r.id}
        renderCard={(r: any) => <Text>{r.nombre}</Text>}
        columns={cols}
        emptyIcon={Baby as any}
        emptyTitle="Sin resultados"
        emptyMessage="Aún no hay pacientes."
      />,
    );
    expect(screen.getByText('Sin resultados')).toBeTruthy();
    expect(screen.getByText('Aún no hay pacientes.')).toBeTruthy();
  });
});

describe('FormScreen', () => {
  it('renderiza campos y dispara guardar/cancelar', () => {
    const onSubmit = jest.fn();
    const onCancel = jest.fn();
    wrap(
      <FormScreen
        role="admin"
        title="Nueva sede"
        accentColor={obstetraColors.primary}
        submitLabel="Guardar cambios"
        onSubmit={onSubmit}
        onCancel={onCancel}
      >
        <Text>campos</Text>
      </FormScreen>,
    );
    expect(screen.getByText('campos')).toBeTruthy();
    fireEvent.press(screen.getByText('Guardar cambios'));
    expect(onSubmit).toHaveBeenCalled();
    fireEvent.press(screen.getByText('Cancelar'));
    expect(onCancel).toHaveBeenCalled();
  });
});

describe('DetailScreen', () => {
  it('muestra cabecera de identidad y secciones', () => {
    wrap(
      <DetailScreen role="obstetra" title="Ficha" accentColor={obstetraColors.primary} avatarText="AM" heading="Ana María" meta="DNI 12345678">
        <View><Text>sección</Text></View>
      </DetailScreen>,
    );
    expect(screen.getByText('Ana María')).toBeTruthy();
    expect(screen.getByText('DNI 12345678')).toBeTruthy();
    expect(screen.getByText('sección')).toBeTruthy();
  });
});

describe('DashboardScreen', () => {
  it('muestra saludo, kpis y cuerpo', () => {
    wrap(
      <DashboardScreen
        role="gestante"
        title="Inicio"
        accentColor={obstetraColors.primary}
        greeting="Hola, Ana"
        kpis={<Text>kpis</Text>}
      >
        <Text>cuerpo</Text>
      </DashboardScreen>,
    );
    expect(screen.getByText('Hola, Ana')).toBeTruthy();
    expect(screen.getByText('kpis')).toBeTruthy();
    expect(screen.getByText('cuerpo')).toBeTruthy();
  });
});
