import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react-native';
import { commonColors, semanticColors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';
import { shadows } from '../../theme/shadows';
import { zIndex } from '../../theme/zIndex';
import { useResponsive } from '../../theme/responsive';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastOptions {
  title: string;
  message?: string;
  type?: ToastType;
  durationMs?: number;
  /** Acción al tocar el toast (p. ej. abrir el chat de un mensaje nuevo). */
  onPress?: () => void;
}

interface ToastContextValue {
  showToast: (options: ToastOptions) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
  hideToast: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TOAST_STYLE: Record<ToastType, { color: string; bg: string; Icon: React.ComponentType<any> }> = {
  success: { color: semanticColors.success, bg: semanticColors.successLight, Icon: CheckCircle2 },
  error: { color: semanticColors.danger, bg: semanticColors.dangerLight, Icon: XCircle },
  warning: { color: semanticColors.warning, bg: semanticColors.warningLight, Icon: AlertTriangle },
  info: { color: semanticColors.info, bg: semanticColors.infoLight, Icon: Info },
};

export function ToastProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const { webShell } = useResponsive();
  const [toast, setToast] = useState<(ToastOptions & { id: number; type: ToastType }) | null>(null);
  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hideToast = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
    Animated.parallel([
      Animated.timing(translateY, { toValue: -120, duration: 180, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start(() => setToast(null));
  }, [opacity, translateY]);

  const showToast = useCallback((options: ToastOptions) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    const nextToast = { id: Date.now(), type: options.type ?? 'info', ...options } as ToastOptions & { id: number; type: ToastType };
    setToast(nextToast);
    Animated.parallel([
      Animated.timing(translateY, { toValue: 0, duration: 220, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();
    timeoutRef.current = setTimeout(hideToast, options.durationMs ?? 3800);
  }, [hideToast, opacity, translateY]);

  const value = useMemo<ToastContextValue>(() => ({
    showToast,
    hideToast,
    success: (title, message) => showToast({ title, message, type: 'success' }),
    error: (title, message) => showToast({ title, message, type: 'error', durationMs: 5200 }),
    warning: (title, message) => showToast({ title, message, type: 'warning', durationMs: 4800 }),
    info: (title, message) => showToast({ title, message, type: 'info' }),
  }), [hideToast, showToast]);

  const toastStyle = toast ? TOAST_STYLE[toast.type] : null;
  const Icon = toastStyle?.Icon;

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast && toastStyle && Icon && (
        <Animated.View style={[styles.wrap, webShell && styles.wrapWeb, { opacity, transform: [{ translateY }] }]} pointerEvents="box-none">
          <Pressable
            style={[styles.toast, shadows.modal]}
            accessibilityRole={toast.onPress ? 'button' : 'alert'}
            onPress={toast.onPress ? () => { const fn = toast.onPress; hideToast(); fn?.(); } : undefined}
            disabled={!toast.onPress}
          >
            <View style={[styles.iconWrap, { backgroundColor: toastStyle.bg }]}>
              <Icon size={20} color={toastStyle.color} />
            </View>
            <View style={styles.content}>
              <Text style={styles.title}>{toast.title}</Text>
              {toast.message ? <Text style={styles.message}>{toast.message}</Text> : null}
            </View>
            <Pressable onPress={hideToast} hitSlop={12} style={styles.closeBtn} accessibilityRole="button" accessibilityLabel="Cerrar notificación">
              <X size={18} color={commonColors.textSecondary} />
            </Pressable>
          </Pressable>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast debe usarse dentro de ToastProvider');
  return ctx;
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 54,
    left: spacing.md,
    right: spacing.md,
    zIndex: zIndex.toast,
  },
  // En el portal web el toast se ancla arriba-derecha con ancho fijo.
  wrapWeb: {
    top: spacing.lg,
    right: spacing.lg,
    left: undefined,
    width: 380,
    maxWidth: 380,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: commonColors.surface,
    borderWidth: 1,
    borderColor: commonColors.border,
    padding: spacing.md,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { flex: 1, gap: 2 },
  title: { ...typography.label, color: commonColors.text },
  message: { ...typography.bodySm, color: commonColors.textSecondary },
  closeBtn: { paddingTop: 2 },
});
