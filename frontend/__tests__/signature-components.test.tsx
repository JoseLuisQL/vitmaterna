import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { ToggleTabs } from '../src/components/ui/ToggleTabs';
import { DiagnosisPill } from '../src/components/ui/DiagnosisPill';
import { KpiCard } from '../src/components/ui/KpiCard';
import { CircularProgress } from '../src/components/ui/CircularProgress';
import { AppModal } from '../src/components/ui/AppModal';
import { PrenatalRibbon } from '../src/components/ui/PrenatalRibbon';
import { Text } from 'react-native';

describe('ToggleTabs', () => {
  const tabs = [
    { key: 'a', label: 'Resumen' },
    { key: 'b', label: 'Detalle' },
  ];

  it('renderiza todas las pestañas', () => {
    render(<ToggleTabs tabs={tabs} value="a" onChange={() => {}} />);
    expect(screen.getByText('Resumen')).toBeTruthy();
    expect(screen.getByText('Detalle')).toBeTruthy();
  });

  it('llama onChange con la pestaña seleccionada', () => {
    const onChange = jest.fn();
    render(<ToggleTabs tabs={tabs} value="a" onChange={onChange} />);
    fireEvent.press(screen.getByText('Detalle'));
    expect(onChange).toHaveBeenCalledWith('b');
  });

  it('marca la pestaña activa con estado de accesibilidad', () => {
    render(<ToggleTabs tabs={tabs} value="b" onChange={() => {}} />);
    const activa = screen.getByText('Detalle').parent;
    expect(activa).toBeTruthy();
  });
});

describe('DiagnosisPill', () => {
  it('muestra el texto del diagnóstico', () => {
    render(<DiagnosisPill label="Caries" />);
    expect(screen.getByText('Caries')).toBeTruthy();
  });
});

describe('KpiCard', () => {
  it('muestra label, valor y badge', () => {
    render(<KpiCard label="Adherencia" value="83%" badge="+5%" badgeTone="positive" />);
    expect(screen.getByText('Adherencia')).toBeTruthy();
    expect(screen.getByText('83%')).toBeTruthy();
    expect(screen.getByText('+5%')).toBeTruthy();
  });
});

describe('CircularProgress', () => {
  it('muestra el porcentaje por defecto', () => {
    render(<CircularProgress value={72} />);
    expect(screen.getByText('72%')).toBeTruthy();
  });

  it('respeta una etiqueta central personalizada', () => {
    render(<CircularProgress value={50} label="5/10" />);
    expect(screen.getByText('5/10')).toBeTruthy();
  });

  it('acota valores fuera de rango', () => {
    render(<CircularProgress value={140} />);
    expect(screen.getByText('100%')).toBeTruthy();
  });
});

describe('AppModal', () => {
  it('muestra título y contenido cuando es visible', () => {
    render(
      <AppModal visible title="Confirmar" onClose={() => {}}>
        <Text>Cuerpo del modal</Text>
      </AppModal>,
    );
    expect(screen.getByText('Confirmar')).toBeTruthy();
    expect(screen.getByText('Cuerpo del modal')).toBeTruthy();
  });

  it('cierra al presionar el botón de cierre', () => {
    const onClose = jest.fn();
    render(
      <AppModal visible title="Confirmar" onClose={onClose}>
        <Text>Cuerpo</Text>
      </AppModal>,
    );
    fireEvent.press(screen.getByLabelText('Cerrar'));
    expect(onClose).toHaveBeenCalled();
  });
});

describe('PrenatalRibbon (componente insignia)', () => {
  it('describe la semana y el trimestre para lectores de pantalla', () => {
    render(<PrenatalRibbon week={24} />);
    expect(screen.getByLabelText(/Semana 24 de 40/)).toBeTruthy();
    expect(screen.getByText('Segundo trimestre')).toBeTruthy();
  });

  it('invita a registrar la FUM cuando no hay semana', () => {
    render(<PrenatalRibbon week={0} />);
    expect(screen.getByText('Sin fecha registrada')).toBeTruthy();
    expect(screen.getByText('Registra tu FUM')).toBeTruthy();
  });

  it('marca el embarazo a término en la semana 40', () => {
    render(<PrenatalRibbon week={40} />);
    expect(screen.getByText('A término')).toBeTruthy();
  });

  it('renderiza sin romper cuando recibe hitos (próxima cita)', () => {
    render(
      <PrenatalRibbon
        week={24}
        milestones={[{ week: 27, label: 'Próxima cita' }]}
        showCaption={false}
      />,
    );
    expect(screen.getByLabelText(/Semana 24 de 40/)).toBeTruthy();
  });
});
