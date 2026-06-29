/**
 * Seccion — título de sección (overline) para agrupar bloques de la ficha.
 * Componente presentacional puro extraído del monolito (Fase 3).
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { commonColors } from '../../../theme/colors';
import { typography } from '../../../theme/typography';

export function Seccion({ titulo }: { titulo: string }): React.ReactElement {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{titulo}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 20, marginBottom: 6, paddingHorizontal: 16 },
  title: {
    ...typography.overline,
    color: commonColors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
});

export default Seccion;
