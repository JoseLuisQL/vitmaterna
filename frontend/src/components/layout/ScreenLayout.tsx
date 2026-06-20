/**
 * VITMATERNA — ScreenLayout (plantilla ÚNICA de pantalla)
 *
 * Unifica la estructura de TODAS las vistas para lograr un diseño continuo,
 * responsive y de carga fluida:
 *   - Header con gradiente por rol (o plano), título/subtítulo, back y acciones.
 *   - Cuerpo responsive: limita el ancho de contenido en tablet/web y centra,
 *     en móvil ocupa todo el ancho. Padding por breakpoint.
 *   - Estados estándar: loading (skeleton) / empty / error, sin que cada
 *     pantalla los reimplemente.
 *   - Safe-area correcta y espacio inferior para el tab bar flotante.
 *
 * Es aditivo: las pantallas existentes siguen funcionando; se migran a esta
 * plantilla progresivamente para que todo comparta el mismo "molde".
 */
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  RefreshControl,
  TouchableOpacity,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, type LucideIcon, AlertTriangle } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { EmptyState } from '../ui/EmptyState';
import { DashboardSkeleton } from '../ui/SkeletonLoader';
import { commonColors, semanticColors } from '../../theme/colors';
import { gradients, type GradientConfig } from '../../theme/gradients';
import { typography } from '../../theme/typography';
import { spacing, borderRadius, layout, webLayout } from '../../theme/spacing';
import { useResponsive } from '../../theme/responsive';

export type ScreenRole = 'gestante' | 'obstetra' | 'admin' | 'neutral';

const ROLE_GRADIENT: Record<Exclude<ScreenRole, 'neutral'>, GradientConfig> = {
  gestante: gradients.gestante,
  obstetra: gradients.obstetra,
  admin: gradients.admin,
};

export interface ScreenAction {
  /** Render libre de un elemento de acción (botón, campana, etc.). */
  node: React.ReactNode;
}

interface ScreenLayoutProps {
  /** Rol → define el gradiente del header. 'neutral' = sin gradiente. */
  role?: ScreenRole;
  title?: string;
  subtitle?: string;
  /** Muestra botón de retroceso en el header. */
  showBack?: boolean;
  onBack?: () => void;
  /** Acciones a la derecha del header (campana, exportar, etc.). */
  actions?: React.ReactNode;
  /** Contenido principal. */
  children?: React.ReactNode;

  /** Estados estándar. */
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
  errorTitle?: string;
  errorMessage?: string;

  /** Empty state (cuando no hay datos y no hay error). */
  isEmpty?: boolean;
  emptyIcon?: LucideIcon;
  emptyTitle?: string;
  emptyMessage?: string;

  /** Scroll del cuerpo (default true). Si es false, children controla scroll. */
  scroll?: boolean;
  /** Pull-to-refresh. */
  refreshing?: boolean;
  onRefresh?: () => void;
  /** Color de acento (spinner refresh, reintentar). */
  accentColor?: string;
  /** Estilo extra del contenedor de contenido. */
  contentStyle?: ViewStyle;
  /** Quitar el padding horizontal del cuerpo (para listas full-bleed). */
  noPadding?: boolean;
  /**
   * Ancho del área de contenido (solo afecta a web/tablet anchos):
   *   - 'readable' (default): columna estrecha centrada para lectura/formularios
   *     (≈760–900px). Igual que el comportamiento histórico.
   *   - 'wide': aprovecha el ancho del portal (1024/1280/1440 según breakpoint).
   *     Para dashboards y grids de tarjetas.
   *   - 'full': ocupa el 100% del área disponible. Para tablas y vistas densas.
   * En móvil no tiene efecto (siempre full-bleed).
   */
  width?: 'readable' | 'wide' | 'full';
}

export function ScreenLayout({
  role = 'neutral',
  title,
  subtitle,
  showBack = false,
  onBack,
  actions,
  children,
  loading = false,
  error = false,
  onRetry,
  errorTitle = 'No se pudo cargar',
  errorMessage = 'Ocurrió un problema al obtener la información. Verifica tu conexión e inténtalo de nuevo.',
  isEmpty = false,
  emptyIcon,
  emptyTitle = 'Sin información',
  emptyMessage,
  scroll = true,
  refreshing = false,
  onRefresh,
  accentColor = commonColors.text,
  contentStyle,
  noPadding = false,
  width = 'readable',
}: ScreenLayoutProps): React.ReactElement {
  const router = useRouter();
  const { select, isWide, webShell } = useResponsive();

  // En el portal web el header del rol ya no necesita el gradiente gigante
  // redondeado (esa estética es móvil): el color de rol vive en el sidebar y
  // topbar. Mostramos un header plano y compacto. En móvil se conserva igual.
  const hasGradient = role !== 'neutral' && !webShell;
  const gradient = hasGradient ? ROLE_GRADIENT[role as Exclude<ScreenRole, 'neutral'>] : null;

  // Padding horizontal por breakpoint; en el portal web usamos el gutter del
  // contenido (más generoso). Ancho máximo según el modo `width`.
  const hPad = noPadding
    ? 0
    : webShell
      ? select({ base: spacing.lg, lg: webLayout.contentGutter.lg, xl: webLayout.contentGutter.xl, xxl: webLayout.contentGutter.xxl })
      : select({ base: spacing.lg, lg: spacing.xl });

  // Ancho máximo del contenido. 'readable' = histórico; 'wide' = ancho del
  // portal; 'full' = sin límite. En móvil siempre full-bleed.
  const maxWidth =
    width === 'full'
      ? 9999
      : width === 'wide'
        ? select({ base: 9999, lg: webLayout.contentMaxWidth.lg, xl: webLayout.contentMaxWidth.xl, xxl: webLayout.contentMaxWidth.xxl })
        : select({ base: 9999, lg: 760, xl: 900 });

  // En el portal web no hay barra inferior flotante → no reservamos su espacio.
  const bottomSpace = webShell ? spacing.xl : layout.tabBarSpace;

  const handleBack = () => {
    if (onBack) return onBack();
    if (router.canGoBack()) router.back();
  };

  const Header = (
    <>
      <StatusBar barStyle={hasGradient ? 'light-content' : 'dark-content'} translucent backgroundColor="transparent" />
      {hasGradient && gradient ? (
        <LinearGradient colors={gradient.colors} start={gradient.start} end={gradient.end} style={styles.headerGradient}>
          <SafeAreaView edges={['top']} style={styles.headerSafe}>
            <HeaderRow
              title={title}
              subtitle={subtitle}
              showBack={webShell ? false : showBack}
              onBack={handleBack}
              actions={actions}
              onLight
            />
          </SafeAreaView>
        </LinearGradient>
      ) : (
        <SafeAreaView edges={['top']} style={[styles.headerFlatSafe, webShell && { backgroundColor: commonColors.surface, paddingHorizontal: hPad }]}>
          <View style={isWide ? [styles.centered, { maxWidth }] : undefined}>
            <HeaderRow
              title={title}
              subtitle={subtitle}
              showBack={webShell ? false : showBack}
              onBack={handleBack}
              actions={actions}
            />
          </View>
        </SafeAreaView>
      )}
    </>
  );

  // Cuerpo según estado.
  let body: React.ReactNode;
  if (loading) {
    body = (
      <View style={[styles.stateWrap, { paddingHorizontal: hPad }]}>
        <DashboardSkeleton count={3} />
      </View>
    );
  } else if (error) {
    body = (
      <View style={styles.centerState}>
        <View style={styles.errorIcon}>
          <AlertTriangle size={44} color={semanticColors.danger} />
        </View>
        <Text style={styles.errorTitle}>{errorTitle}</Text>
        <Text style={styles.errorMessage}>{errorMessage}</Text>
        {onRetry && (
          <TouchableOpacity
            style={[styles.retryBtn, { backgroundColor: accentColor }]}
            onPress={onRetry}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Reintentar"
          >
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  } else if (isEmpty) {
    body = (
      <EmptyState
        icon={emptyIcon}
        title={emptyTitle}
        description={emptyMessage}
        themeColor={accentColor}
        style={{ flex: 1 }}
      />
    );
  } else if (scroll) {
    body = (
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          { paddingHorizontal: hPad, paddingBottom: bottomSpace, paddingTop: spacing.lg },
          contentStyle,
        ]}
        refreshControl={
          onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} /> : undefined
        }
      >
        <View style={isWide ? [styles.centered, { maxWidth }] : undefined}>{children}</View>
      </ScrollView>
    );
  } else {
    body = (
      <View style={[styles.flex, { paddingHorizontal: hPad }, contentStyle]}>
        <View style={isWide ? [styles.flex, styles.centered, { maxWidth }] : styles.flex}>{children}</View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {Header}
      <View style={styles.bodyWrap}>{body}</View>
    </View>
  );
}

interface HeaderRowProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  actions?: React.ReactNode;
  onLight?: boolean;
}

function HeaderRow({ title, subtitle, showBack, onBack, actions, onLight }: HeaderRowProps): React.ReactElement {
  const titleColor = onLight ? commonColors.white : commonColors.text;
  const subColor = onLight ? 'rgba(255,255,255,0.85)' : commonColors.textSecondary;
  return (
    <View style={styles.headerRow}>
      {showBack && (
        <TouchableOpacity
          onPress={onBack}
          style={[styles.backBtn, onLight ? styles.backBtnLight : styles.backBtnDark]}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel="Volver"
        >
          <ArrowLeft size={22} color={onLight ? commonColors.white : commonColors.text} />
        </TouchableOpacity>
      )}
      <View style={styles.headerTexts}>
        {title ? (
          <Text style={[styles.title, { color: titleColor }]} numberOfLines={1}>
            {title}
          </Text>
        ) : null}
        {subtitle ? (
          <Text style={[styles.subtitle, { color: subColor }]} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {actions ? <View style={styles.headerActions}>{actions}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: commonColors.background },
  flex: { flex: 1 },
  bodyWrap: { flex: 1 },
  centered: { width: '100%', alignSelf: 'center', marginHorizontal: 'auto' },

  headerGradient: {
    paddingBottom: spacing.xl,
    borderBottomLeftRadius: borderRadius.xxl,
    borderBottomRightRadius: borderRadius.xxl,
  },
  headerSafe: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  headerFlatSafe: { paddingTop: spacing.md, paddingBottom: spacing.sm, paddingHorizontal: spacing.lg },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headerTexts: { flex: 1, minWidth: 0 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexShrink: 0 },
  title: { ...typography.h1 },
  subtitle: { ...typography.bodySm, marginTop: 2 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20 },
  backBtnLight: { backgroundColor: 'rgba(255,255,255,0.18)' },
  backBtnDark: { backgroundColor: commonColors.surfaceAlt },

  stateWrap: { flex: 1, paddingTop: spacing.lg },
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: spacing.md },
  errorIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: semanticColors.dangerLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  errorTitle: { ...typography.h3, color: commonColors.text, textAlign: 'center' },
  errorMessage: { ...typography.bodySmall, color: commonColors.textSecondary, textAlign: 'center', lineHeight: 22 },
  retryBtn: { borderRadius: borderRadius.full, paddingHorizontal: 32, paddingVertical: 14, marginTop: spacing.sm },
  retryText: { ...typography.button, color: commonColors.white },
});

export default ScreenLayout;
