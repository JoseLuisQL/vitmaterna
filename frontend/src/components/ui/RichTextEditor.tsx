/**
 * VITMATERNA — RichTextEditor
 *
 * Editor de texto con BARRA DE FORMATO para el contenido educativo. En vez de
 * escribir los símbolos de Markdown a mano (`##`, `**`, `-` …), el usuario
 * selecciona texto y pulsa un botón (Negrita, Título, Lista, Cita…). El valor
 * que se guarda sigue siendo el mismo Markdown ligero que entiende `RichText`,
 * así que es 100% compatible con el contenido existente y con el render en la
 * app de la gestante (web + móvil, sin WebView).
 *
 * Integra con react-hook-form vía Controller (misma API que AppInput).
 */
import React, { useCallback, useRef, useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, Pressable, ViewStyle,
  NativeSyntheticEvent, TextInputSelectionChangeEventData,
} from 'react-native';
import { Bold, Heading, Heading2, List, ListOrdered, Quote, LucideIcon } from 'lucide-react-native';
import { Control, Controller, FieldValues, Path } from 'react-hook-form';
import { commonColors, semanticColors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { borderRadius, spacing } from '../../theme/spacing';

interface RichTextEditorProps<T extends FieldValues> {
  name: Path<T>;
  control: Control<T>;
  label: string;
  placeholder?: string;
  error?: string;
  themeColor?: string;
  containerStyle?: ViewStyle;
  /** Líneas visibles aproximadas (alto mínimo). */
  numberOfLines?: number;
}

type Selection = { start: number; end: number };

/** Acción de formato inline: envuelve la selección con marcadores (p. ej. **). */
function applyInline(text: string, sel: Selection, marker: string): { text: string; selection: Selection } {
  const { start, end } = sel;
  const selected = text.slice(start, end) || 'texto';
  const wrapped = `${marker}${selected}${marker}`;
  const next = text.slice(0, start) + wrapped + text.slice(end);
  // Selecciona el contenido interior (sin los marcadores) para seguir escribiendo.
  return { text: next, selection: { start: start + marker.length, end: start + marker.length + selected.length } };
}

/**
 * Acción de bloque por línea: antepone un prefijo (`## `, `- `, `> `…) a cada
 * línea tocada por la selección. Si ya tiene el prefijo, lo quita (toggle). En
 * listas numeradas renumera 1., 2., 3…
 */
function applyBlock(
  text: string,
  sel: Selection,
  kind: 'h2' | 'h3' | 'ul' | 'ol' | 'quote',
): { text: string; selection: Selection } {
  const lines = text.split('\n');

  // Localiza los índices de línea que abarca la selección.
  const lineStarts: number[] = [];
  let acc = 0;
  for (const ln of lines) { lineStarts.push(acc); acc += ln.length + 1; }
  const firstLine = lineStarts.findIndex((s, i) => sel.start < (lineStarts[i + 1] ?? Infinity));
  const lastLine = lineStarts.findIndex((s, i) => sel.end <= (lineStarts[i + 1] ?? Infinity));
  const from = firstLine < 0 ? 0 : firstLine;
  const to = lastLine < 0 ? lines.length - 1 : lastLine;

  const prefixFor = (n: number): string => {
    switch (kind) {
      case 'h2': return '## ';
      case 'h3': return '### ';
      case 'ul': return '- ';
      case 'ol': return `${n}. `;
      case 'quote': return '> ';
    }
  };
  // Detecta el prefijo actual (para quitar/cambiar) — incluye Markdown de otros bloques.
  const stripPrefix = (s: string): string => s.replace(/^(\s*)(#{1,3}\s+|[-*]\s+|\d+\.\s+|>\s+)/, '$1');

  // ¿Todas las líneas ya tienen este mismo prefijo? → toggle off.
  const reFor: RegExp =
    kind === 'h2' ? /^\s*##\s+/ :
    kind === 'h3' ? /^\s*###\s+/ :
    kind === 'ul' ? /^\s*[-*]\s+/ :
    kind === 'ol' ? /^\s*\d+\.\s+/ :
    /^\s*>\s+/;
  const allHave = lines.slice(from, to + 1).every((l) => l.trim() === '' || reFor.test(l));

  let counter = 1;
  for (let i = from; i <= to; i++) {
    if (lines[i].trim() === '') continue;
    const bare = stripPrefix(lines[i]);
    lines[i] = allHave ? bare : prefixFor(counter) + bare;
    counter++;
  }

  const nextText = lines.join('\n');
  // Selecciona el rango de las líneas afectadas.
  const newStarts: number[] = [];
  let acc2 = 0;
  for (const ln of lines) { newStarts.push(acc2); acc2 += ln.length + 1; }
  const selStart = newStarts[from] ?? 0;
  const selEnd = (newStarts[to] ?? 0) + lines[to].length;
  return { text: nextText, selection: { start: selStart, end: selEnd } };
}

export function RichTextEditor<T extends FieldValues>({
  name, control, label, placeholder, error,
  themeColor = commonColors.borderStrong, containerStyle, numberOfLines = 9,
}: RichTextEditorProps<T>): React.ReactElement {
  const inputRef = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);
  const selectionRef = useRef<Selection>({ start: 0, end: 0 });
  // Evita actualizaciones de estado tras desmontar (p. ej. al cerrar el modal).
  const mountedRef = useRef(true);
  React.useEffect(() => () => { mountedRef.current = false; }, []);
  // Selección controlada solo durante un instante tras aplicar formato, para
  // reposicionar el cursor; luego se libera para no pelear con el SO.
  const [controlledSel, setControlledSel] = useState<Selection | null>(null);

  const onSelectionChange = useCallback(
    (e: NativeSyntheticEvent<TextInputSelectionChangeEventData>) => {
      selectionRef.current = e.nativeEvent.selection;
    },
    [],
  );

  return (
    <Controller
      name={name}
      control={control}
      render={({ field: { onChange, value } }) => {
        const text = typeof value === 'string' ? value : '';

        const run = (fn: () => { text: string; selection: Selection }) => {
          const { text: next, selection } = fn();
          onChange(next);
          setControlledSel(selection);
          // Mantén el foco y libera la selección controlada en el siguiente tick.
          requestAnimationFrame(() => {
            if (!mountedRef.current) return;
            inputRef.current?.focus();
            setControlledSel(null);
            selectionRef.current = selection;
          });
        };

        const tools: { icon: LucideIcon; label: string; onPress: () => void }[] = [
          { icon: Bold, label: 'Negrita', onPress: () => run(() => applyInline(text, selectionRef.current, '**')) },
          { icon: Heading, label: 'Título', onPress: () => run(() => applyBlock(text, selectionRef.current, 'h2')) },
          { icon: Heading2, label: 'Subtítulo', onPress: () => run(() => applyBlock(text, selectionRef.current, 'h3')) },
          { icon: List, label: 'Lista', onPress: () => run(() => applyBlock(text, selectionRef.current, 'ul')) },
          { icon: ListOrdered, label: 'Lista numerada', onPress: () => run(() => applyBlock(text, selectionRef.current, 'ol')) },
          { icon: Quote, label: 'Cita', onPress: () => run(() => applyBlock(text, selectionRef.current, 'quote')) },
        ];

        return (
          <View style={[styles.container, containerStyle]}>
            <Text style={[styles.label, error && styles.labelError]}>{label}</Text>

            <View style={[styles.frame, { borderColor: error ? semanticColors.danger : focused ? themeColor : commonColors.border, borderWidth: focused ? 1.5 : 1 }]}>
              {/* Barra de formato */}
              <View style={styles.toolbar}>
                {tools.map((t, i) => (
                  <Pressable
                    key={t.label}
                    onPress={t.onPress}
                    style={({ pressed }) => [styles.toolBtn, pressed && styles.toolBtnPressed, i === 0 && styles.toolBtnFirst]}
                    accessibilityRole="button"
                    accessibilityLabel={t.label}
                    hitSlop={6}
                  >
                    <t.icon size={17} color={commonColors.textSecondary} />
                  </Pressable>
                ))}
              </View>

              {/* Área de edición */}
              <TextInput
                ref={inputRef}
                style={[styles.input, { minHeight: 22 * numberOfLines }]}
                value={text}
                onChangeText={onChange}
                onSelectionChange={onSelectionChange}
                {...(controlledSel ? { selection: controlledSel } : {})}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder={placeholder}
                placeholderTextColor={commonColors.textTertiary}
                multiline
                textAlignVertical="top"
                accessibilityLabel={label}
              />
            </View>

            {error && <Text style={styles.errorText}>{error}</Text>}
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: spacing.md },
  label: { ...typography.caption, fontWeight: '600', color: commonColors.textSecondary, marginBottom: spacing.xs2 + 4 },
  labelError: { color: semanticColors.danger },
  frame: { backgroundColor: commonColors.surface, borderRadius: borderRadius.md, overflow: 'hidden' },
  toolbar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: commonColors.surfaceAlt,
    borderBottomWidth: 1, borderBottomColor: commonColors.border,
    paddingHorizontal: spacing.xs, paddingVertical: spacing.xs,
    gap: 2,
  },
  toolBtn: { width: 34, height: 34, borderRadius: borderRadius.sm, alignItems: 'center', justifyContent: 'center' },
  toolBtnFirst: {},
  toolBtnPressed: { backgroundColor: commonColors.border },
  input: {
    ...typography.body, fontSize: 15, color: commonColors.text,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2, lineHeight: 22,
  },
  errorText: { ...typography.caption, color: semanticColors.danger, marginTop: 4 },
});
