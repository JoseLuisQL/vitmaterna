/**
 * VITMATERNA — ConfirmHost
 *
 * Host global de confirmaciones/validaciones. Se monta una vez en el árbol raíz
 * y escucha solicitudes emitidas por `confirm.ts` (confirmAction / notifyModal).
 * Así `confirmAction()` muestra SIEMPRE el modal propio (ConfirmDialog),
 * consistente en web y nativo, en vez de window.confirm / Alert.alert.
 */
import React, { useEffect, useState, useCallback } from 'react';
import { ConfirmDialog, ValidationModal, type ConfirmTone } from './ConfirmDialog';
import { _registerConfirmHost, type ConfirmRequest } from '../../utils/confirm';

interface ActiveConfirm extends ConfirmRequest {
  resolve: (v: boolean) => void;
}

export function ConfirmHost(): React.ReactElement {
  const [active, setActive] = useState<ActiveConfirm | null>(null);
  const [info, setInfo] = useState<{ title: string; message?: string } | null>(null);

  useEffect(() => {
    _registerConfirmHost({
      confirm: (req) =>
        new Promise<boolean>((resolve) => {
          setActive({ ...req, resolve });
        }),
      notify: (title, message) => setInfo({ title, message }),
    });
  }, []);

  const handleConfirm = useCallback(() => {
    active?.resolve(true);
    setActive(null);
  }, [active]);

  const handleCancel = useCallback(() => {
    active?.resolve(false);
    setActive(null);
  }, [active]);

  return (
    <>
      {active && (
        <ConfirmDialog
          visible
          title={active.title}
          message={active.message}
          confirmText={active.confirmText}
          cancelText={active.cancelText}
          tone={(active.destructive ? 'danger' : active.tone) as ConfirmTone}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
      {info && (
        <ValidationModal
          visible
          title={info.title}
          errors={info.message ? [info.message] : []}
          onClose={() => setInfo(null)}
        />
      )}
    </>
  );
}

export default ConfirmHost;
