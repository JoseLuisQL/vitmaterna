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
    expect(screen.getByText(/junio/i)).toBeTruthy();
    expect(screen.getByText('2026')).toBeTruthy();
    fireEvent.press(screen.getByText('15'));
    expect(onSelect).toHaveBeenCalledTimes(1);
    const picked = onSelect.mock.calls[0][0] as Date;
    expect(picked.getDate()).toBe(15);
  });
});

describe('TimeWheel', () => {
  it('despliega la rueda de Hora solo al tocar y permite elegir un número', () => {
    const onChange = jest.fn();
    render(<TimeWheel value={'08:00'} onChange={onChange} accentColor={obstetraColors.primary} minuteStep={15} presets={[]} />);
    // Colapsado: muestra la pista y aún no hay rueda.
    expect(screen.getByText(/Toca «Hora» o «Minuto»/i)).toBeTruthy();
    // Tocar la caja "Hora" abre su rueda.
    fireEvent.press(screen.getByLabelText(/Hora: 08/i));
    // Elegir 09 emite 09:00 (toma el primero de las filas repetidas/cíclicas).
    fireEvent.press(screen.getAllByText('09')[0]);
    expect(onChange).toHaveBeenCalledWith('09:00');
  });

  it('aplica un atajo de hora frecuente (preset)', () => {
    const onChange = jest.fn();
    render(<TimeWheel value={null} onChange={onChange} accentColor={obstetraColors.primary} presets={['06:00', '20:00']} />);
    fireEvent.press(screen.getByText('20:00'));
    expect(onChange).toHaveBeenCalledWith('20:00');
  });

  it('al desplazar, selecciona el número que queda en el centro del marcador', () => {
    const onChange = jest.fn();
    render(<TimeWheel value={'08:00'} onChange={onChange} accentColor={obstetraColors.primary} presets={[]} />);
    fireEvent.press(screen.getByLabelText(/Hora: 08/i));
    const sv = screen.getByTestId('timewheel-scroll');
    // Posición inicial centrada en 08 → y = (MID*24 + 8 - CENTER)*44.
    // ROW_HEIGHT=44, CENTER=2, MID=5, base=24 → baseY = (120+8-2)*44 = 5544.
    // Desplazar 3 filas hacia abajo (3*44) centra el 11.
    fireEvent.scroll(sv, { nativeEvent: { contentOffset: { y: 5544 + 44 * 3 } } });
    expect(onChange).toHaveBeenLastCalledWith('11:00');
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
