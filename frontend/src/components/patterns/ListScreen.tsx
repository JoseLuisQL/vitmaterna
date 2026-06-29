/**
 * VITMATERNA — ListScreen (patrón de pantalla de lista)
 *
 * Encapsula el patrón "tabla en web ↔ tarjetas en móvil" que hoy cada pantalla
 * de lista reimplementa (gestantes, citas, usuarios, contenido…). Une en un
 * solo componente: header (ScreenLayout), toolbar (búsqueda + filtros + acción
 * primaria), render dual automático según `webShell`, y los 4 estados
 * (cargando con skeleton 1:1, vacío con CTA, error con reintento, contenido).
 *
 * La pantalla solo aporta datos: `data`, `renderCard` (móvil), `columns` (web),
 * `filters` y la acción de crear. Pasa de ~500 líneas a ~120.
 */
import React from 'react';
import { View, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Plus, Search as SearchIcon, type LucideIcon } from 'lucide-react-native';
import { ScreenLayout, type ScreenRole } from '../layout/ScreenLayout';
import { DataTable, type DataTableColumn } from '../web/DataTable';
import { SearchField } from '../ui/Field';
import { AppButton } from '../ui/AppButton';
import { AppText } from '../ui/AppText';
import { EmptyState } from '../ui/EmptyState';
import { ListSkeleton, TableSkeleton } from '../ui/SkeletonLoader';
import { commonColors } from '../../theme/colors';
import { spacing, borderRadius, layout } from '../../theme/spacing';
import { useResponsive } from '../../theme/responsive';
import { IS_WEB } from '../../theme/responsive';
import { Pressable } from 'react-native';

export interface ListFilter<K extends string = string> {
  key: K;
  label: string;
}

interface ListScreenProps<T> {
  role: ScreenRole;
  title: string;
  subtitle?: string;
  accentColor: string;
  /** Muestra botón de retroceso en el header (pantallas de detalle/supervisión). */
  showBack?: boolean;
  onBack?: () => void;
  /** Ancho del contenido (default 'full'). */
  width?: 'readable' | 'wide' | 'full';

  /** Datos ya aplanados/listos para pintar. */
  data: T[];
  keyExtractor: (item: T) => string;

  /** Render de tarjeta para MÓVIL. */
  renderCard: (item: T) => React.ReactElement;
  /** Columnas para la tabla WEB. */
  columns: DataTableColumn<T>[];
  onRowPress?: (item: T) => void;

  /** Estados. */
  loading?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;

  /** Búsqueda (controlada por el padre). */
  search?: string;
  onSearchChange?: (v: string) => void;
  searchPlaceholder?: string;

  /** Filtros tipo chip. */
  filters?: ListFilter[];
  activeFilter?: string;
  onFilterChange?: (key: string) => void;

  /** Acción primaria (crear). */
  createLabel?: string;
  onCreate?: () => void;

  /** Scroll infinito. */
  onEndReached?: () => void;
  loadingMore?: boolean;

  /** Total real (del backend) para la línea de conteo. */
  totalCount?: number;

  /** Estado vacío. */
  emptyIcon?: LucideIcon;
  emptyTitle?: string;
  emptyMessage?: string;
}

export function ListScreen<T>({
  role,
  title,
  subtitle,
  accentColor,
  showBack = false,
  onBack,
  width = 'full',
  data,
  keyExtractor,
  renderCard,
  columns,
  onRowPress,
  loading = false,
  refreshing = false,
  onRefresh,
  search,
  onSearchChange,
  searchPlaceholder = 'Buscar…',
  filters,
  activeFilter,
  onFilterChange,
  createLabel,
  onCreate,
  onEndReached,
  loadingMore = false,
  totalCount,
  emptyIcon,
  emptyTitle = 'Sin resultados',
  emptyMessage,
}: ListScreenProps<T>): React.ReactElement {
  const { webShell } = useResponsive();

  const showSearch = Boolean(onSearchChange);
  const showFilters = Boolean(filters && filters.length);

  const Toolbar = (showSearch || showFilters || onCreate) ? (
    <View style={[styles.toolbar, webShell && styles.toolbarWeb]}>
      {showSearch ? (
        <SearchField
          value={search ?? ''}
          onChangeText={onSearchChange!}
          placeholder={searchPlaceholder}
          containerStyle={styles.search}
        />
      ) : null}
      {showFilters ? (
        <View style={styles.filters}>
          {filters!.map((f) => {
            const active = activeFilter === f.key;
            return (
              <Pressable
                key={f.key}
                onPress={() => onFilterChange?.(f.key)}
                style={[
                  styles.chip,
                  active && { backgroundColor: accentColor, borderColor: accentColor },
                  IS_WEB && ({ cursor: 'pointer' } as any),
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={f.label}
              >
                <AppText variant="caption" color={active ? commonColors.white : commonColors.textSecondary} style={styles.chipText}>
                  {f.label}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      ) : null}
      {onCreate ? (
        <AppButton
          title={createLabel ?? 'Nuevo'}
          onPress={onCreate}
          icon={Plus}
          size="sm"
          themeColor={accentColor}
          style={styles.createBtn}
        />
      ) : null}
    </View>
  ) : null;

  // ── WEB: tabla densa ──
  if (webShell) {
    return (
      <ScreenLayout role={role} title={title} subtitle={subtitle} showBack={showBack} onBack={onBack} width={width} accentColor={accentColor} scroll={false}>
        {Toolbar}
        {loading ? (
          <TableSkeleton rows={8} cols={columns.length} />
        ) : (
          <DataTable
            columns={columns}
            data={data}
            keyExtractor={keyExtractor}
            onRowPress={onRowPress}
            emptyIcon={emptyIcon}
            emptyTitle={emptyTitle}
            emptyMessage={emptyMessage}
            emptyAccent={accentColor}
          />
        )}
      </ScreenLayout>
    );
  }

  // ── MÓVIL: lista de tarjetas ──
  return (
    <ScreenLayout role={role} title={title} subtitle={subtitle} accentColor={accentColor} scroll={false} noPadding>
      <View style={styles.mobileToolbar}>{Toolbar}</View>
      {loading ? (
        <View style={styles.mobilePad}>
          <ListSkeleton count={6} />
        </View>
      ) : data.length === 0 ? (
        <EmptyState icon={emptyIcon} title={emptyTitle} description={emptyMessage} themeColor={accentColor} style={{ flex: 1 }} />
      ) : (
        <FlashList
          data={data}
          keyExtractor={keyExtractor}
          renderItem={({ item }) => renderCard(item)}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            totalCount != null ? (
              <AppText variant="caption" color={commonColors.textSecondary} style={styles.count}>
                {totalCount} resultado(s)
              </AppText>
            ) : null
          }
          refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} /> : undefined}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.4}
          ListFooterComponent={loadingMore ? <ActivityIndicator size="small" color={accentColor} style={{ marginVertical: spacing.lg }} /> : null}
        />
      )}
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap', marginBottom: spacing.md },
  toolbarWeb: { marginBottom: spacing.md },
  mobileToolbar: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  mobilePad: { paddingHorizontal: spacing.lg },
  search: { flex: 1, minWidth: 200 },
  filters: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: commonColors.surface,
    borderWidth: 1,
    borderColor: commonColors.border,
  },
  chipText: { fontWeight: '600' },
  createBtn: { },
  listContent: { paddingHorizontal: spacing.lg, paddingBottom: layout.tabBarSpace },
  count: { marginBottom: spacing.sm },
});

export default ListScreen;
