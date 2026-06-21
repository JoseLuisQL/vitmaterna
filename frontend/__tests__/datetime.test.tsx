import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { CalendarPicker } from '../src/components/ui/CalendarPicker';
import { TimeWheel } from '../src/components/ui/TimeWheel';
import { DateTimeField } from '../src/components/ui/DateTimeField';
import { obstetraColors } from '../src/theme/colors';

describe('CalendarPicker', () => {
  it('renderiza el mes y permite seleccionar un día', () => {
    const onSelect = jest.fn();
    // Junio 2026 (mes con día 15 garantizado).
    render(
      <CalendarPicker value={new Date(2026, 5, 1)} onSelect={onSelect} accentColor={obstetraColors.primary} />,
    );
    expect(screen.getByText(/junio 2026/i)).toBeTruthy();
    fireEvent.press(screen.getByText('15'));
    expect(onSelect).toHaveBeenCalledTimes(1);
    const picked = onSelect.mock.calls[0][0] as Date;
    expect(picked.getDate()).toBe(15);
  });
});

describe('TimeWheel', () => {
  it('selecciona hora y minuto y emite HH:mm', () => {
    const onChange = jest.fn();
    render(<TimeWheel value={'08:00'} onChange={onChange} accentColor={obstetraColors.primary} minuteStep={15} />);
    // Hay dos "08" (hora) — tomamos el primero de la columna de horas.
    fireEvent.press(screen.getAllByText('09')[0]);
    expect(onChange).toHaveBeenCalledWith('09:00');
  });
});

describe('DateTimeField', () => {
  it('muestra el placeholder y abre el selector', () => {
    const onChange = jest.fn();
    render(
      <DateTimeField label="Fecha" mode="date" value="" onChange={onChange} placeholder="Seleccionar fecha" />,
    );
    expect(screen.getByText('Seleccionar fecha')).toBeTruthy();
    // El label de accesibilidad combina label + placeholder.
    fireEvent.press(screen.getByLabelText(/Fecha: Seleccionar fecha/i));
    // El overlay de selección aparece con su título.
    expect(screen.getByText('Selecciona la fecha')).toBeTruthy();
  });

  it('muestra el valor formateado de una fecha', () => {
    render(<DateTimeField label="Nacimiento" mode="date" value="1990-05-20" onChange={() => {}} />);
    // es-PE: incluye el día 20 y el mes mayo.
    expect(screen.getByText(/mayo/i)).toBeTruthy();
  });
});
