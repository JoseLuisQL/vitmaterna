/**
 * VITMATERNA - Educación (gestante)
 *
 * Biblioteca de contenidos tipo app del mercado, minimalista:
 *  - Buscador por título/contenido.
 *  - Filtros por categoría (chips horizontales).
 *  - Pestañas: Para ti (trimestre actual) · Biblioteca (todo) · Favoritos.
 *  - Tarjetas con categoría, tipo, tiempo de lectura e indicador de leído.
 *  - Acceso al detalle del artículo y a herramientas (Calcular EG, Signos de alarma).
 */
import React, { useMemo, useState } from 'react';
import {
  View, StyleSheet, Text, ScrollView, TouchableOpacity, Pressable,
  Linking, StatusBar, Image, Platform,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  AlertTriangle, Calculator, Phone, ArrowLeft, Heart, Clock,
  ChevronRight, CheckCircle2, BookOpen, Sparkles,
} from 'lucide-react-native';
import { gestanteColors, commonColors, semanticColors } from '../../../src/theme/colors';
import { typography } from '../../../src/theme/typography';
import { spacing, borderRadius, layout, webLayout } from '../../../src/theme/spacing';
import { shadows } from '../../../src/theme/shadows';
import { ScreenLayout } from '../../../src/components/layout/ScreenLayout';
import { useResponsive } from '../../../src/theme/responsive';
import { ToggleTabs, AppModal, AppButton, DateTimeField } from '../../../src/components/ui';
import { SearchField } from '../../../src/components/ui/Field';
import { useTourTarget } from '../../../src/components/tour/tourTargets';
import { TOUR_TARGETS } from '../../../src/components/tour/steps/targets';
import { ListSkeleton } from '../../../src/components/ui/SkeletonLoader';
import { NotificationBell } from '../../../src/components/shared/NotificationBell';
import { resolveMediaUrl } from '../../../src/services/api';
import { useEducation, EducationContentItem } from '../../../src/services/api-queries';
import { useEducationProgress } from '../../../src/hooks/useEducationProgress';
import { categoryMeta, typeMeta, readingTime, CATEGORY_META } from '../../../src/utils/educationMeta';

const BRAND = gestanteColors.primary;

// ─────────────────────────── Calculadora EG ───────────────────────────

/** Parsea 'YYYY-MM-DD' a una fecha LOCAL a medianoche (evita el desfase UTC). */
function parseLocalDate(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '');
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return isNaN(d.getTime()) ? null : d;
}

/** Medianoche local de hoy, para contar días completos sin sesgo horario. */
function todayLocal(): Date {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
}

interface EgResultado {
  semanas: number;
  dias: number;
  totalDias: number;
  trimestre: number;
  fpp: string;
  restantes: number;
  progreso: number; // 0..1 sobre 40 semanas
}

function CalculadoraEG() {
  const [fum, setFum] = useState('');
  const [resultado, setResultado] = useState<EgResultado | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Cálculo reactivo: se recalcula al cambiar la FUM (sin necesidad de botón),
  // pero igual se ofrece el botón para reforzar la acción.
  const calcular = React.useCallback((valor: string) => {
    setResultado(null);
    if (!valor) {
      setError(null);
      return;
    }
    const fumDate = parseLocalDate(valor);
    if (!fumDate) {
      setError('Selecciona una fecha válida.');
      return;
    }
    const hoy = todayLocal();
    const totalDias = Math.floor((hoy.getTime() - fumDate.getTime()) / 86400000);

    if (totalDias < 0) {
      setError('La fecha no puede ser futura. Revisa tu última menstruación.');
      return;
    }
    if (totalDias > 300) {
      setError('Han pasado más de 42 semanas. Verifica la fecha o consulta a tu obstetra.');
      return;
    }

    setError(null);
    const semanas = Math.floor(totalDias / 7);
    const dias = totalDias % 7;
    // FPP por regla de Naegele (FUM + 7 días − 3 meses + 1 año).
    const fppDate = new Date(fumDate);
    fppDate.setDate(fppDate.getDate() + 7);
    fppDate.setMonth(fppDate.getMonth() - 3);
    fppDate.setFullYear(fppDate.getFullYear() + 1);

    setResultado({
      semanas,
      dias,
      totalDias,
      trimestre: semanas <= 13 ? 1 : semanas <= 27 ? 2 : 3,
      fpp: fppDate.toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' }),
      restantes: Math.max(0, Math.round((fppDate.getTime() - hoy.getTime()) / 86400000)),
      progreso: Math.min(1, totalDias / 280),
    });
  }, []);

  const handleChange = (v: string) => {
    setFum(v);
    calcular(v);
  };

  const TRIMESTRE_LABEL = ['', 'Primer trimestre', 'Segundo trimestre', 'Tercer trimestre'];

  return (
    <View style={calcStyles.wrapper}>
      <DateTimeField
        label="Fecha de tu última regla"
        mode="date"
        value={fum}
        onChange={handleChange}
        themeColor={BRAND}
        maximumDate={new Date()}
        placeholder="Toca para elegir la fecha"
        error={error ?? undefined}
        helperText={!error && !resultado ? 'Elige el primer día de tu última menstruación.' : undefined}
      />
      <AppButton
        title="Ver mis semanas de embarazo"
        onPress={() => calcular(fum)}
        themeColor={BRAND}
        disabled={!fum}
        style={{ marginTop: spacing.md }}
      />

      {resultado && (
        <View style={calcStyles.results}>
          {/* Encabezado destacado: semanas + barra de progreso del embarazo */}
          <View style={calcStyles.heroBox}>
            <Text style={calcStyles.heroEyebrow}>{TRIMESTRE_LABEL[resultado.trimestre]}</Text>
            <View style={calcStyles.heroNumberRow}>
              <Text style={calcStyles.heroNumber}>{resultado.semanas}</Text>
              <Text style={calcStyles.heroUnit}>
                semana{resultado.semanas === 1 ? '' : 's'}
                {resultado.dias > 0 ? ` + ${resultado.dias} día${resultado.dias === 1 ? '' : 's'}` : ''}
              </Text>
            </View>
            <View
              style={calcStyles.progressTrack}
              accessibilityLabel={`Progreso del embarazo: ${Math.round(resultado.progreso * 100)} por ciento`}
            >
              <View style={[calcStyles.progressFill, { width: `${Math.round(resultado.progreso * 100)}%` }]} />
            </View>
            <View style={calcStyles.progressLabels}>
              <Text style={calcStyles.progressLabelText}>Sem 0</Text>
              <Text style={calcStyles.progressLabelText}>Sem 40</Text>
            </View>
          </View>

          {/* Chips de datos clave */}
          <View style={calcStyles.chipRow}>
            <View style={calcStyles.chip}>
              <Text style={calcStyles.chipValue}>{resultado.trimestre}°</Text>
              <Text style={calcStyles.chipLabel}>trimestre</Text>
            </View>
            <View style={calcStyles.chip}>
              <Text style={calcStyles.chipValue}>{resultado.restantes}</Text>
              <Text style={calcStyles.chipLabel}>días para el parto</Text>
            </View>
          </View>

          {/* FPP destacada */}
          <View style={calcStyles.fppBox}>
            <Text style={calcStyles.fppLabel}>Fecha probable de parto</Text>
            <Text style={calcStyles.fppDate}>{resultado.fpp}</Text>
          </View>

          <Text style={calcStyles.disclaimer}>
            Cálculo estimado según la fecha de tu última regla. Tu obstetra confirma la fecha con la ecografía.
          </Text>
        </View>
      )}
    </View>
  );
}

const calcStyles = StyleSheet.create({
  wrapper: { width: '100%' },
  results: { marginTop: spacing.lg, gap: spacing.md },
  heroBox: {
    backgroundColor: gestanteColors.primaryLight,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  heroEyebrow: {
    ...typography.overline,
    color: BRAND,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroNumberRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm, marginTop: 2 },
  heroNumber: { ...typography.display, color: BRAND, lineHeight: 52 },
  heroUnit: { ...typography.bodyMd, fontWeight: '700', color: commonColors.text },
  progressTrack: {
    height: 8,
    borderRadius: borderRadius.full,
    backgroundColor: commonColors.surface,
    overflow: 'hidden',
    marginTop: spacing.md,
  },
  progressFill: { height: '100%', borderRadius: borderRadius.full, backgroundColor: BRAND },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  progressLabelText: { ...typography.caption, color: commonColors.textSecondary },
  chipRow: { flexDirection: 'row', gap: spacing.md },
  chip: {
    flex: 1,
    backgroundColor: commonColors.background,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  chipValue: { ...typography.h1, color: commonColors.text },
  chipLabel: { ...typography.caption, color: commonColors.textSecondary, marginTop: 2, textAlign: 'center' },
  fppBox: {
    backgroundColor: commonColors.surface,
    borderWidth: 1,
    borderColor: gestanteColors.primaryLight,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
  },
  fppLabel: { ...typography.overline, color: BRAND, textTransform: 'uppercase', letterSpacing: 0.5 },
  fppDate: { ...typography.h2, color: commonColors.text, marginTop: spacing.sm, textAlign: 'center' },
  disclaimer: { ...typography.caption, color: commonColors.textSecondary, textAlign: 'center', fontStyle: 'italic' },
});

// ─────────────────────────── Tarjeta de contenido ───────────────────────────
function ContentCard({ item, leido, fav, onPress, onToggleFav }: {
  item: EducationContentItem;
  leido: boolean;
  fav: boolean;
  onPress: () => void;
  onToggleFav: () => void;
}) {
  const cat = categoryMeta(item.categoria);
  const ty = typeMeta(item.tipo);
  const CatIcon = cat.icon;
  const TypeIcon = ty.icon;
  const thumb = resolveMediaUrl(item.thumbnailUrl);
  return (
    // Contenedor no-botón: card pulsable + botón de favorito como hermanos
    // (evita anidar un <button> dentro de otro, inválido en web).
    <View style={styles.cardWrap}>
    <Pressable style={({ pressed }: any) => [styles.card, pressed && { opacity: 0.7 }]} onPress={onPress} accessibilityRole="button" accessibilityLabel={item.titulo}>
      {thumb ? (
        <Image source={{ uri: thumb }} style={styles.cardThumb} resizeMode="cover" />
      ) : (
        <View style={[styles.cardIcon, { backgroundColor: cat.bg }]}>
          <CatIcon size={22} color={cat.color} />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <View style={styles.cardTopRow}>
          {item.recomendado ? (
            <View style={styles.recoTag}>
              <Sparkles size={11} color={BRAND} />
              <Text style={styles.recoTagText}>Recomendado por tu obstetra</Text>
            </View>
          ) : (
            <Text style={[styles.cardCategory, { color: cat.color }]} numberOfLines={1}>{cat.label}</Text>
          )}
          {leido && <CheckCircle2 size={14} color={semanticColors.success} />}
        </View>
        <Text style={styles.cardTitle} numberOfLines={2}>{item.titulo}</Text>
        {item.recomendado && item.recomendadoNota ? (
          <Text style={styles.recoNota} numberOfLines={2}>“{item.recomendadoNota}”</Text>
        ) : (
          <Text style={styles.cardExcerpt} numberOfLines={2}>{item.contenido}</Text>
        )}
        <View style={styles.cardMetaRow}>
          <View style={styles.cardMetaItem}>
            <TypeIcon size={12} color={commonColors.textTertiary} />
            <Text style={styles.cardMetaText}>{ty.label}</Text>
          </View>
          <View style={styles.cardMetaItem}>
            <Clock size={12} color={commonColors.textTertiary} />
            <Text style={styles.cardMetaText}>{readingTime(item.contenido, item.duracionMin)}</Text>
          </View>
        </View>
      </View>
      <View style={styles.cardFavSpacer} />
    </Pressable>
    <TouchableOpacity onPress={onToggleFav} hitSlop={10} style={styles.cardFav} accessibilityRole="button" accessibilityLabel={fav ? 'Quitar de favoritos' : 'Guardar'}>
      <Heart size={18} color={fav ? semanticColors.danger : commonColors.textTertiary} fill={fav ? semanticColors.danger : 'transparent'} />
    </TouchableOpacity>
    </View>
  );
}

type Seccion = 'recomendados' | 'parati' | 'biblioteca' | 'favoritos';

export default function EducacionScreen(): React.ReactElement {
  const router = useRouter();
  const { webShell, select } = useResponsive();
  const educacionTourTarget = useTourTarget(TOUR_TARGETS.gestanteEducacion);
  const webBodyMax = select({ base: 9999, lg: webLayout.contentMaxWidth.lg, xl: webLayout.contentMaxWidth.xl, xxl: webLayout.contentMaxWidth.xxl });
  const [query, setQuery] = useState('');
  const [categoria, setCategoria] = useState<string | null>(null);
  const [toolsVisible, setToolsVisible] = useState(false);

  const { data: eduData, isLoading, isError, refetch } = useEducation();
  const { markRead, toggleFavorite, isRead, isFavorite } = useEducationProgress();

  const allContents = eduData?.contents || [];
  const currentTrimester = eduData?.currentTrimester || 1;

  // Nº de contenidos recomendados por la obstetra.
  const recCount = useMemo(() => allContents.filter((c) => c.recomendado).length, [allContents]);

  // Sección inicial: si hay contenido recomendado, mostrarlo primero.
  const [seccion, setSeccion] = useState<Seccion>('parati');
  const initializedRef = React.useRef(false);
  React.useEffect(() => {
    if (!initializedRef.current && allContents.length > 0) {
      initializedRef.current = true;
      if (recCount > 0) setSeccion('recomendados');
    }
  }, [allContents.length, recCount]);

  // Categorías presentes en el contenido (para no mostrar chips vacíos).
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    allContents.forEach((c) => set.add(c.categoria || 'general'));
    return Object.keys(CATEGORY_META).filter((k) => set.has(k));
  }, [allContents]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allContents.filter((c) => {
      if (seccion === 'recomendados' && !c.recomendado) return false;
      if (seccion === 'parati' && c.trimestre != null && c.trimestre !== currentTrimester) return false;
      if (seccion === 'favoritos' && !isFavorite(c.id)) return false;
      if (categoria && (c.categoria || 'general') !== categoria) return false;
      if (q && !(`${c.titulo} ${c.contenido}`.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [allContents, seccion, currentTrimester, categoria, query, isFavorite]);

  // Nº de favoritos para mostrarlo en la pestaña.
  const favCount = useMemo(
    () => allContents.filter((c) => isFavorite(c.id)).length,
    [allContents, isFavorite],
  );

  const renderHeader = () => (
    <View ref={educacionTourTarget} collapsable={false}>
      {/* Herramientas rápidas */}
      {!webShell && (
        <View style={styles.toolsRow}>
          <TouchableOpacity style={styles.toolBtn} onPress={() => setToolsVisible(true)} activeOpacity={0.85}>
            <Calculator size={18} color={commonColors.textSecondary} />
            <Text style={styles.toolBtnText}>Mis semanas</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolBtn} onPress={() => router.push('/(gestante)/alarmas')} activeOpacity={0.85}>
            <AlertTriangle size={18} color={commonColors.textSecondary} />
            <Text style={styles.toolBtnText}>Signos de alarma</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Buscador */}
      <SearchField
        value={query}
        onChangeText={setQuery}
        placeholder="Buscar en educación…"
        returnKeyType="search"
        containerStyle={styles.searchBox}
      />

      {/* Pestañas */}
      <ToggleTabs
        tabs={[
          ...(recCount > 0 ? [{ key: 'recomendados', label: 'Recomendados', badge: recCount }] : []),
          { key: 'parati', label: 'Para ti' },
          { key: 'biblioteca', label: 'Biblioteca' },
          { key: 'favoritos', label: 'Favoritos', badge: favCount || undefined },
        ]}
        value={seccion}
        onChange={(k) => setSeccion(k as Seccion)}
        activeColor={BRAND}
        style={{ marginBottom: spacing.md }}
      />

      {/* Filtros de categoría */}
      {availableCategories.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catRow}>
          <TouchableOpacity
            style={[styles.catChip, !categoria && styles.catChipActive]}
            onPress={() => setCategoria(null)}
          >
            <Text style={[styles.catChipText, !categoria && styles.catChipTextActive]}>Todas</Text>
          </TouchableOpacity>
          {availableCategories.map((k) => {
            const m = CATEGORY_META[k];
            const active = categoria === k;
            return (
              <TouchableOpacity
                key={k}
                style={[styles.catChip, active && { backgroundColor: m.color, borderColor: m.color }]}
                onPress={() => setCategoria(active ? null : k)}
              >
                <Text style={[styles.catChipText, active && styles.catChipTextActive]}>{m.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {seccion === 'parati' && (
        <Text style={styles.sectionHint}>Recomendado para tu {currentTrimester}° trimestre</Text>
      )}
      {seccion === 'recomendados' && (
        <Text style={styles.sectionHint}>Contenido que tu obstetra te recomendó estudiar</Text>
      )}
    </View>
  );

  const renderEmpty = () =>
    isError ? (
      <View style={styles.emptyWrap}>
        <BookOpen size={42} color={commonColors.textTertiary} />
        <Text style={styles.emptyTitle}>No se pudo cargar la educación</Text>
        <Text style={styles.emptyText}>Revisa tu conexión y vuelve a intentar.</Text>
        <AppButton
          title="Reintentar"
          onPress={() => refetch()}
          variant="outline"
          size="sm"
          themeColor={BRAND}
          style={{ marginTop: spacing.md }}
        />
      </View>
    ) : (
      <View style={styles.emptyWrap}>
        <BookOpen size={42} color={commonColors.textTertiary} />
        <Text style={styles.emptyTitle}>
          {seccion === 'favoritos' ? 'Aún no tienes favoritos' : 'Sin contenido por ahora'}
        </Text>
        <Text style={styles.emptyText}>
          {seccion === 'favoritos'
            ? 'Toca el corazón en un artículo para guardarlo aquí.'
            : query || categoria
            ? 'No encontramos contenido con ese filtro. Prueba con otra búsqueda.'
            : 'Tu obstetra publicará contenido educativo pronto.'}
        </Text>
      </View>
    );

  const mainList = (
    <FlashList
      data={isLoading ? [] : filtered}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <ContentCard
          item={item}
          leido={isRead(item.id)}
          fav={isFavorite(item.id)}
          onPress={() => router.push(`/(gestante)/educacion/${item.id}`)}
          onToggleFav={() => toggleFavorite(item.id)}
        />
      )}
      ListHeaderComponent={renderHeader}
      ListEmptyComponent={isLoading ? <View style={{ paddingTop: spacing.md }}><ListSkeleton count={5} /></View> : renderEmpty}
      contentContainerStyle={[styles.listContent, webShell && styles.listWeb, webShell && { maxWidth: webBodyMax }]}
      showsVerticalScrollIndicator={false}
    />
  );

  const modals = (
    <AppModal
      visible={toolsVisible}
      onClose={() => setToolsVisible(false)}
      title="¿En qué semana estoy?"
      subtitle="Calcula tus semanas de embarazo y la fecha probable de parto."
    >
      <CalculadoraEG />
      <TouchableOpacity style={styles.emergencyRow} onPress={() => Linking.openURL('tel:083421800')}>
        <Phone size={18} color={semanticColors.danger} />
        <Text style={styles.emergencyRowText}>¿Emergencia? Llama al 083 – 421800</Text>
        <ChevronRight size={16} color={commonColors.textTertiary} />
      </TouchableOpacity>
    </AppModal>
  );

  if (webShell) {
    return (
      <View style={{ flex: 1, backgroundColor: commonColors.background }}>
        <ScreenLayout
          role="gestante"
          title="Educación"
          subtitle="Aprende sobre tu embarazo"
          accentColor={BRAND}
          width="wide"
          scroll={false}
          actions={
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity style={[styles.toolBtn, { backgroundColor: commonColors.surfaceAlt }]} onPress={() => setToolsVisible(true)}>
                <Calculator size={16} color={commonColors.textSecondary} />
                <Text style={[styles.toolBtnText, { color: commonColors.textSecondary }]}>Mis semanas</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.toolBtn, { backgroundColor: commonColors.surfaceAlt }]} onPress={() => router.push('/(gestante)/alarmas')}>
                <AlertTriangle size={16} color={commonColors.textSecondary} />
                <Text style={[styles.toolBtnText, { color: commonColors.textSecondary }]}>Signos de alarma</Text>
              </TouchableOpacity>
            </View>
          }
        >
          {mainList}
        </ScreenLayout>
        {modals}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={gestanteColors.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.headerWrapper}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        <SafeAreaView edges={['top']} style={styles.safeAreaHeader}>
          <View style={styles.headerTopRow}>
            <TouchableOpacity
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/(gestante)/(tabs)'))}
              style={styles.backBtn}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityLabel="Volver"
              accessibilityRole="button"
            >
              <ArrowLeft size={24} color={commonColors.white} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>Educación</Text>
              <Text style={styles.headerSubtitle}>Aprende sobre tu embarazo</Text>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>
      {mainList}
      {modals}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: commonColors.background },
  headerWrapper: { paddingBottom: spacing.lg, borderBottomLeftRadius: borderRadius.xxl, borderBottomRightRadius: borderRadius.xxl },
  safeAreaHeader: { paddingHorizontal: spacing.lg, paddingTop: Platform.OS === 'android' ? 44 : spacing.md },
  headerTopRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: commonColors.onColorSurface },
  headerTitle: { ...typography.display, color: commonColors.white, marginBottom: 2 },
  headerSubtitle: { ...typography.bodySm, color: commonColors.onColorTextSoft },
  
  toolsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  toolBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: commonColors.surface, borderRadius: borderRadius.full, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1, borderColor: commonColors.border, ...shadows.card },
  toolBtnText: { ...typography.caption, fontWeight: '700', color: commonColors.text, fontSize: 13 },
  
  listContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: 120 },
  listWeb: { width: '100%', alignSelf: 'center', paddingBottom: spacing.xl },
  searchBox: { marginBottom: spacing.md },
  catRow: { gap: spacing.sm, paddingBottom: spacing.md },
  catChip: { paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: borderRadius.full, backgroundColor: commonColors.surface, borderWidth: 1, borderColor: commonColors.border },
  catChipActive: { backgroundColor: '#115E59', borderColor: '#115E59' },
  catChipText: { ...typography.caption, fontWeight: '600', color: commonColors.textSecondary },
  catChipTextActive: { color: commonColors.white },
  sectionHint: { ...typography.caption, color: commonColors.textSecondary, marginBottom: spacing.sm, marginLeft: 4, fontStyle: 'italic' },
  
  cardWrap: { position: 'relative', marginBottom: spacing.md },
  card: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md,
    backgroundColor: commonColors.surface, borderRadius: borderRadius.xl,
    padding: spacing.md2, ...shadows.card,
    borderLeftWidth: 4, borderLeftColor: BRAND,
  },
  cardIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  cardThumb: { width: 56, height: 56, borderRadius: borderRadius.lg, backgroundColor: commonColors.surfaceAlt },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  cardCategory: { ...typography.overline, textTransform: 'uppercase', letterSpacing: 0.5, flex: 1 },
  cardTitle: { ...typography.bodyMd, fontWeight: '700', color: commonColors.text, marginTop: 2, fontSize: 16 },
  cardExcerpt: { ...typography.caption, color: commonColors.textSecondary, marginTop: 4, lineHeight: 18, fontSize: 13 },
  recoTag: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: gestanteColors.primaryLight, paddingHorizontal: 8, paddingVertical: 4, borderRadius: borderRadius.full, flexShrink: 1 },
  recoTagText: { ...typography.overline, fontSize: 9.5, fontWeight: '700', color: BRAND },
  recoNota: { ...typography.caption, color: BRAND, fontStyle: 'italic', marginTop: 3, lineHeight: 18 },
  cardMetaRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm + 2 },
  cardMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardMetaText: { ...typography.overline, letterSpacing: 0, color: commonColors.textTertiary, fontSize: 11 },
  cardFavSpacer: { width: 28 },
  cardFav: { position: 'absolute', top: spacing.sm, right: spacing.sm, width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  
  emptyWrap: { alignItems: 'center', paddingTop: spacing.xxl, paddingHorizontal: spacing.xl, gap: spacing.sm },
  emptyTitle: { ...typography.h3, color: commonColors.text, marginTop: spacing.sm },
  emptyText: { ...typography.bodySm, color: commonColors.textSecondary, textAlign: 'center', lineHeight: 20 },
  emergencyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.lg, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: commonColors.borderLight },
  emergencyRowText: { flex: 1, ...typography.bodySm, color: commonColors.text },
});
