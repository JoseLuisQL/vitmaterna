/**
 * VITMATERNA — RichText
 * Renderiza contenido educativo con formato ligero tipo Markdown, sin depender
 * de WebView ni HTML (más mantenible y consistente con el design system):
 *   ## Título de sección       → encabezado
 *   ### Subtítulo              → subencabezado
 *   - elemento  /  * elemento  → lista con viñeta
 *   1. elemento                → lista numerada
 *   > cita                     → bloque destacado
 *   **negrita**                → texto en negrita (inline)
 *   (línea en blanco)          → separa párrafos
 */
import React from 'react';
import { View, Text, StyleSheet, TextStyle } from 'react-native';
import { commonColors, obstetraColors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';

interface RichTextProps {
  content: string;
  /** Color de acento para encabezados y viñetas. */
  accentColor?: string;
  /** Estilo del texto base (color/tamaño del cuerpo). */
  baseStyle?: TextStyle;
}

/** Divide una línea en segmentos para resaltar **negritas** inline. */
function renderInline(text: string, keyPrefix: string, baseStyle?: TextStyle): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return parts.map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**')) {
      return (
        <Text key={`${keyPrefix}-b${i}`} style={[baseStyle, styles.bold]}>
          {p.slice(2, -2)}
        </Text>
      );
    }
    return <Text key={`${keyPrefix}-t${i}`} style={baseStyle}>{p}</Text>;
  });
}

export function RichText({ content, accentColor = obstetraColors.primary, baseStyle }: RichTextProps): React.ReactElement {
  const lines = (content || '').replace(/\r\n/g, '\n').split('\n');
  const blocks: React.ReactNode[] = [];
  let paragraph: string[] = [];

  const flushParagraph = (key: string) => {
    if (paragraph.length === 0) return;
    const text = paragraph.join(' ').trim();
    paragraph = [];
    if (!text) return;
    blocks.push(
      <Text key={key} style={[styles.paragraph, baseStyle]}>
        {renderInline(text, key, [styles.paragraph, baseStyle] as any)}
      </Text>,
    );
  };

  lines.forEach((rawLine, idx) => {
    const line = rawLine.trim();
    const key = `b${idx}`;

    if (!line) { flushParagraph(`${key}-p`); return; }

    if (line.startsWith('### ')) {
      flushParagraph(`${key}-p`);
      blocks.push(<Text key={key} style={[styles.h3, { color: accentColor }]}>{line.slice(4)}</Text>);
      return;
    }
    if (line.startsWith('## ')) {
      flushParagraph(`${key}-p`);
      blocks.push(<Text key={key} style={[styles.h2, { color: accentColor }]}>{line.slice(3)}</Text>);
      return;
    }
    if (line.startsWith('# ')) {
      flushParagraph(`${key}-p`);
      blocks.push(<Text key={key} style={[styles.h2, { color: accentColor }]}>{line.slice(2)}</Text>);
      return;
    }
    if (line.startsWith('> ')) {
      flushParagraph(`${key}-p`);
      blocks.push(
        <View key={key} style={[styles.quote, { borderLeftColor: accentColor }]}>
          <Text style={[styles.quoteText, baseStyle]}>{renderInline(line.slice(2), key, [styles.quoteText, baseStyle] as any)}</Text>
        </View>,
      );
      return;
    }
    // Listas con viñeta
    if (/^[-*]\s+/.test(line)) {
      flushParagraph(`${key}-p`);
      blocks.push(
        <View key={key} style={styles.listItem}>
          <View style={[styles.bullet, { backgroundColor: accentColor }]} />
          <Text style={[styles.listText, baseStyle]}>{renderInline(line.replace(/^[-*]\s+/, ''), key, [styles.listText, baseStyle] as any)}</Text>
        </View>,
      );
      return;
    }
    // Listas numeradas
    const numMatch = line.match(/^(\d+)\.\s+(.*)$/);
    if (numMatch) {
      flushParagraph(`${key}-p`);
      blocks.push(
        <View key={key} style={styles.listItem}>
          <Text style={[styles.listNum, { color: accentColor }]}>{numMatch[1]}.</Text>
          <Text style={[styles.listText, baseStyle]}>{renderInline(numMatch[2], key, [styles.listText, baseStyle] as any)}</Text>
        </View>,
      );
      return;
    }

    paragraph.push(line);
  });
  flushParagraph('b-final-p');

  return <View>{blocks}</View>;
}

const styles = StyleSheet.create({
  paragraph: { ...typography.body, color: commonColors.text, lineHeight: 23, marginBottom: spacing.sm2 },
  bold: { fontWeight: '700' },
  h2: { ...typography.h3, marginTop: spacing.md, marginBottom: spacing.sm },
  h3: { ...typography.bodyMedium, fontWeight: '700', marginTop: spacing.sm2, marginBottom: spacing.xs },
  quote: {
    borderLeftWidth: 3,
    paddingLeft: spacing.md,
    paddingVertical: spacing.xs,
    marginBottom: spacing.sm2,
  },
  quoteText: { ...typography.body, color: commonColors.textSecondary, fontStyle: 'italic', lineHeight: 22 },
  listItem: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginBottom: spacing.xs2 + 4 },
  bullet: { width: 6, height: 6, borderRadius: 3, marginTop: 8 },
  listNum: { ...typography.body, fontWeight: '700', marginTop: 0 },
  listText: { ...typography.body, color: commonColors.text, lineHeight: 23, flex: 1 },
});
