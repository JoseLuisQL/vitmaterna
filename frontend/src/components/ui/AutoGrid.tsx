/**
 * AutoGrid — rejilla responsive y simétrica que se auto-ajusta al ancho.
 *
 * Calcula cuántas columnas caben según el ancho disponible y un ancho mínimo
 * por celda, y reparte el espacio de forma uniforme (todas las celdas del mismo
 * tamaño, gaps consistentes). Sirve para KPIs, accesos rápidos y tarjetas en
 * teléfonos pequeños, grandes y tablets/web sin estirar ni descuadrar.
 */
import React from 'react';
import { View, StyleSheet, ViewStyle, LayoutChangeEvent } from 'react-native';
import { spacing } from '../../theme/spacing';

interface AutoGridProps {
  children: React.ReactNode;
  /** Ancho mínimo deseado por celda (px). Default 150. */
  minColumnWidth?: number;
  /** Máximo de columnas permitido. Default 4. */
  maxColumns?: number;
  /** Separación entre celdas. Default spacing.sm2. */
  gap?: number;
  style?: ViewStyle;
}

export function AutoGrid({
  children,
  minColumnWidth = 150,
  maxColumns = 4,
  gap = spacing.sm2,
  style,
}: AutoGridProps): React.ReactElement {
  const [width, setWidth] = React.useState(0);
  const items = React.Children.toArray(children).filter(Boolean);

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  // Columnas que caben (al menos 1), acotado por maxColumns y nº de items.
  let columns = 1;
  if (width > 0) {
    columns = Math.max(1, Math.floor((width + gap) / (minColumnWidth + gap)));
    columns = Math.min(columns, maxColumns, Math.max(1, items.length));
  }
  const cellWidth = width > 0 ? (width - gap * (columns - 1)) / columns : undefined;

  return (
    <View style={[styles.grid, { gap }, style]} onLayout={onLayout}>
      {width > 0 &&
        items.map((child, i) => (
          <View key={i} style={{ width: cellWidth }}>
            {child}
          </View>
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
});

export default AutoGrid;
