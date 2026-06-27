import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { useForm } from 'react-hook-form';
import { RichTextEditor } from '../src/components/ui/RichTextEditor';

/**
 * Monta el editor dentro de un formulario y expone el valor actual para
 * verificar el Markdown que producen los botones de la barra de formato.
 */
function Harness({ initial = '' }: { initial?: string }): React.ReactElement {
  const { control, watch } = useForm<{ contenido: string }>({ defaultValues: { contenido: initial } });
  const value = watch('contenido');
  return (
    <>
      <RichTextEditor name="contenido" control={control} label="Contenido" />
      {/* Espejo del valor para aserciones */}
      <MirrorText value={value} />
    </>
  );
}

// Componente auxiliar para exponer el valor como testID.
import { Text } from 'react-native';
function MirrorText({ value }: { value: string }): React.ReactElement {
  return <Text testID="mirror">{value}</Text>;
}

/** Simula seleccionar un rango en el TextInput del editor. */
function selectRange(input: any, start: number, end: number): void {
  fireEvent(input, 'selectionChange', { nativeEvent: { selection: { start, end } } });
}

describe('RichTextEditor', () => {
  it('renderiza la barra de formato con todos los botones', () => {
    render(<Harness />);
    expect(screen.getByLabelText('Negrita')).toBeTruthy();
    expect(screen.getByLabelText('Título')).toBeTruthy();
    expect(screen.getByLabelText('Subtítulo')).toBeTruthy();
    expect(screen.getByLabelText('Lista')).toBeTruthy();
    expect(screen.getByLabelText('Lista numerada')).toBeTruthy();
    expect(screen.getByLabelText('Cita')).toBeTruthy();
  });

  it('negrita envuelve la selección con **', () => {
    render(<Harness initial="hola mundo" />);
    const input = screen.getByLabelText('Contenido');
    selectRange(input, 5, 10); // "mundo"
    fireEvent.press(screen.getByLabelText('Negrita'));
    expect(screen.getByTestId('mirror').props.children).toBe('hola **mundo**');
  });

  it('título antepone "## " a la línea', () => {
    render(<Harness initial="Sección" />);
    const input = screen.getByLabelText('Contenido');
    selectRange(input, 0, 0);
    fireEvent.press(screen.getByLabelText('Título'));
    expect(screen.getByTestId('mirror').props.children).toBe('## Sección');
  });

  it('lista numera 1. 2. 3. en varias líneas', () => {
    render(<Harness initial={'uno\ndos\ntres'} />);
    const input = screen.getByLabelText('Contenido');
    selectRange(input, 0, 11); // abarca las 3 líneas
    fireEvent.press(screen.getByLabelText('Lista numerada'));
    expect(screen.getByTestId('mirror').props.children).toBe('1. uno\n2. dos\n3. tres');
  });

  it('cita antepone "> " y es toggle (quitar al repetir)', () => {
    render(<Harness initial="importante" />);
    const input = screen.getByLabelText('Contenido');
    selectRange(input, 0, 0);
    fireEvent.press(screen.getByLabelText('Cita'));
    expect(screen.getByTestId('mirror').props.children).toBe('> importante');
    // repetir → quita el prefijo
    selectRange(input, 0, 0);
    fireEvent.press(screen.getByLabelText('Cita'));
    expect(screen.getByTestId('mirror').props.children).toBe('importante');
  });

  it('viñeta reemplaza el prefijo de una línea ya formateada como cita', () => {
    render(<Harness initial="> nota" />);
    const input = screen.getByLabelText('Contenido');
    selectRange(input, 0, 0);
    fireEvent.press(screen.getByLabelText('Lista'));
    expect(screen.getByTestId('mirror').props.children).toBe('- nota');
  });
});
