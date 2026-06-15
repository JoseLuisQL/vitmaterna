import React from 'react';
import { render, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { EmergencyAlert } from '../src/components/shared/EmergencyAlert';
import { ConfirmDialog, ValidationModal } from '../src/components/ui/ConfirmDialog';

describe('EmergencyAlert', () => {
  it('muestra la cabecera y el mensaje de confirmación', () => {
    render(<EmergencyAlert visible onClose={() => {}} onSend={async () => {}} />);
    expect(screen.getByText('Alerta de emergencia')).toBeTruthy();
    expect(screen.getByText('Enviar ahora')).toBeTruthy();
    expect(screen.getByText('Cancelar')).toBeTruthy();
  });

  it('cancelar invoca onClose', () => {
    const onClose = jest.fn();
    render(<EmergencyAlert visible onClose={onClose} onSend={async () => {}} />);
    fireEvent.press(screen.getByText('Cancelar'));
    expect(onClose).toHaveBeenCalled();
  });

  it('al enviar llama onSend con coordenadas y muestra éxito', async () => {
    const onSend = jest.fn().mockResolvedValue(undefined);
    render(<EmergencyAlert visible onClose={() => {}} onSend={onSend} />);
    fireEvent.press(screen.getByText('Enviar ahora'));
    await waitFor(() => expect(onSend).toHaveBeenCalled());
    const coords = onSend.mock.calls[0][0];
    expect(typeof coords.latitude).toBe('number');
    expect(typeof coords.longitude).toBe('number');
    await waitFor(() => expect(screen.getByText('Alerta enviada')).toBeTruthy());
  });

  it('si onSend falla, muestra estado de error con reintento', async () => {
    const onSend = jest.fn().mockRejectedValue(new Error('network'));
    render(<EmergencyAlert visible onClose={() => {}} onSend={onSend} />);
    fireEvent.press(screen.getByText('Enviar ahora'));
    await waitFor(() => expect(screen.getByText('No se pudo enviar')).toBeTruthy());
    expect(screen.getByText('Reintentar')).toBeTruthy();
  });

  it('no renderiza contenido cuando visible=false', () => {
    render(<EmergencyAlert visible={false} onClose={() => {}} onSend={async () => {}} />);
    expect(screen.queryByText('Alerta de emergencia')).toBeNull();
  });
});

describe('ConfirmDialog', () => {
  it('muestra título y mensaje, y dispara onConfirm/onCancel', () => {
    const onConfirm = jest.fn();
    const onCancel = jest.fn();
    render(
      <ConfirmDialog
        visible
        title="Cerrar sesión"
        message="¿Seguro que deseas salir?"
        confirmText="Salir"
        cancelText="Cancelar"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );
    expect(screen.getByText('Cerrar sesión')).toBeTruthy();
    expect(screen.getByText('¿Seguro que deseas salir?')).toBeTruthy();
    fireEvent.press(screen.getByText('Salir'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    fireEvent.press(screen.getByText('Cancelar'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});

describe('ValidationModal', () => {
  it('lista los errores y cierra', () => {
    const onClose = jest.fn();
    render(
      <ValidationModal
        visible
        errors={['El DNI debe tener 8 dígitos', 'El teléfono es obligatorio']}
        onClose={onClose}
      />,
    );
    expect(screen.getByText('El DNI debe tener 8 dígitos')).toBeTruthy();
    expect(screen.getByText('El teléfono es obligatorio')).toBeTruthy();
    fireEvent.press(screen.getByText('Entendido'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
