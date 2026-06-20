/**
 * VITMATERNA — DataTable (tabla del portal web)
 *
 * Tabla densa y profesional para el entorno web de escritorio: cabecera fija,
 * orden por columna (opcional), filas clicables, estados de carga y vacío.
 * Usa exclusivamente los tokens del tema (color, espacio, tipografía), por lo
 * que mantiene la identidad visual de la app.
 *
 * Pensada para usarse SOLO bajo `webShell` (las pantallas conmutan entre esta
 * tabla en web y su lista de tarjetas en móvil). Es genérica en el tipo de fila.
 */
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { ChevronUp, ChevronDown, type LucideIcon } from 'lucide-react-native';
import { EmptyState } from '../ui/EmptyState';
import { commonColors } from '../../theme/colors';
import { useThemedColors } from '../../theme/ThemeContext';
import { typography } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';
import { IS_WEB } from '../../theme/responsive';

export interface DataTableColumn<T> {
  /** Clave única de la columna (también se usa para ordenar). */
  key: string;
  /** Texto de cabecera. */
  header: string;
  /** Render de la celda. */
  render: (row: T) => React.ReactNode;
  /** Ancho fijo (px). Si no se da, la columna usa flex. */
  width?: number;
  /** Peso flex cuando no hay width fijo. Default 1. */
  flex?: number;
  /** Alineación del contenido. Default 'left'. */
  align?: 'left' | 'center' | 'right';
  /** Si la columna permite ordenar, función que devuelve el valor comparable. */
  sortValue?: (row: T) => string | number;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  /** Acción al pulsar una fila. */
  onRowPress?: (row: T) => void;
  loading?: boolean;
  /** Estado vacío. */
  emptyIcon?: LucideIcon;
  emptyTitle?: string;
  emptyMessage?: string;
  emptyAccent?: string;
}

type SortDir = 'asc' | 'desc';

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  onRowPress,
  loading = false,
  emptyIcon,
  emptyTitle = 'Sin registros',
  emptyMessage,
  emptyAccent = commonColors.textSecondary,
}: DataTableProps<T>): React.ReactElement {
  const colors = useThemedColors();
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const sorted = useMemo(() => {
    if (!sortKey) return data;
    const col = columns.find((c) => c.key === sortKey);
    if (!col?.sortValue) return data;
    const arr = [...data].sort((a, b) => {
      const va = col.sortValue!(a);
      const vb = col.sortValue!(b);
      if (va < vb) return -1;
      if (va > vb) return 1;
      return 0;
    });
    return sortDir === 'asc' ? arr : arr.reverse();
  }, [data, sortKey, sortDir, columns]);

  const toggleSort = (col: DataTableColumn<T>) => {
    if (!col.sortValue) return;
    if (sortKey === col.key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(col.key);
      setSortDir('asc');
    }
  };

  const cellAlign = (align?: 'left' | 'center' | 'right') =>
    align === 'right' ? 'flex-end' : align === 'center' ? 'center' : 'flex-start';

  const colStyle = (col: DataTableColumn<T>) =>
    col.width ? { width: col.width } : { flex: col.flex ?? 1, minWidth: 0 };

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {/* Cabecera */}
      <View style={[
        styles.headerRow,
        { backgroundColor: colors.surfaceAlt, borderBottomColor: colors.border },
        IS_WEB && ({ position: 'sticky', top: 0, zIndex: 1 } as any)
      ]}>
        {columns.map((col) => {
          const active = sortKey === col.key;
          return (
            <Pressable
              key={col.key}
              onPress={() => toggleSort(col)}
              disabled={!col.sortValue}
              style={[
                styles.headerCell,
                colStyle(col),
                { justifyContent: cellAlign(col.align) },
                col.sortValue && IS_WEB && ({ cursor: 'pointer' } as any),
              ]}
            >
              <Text style={[styles.headerText, { color: colors.textSecondary }]} numberOfLines={1}>{col.header}</Text>
              {col.sortValue && active ? (
                sortDir === 'asc'
                  ? <ChevronUp size={14} color={colors.textSecondary} />
                  : <ChevronDown size={14} color={colors.textSecondary} />
              ) : null}
            </Pressable>
          );
        })}
      </View>

      {/* Cuerpo */}
      {loading ? (
        <View style={styles.stateWrap}>
          <ActivityIndicator color={emptyAccent} />
        </View>
      ) : sorted.length === 0 ? (
        <View style={styles.stateWrap}>
          <EmptyState icon={emptyIcon} title={emptyTitle} description={emptyMessage} themeColor={emptyAccent} />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator>
          {sorted.map((row, i) => {
            const RowComp: any = onRowPress ? Pressable : View;
            return (
              <RowComp
                key={keyExtractor(row)}
                onPress={onRowPress ? () => onRowPress(row) : undefined}
                style={({ pressed }: { pressed?: boolean }) => [
                  styles.row,
                  i > 0 && { borderTopWidth: 1, borderTopColor: colors.borderLight },
                  pressed && { backgroundColor: colors.surfaceAlt },
                  onRowPress && IS_WEB && ({ cursor: 'pointer', transition: 'background-color 0.2s' } as any),
                ]}
              >
                {columns.map((col) => (
                  <View key={col.key} style={[styles.cell, colStyle(col), { alignItems: cellAlign(col.align) }]}>
                    {typeof col.render(row) === 'string' || typeof col.render(row) === 'number' ? (
                      <Text style={[styles.cellText, { color: colors.text }]} numberOfLines={2}>{col.render(row) as React.ReactNode}</Text>
                    ) : (
                      col.render(row)
                    )}
                  </View>
                ))}
              </RowComp>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm2,
    gap: spacing.md,
  },
  headerCell: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  headerText: {
    ...typography.overline,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm2,
    gap: spacing.md,
  },
  rowBorder: { borderTopWidth: 1 },
  rowPressed: { },
  cell: { justifyContent: 'center' },
  cellText: { ...typography.bodySm },
  stateWrap: { padding: spacing.xl, alignItems: 'center', justifyContent: 'center', minHeight: 160 },
});

export default DataTable;
