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
  View, StyleSheet, Text, ScrollView, TouchableOpacity, TextInput,
  Linking, StatusBar, FlatList, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  AlertTriangle, Calculator, Phone, ArrowLeft, Search, Heart, Clock,
  ChevronRight, CheckCircle2, X, BookOpen,
} from 'lucide-react-native';
import { gestanteColors, commonColors, semanticColors } from '../../../src/theme/colors';
import { typography } from '../../../src/theme/typography';
import { spacing, borderRadius, layout } from '../../../src/theme/spacing';
import { ToggleTabs, AppModal, AppButton, DateTimeField } from '../../../src/components/ui';
import { NotificationBell } from '../../../src/components/shared/NotificationBell';
import { resolveMediaUrl } from '../../../src/services/api';
import { useEducation, EducationContentItem } from '../../../src/services/api-queries';
import { useEducationProgress } from '../../../src/hooks/useEducationProgress';
import { categoryMeta, typeMeta, readingTime, CATEGORY_META } from '../../../src/utils/educationMeta';

const BRAND = gestanteColors.primary;

// ─────────────────────────── Calculadora EG ───────────────────────────
function CalculadoraEG() {
  const [fum, setFum] = useState('');
  const [resultado, setResultado] = useState<{ semanas: number; dias: number; trimestre: number; fpp: string; restantes: number } | null>(null);

  function calcular() {
    if (!fum || !/^\d{4}-\d{2}-\d{2}$/.test(fum)) return;
    const fumDate = new Date(fum);
    if (isNaN(fumDate.getTime())) return;
    const hoy = new Date();
    const totalDias = Math.floor((hoy.getTime() - fumDate.getTime()) / 86400000);
    if (totalDias < 0 || totalDias > 294) return;
    const semanas = Math.floor(totalDias / 7);
    const dias = totalDias % 7;
    const fppDate = new Date(fumDate);
    fppDate.setDate(fppDate.getDate() + 7);
    fppDate.setMonth(fppDate.getMonth() - 3);
    fppDate.setFullYear(fppDate.getFullYear() + 1);
    setResultado({
      semanas, dias,
      trimestre: semanas <= 13 ? 1 : semanas <= 27 ? 2 : 3,
      fpp: fppDate.toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' }),
      restantes: Math.max(0, Math.round((fppDate.getTime() - hoy.getTime()) / 86400000)),
    });
  }

  return (
    <View style={styles.card}>
      <DateTimeField
        label="Fecha de última menstruación (FUM)"
        mode="date"
        value={fum}
        onChange={setFum}
        themeColor={BRAND}
        maximumDate={new Date()}
        placeholder="Seleccionar fecha"
      />
      <AppButton title="Calcular edad gestacional" onPress={calcular} themeColor={BRAND} style={{ marginTop: spacing.md }} />
      {resultado && (
        <View style={calcStyles.results}>
          <View style={calcStyles.resultGrid}>
            <View style={calcStyles.resultItem}>
              <Text style={calcStyles.resultValue}>{resultado.semanas}</Text>
              <Text style={calcStyles.resultLabel}>sem + {resultado.dias} días</Text>
            </View>
            <View style={calcStyles.resultItem}>
              <Text style={calcStyles.resultValue}>{resultado.trimestre}°</Text>
              <Text style={calcStyles.resultLabel}>trimestre</Text>
            </View>
          </View>
          <View style={calcStyles.fppBox}>
            <Text style={calcStyles.fppLabel}>Fecha Probable de Parto</Text>
            <Text style={calcStyles.fppDate}>{resultado.fpp}</Text>
            <Text style={calcStyles.fppDays}>{resultado.restantes} días restantes</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const calcStyles = StyleSheet.create({
  results: { marginTop: spacing.lg, gap: spacing.md },
  resultGrid: { flexDirection: 'row', gap: spacing.md },
  resultItem: { flex: 1, backgroundColor: commonColors.background, borderRadius: borderRadius.lg, padding: spacing.lg, alignItems: 'center' },
  resultValue: { ...typography.display, color: BRAND },
  resultLabel: { ...typography.caption, color: commonColors.textSecondary, marginTop: 4 },
  fppBox: { backgroundColor: gestanteColors.primaryLight, borderRadius: borderRadius.lg, padding: spacing.lg, alignItems: 'center' },
  fppLabel: { ...typography.overline, color: BRAND, textTransform: 'uppercase', letterSpacing: 0.5 },
  fppDate: { ...typography.h2, color: commonColors.text, marginTop: spacing.sm },
  fppDays: { ...typography.bodySmall, color: commonColors.textSecondary, marginTop: 4 },
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
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={item.titulo}>
      {thumb ? (
        <Image source={{ uri: thumb }} style={styles.cardThumb} resizeMode="cover" />
      ) : (
        <View style={[styles.cardIcon, { backgroundColor: cat.bg }]}>
          <CatIcon size={22} color={cat.color} />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <View style={styles.cardTopRow}>
          <Text style={[styles.cardCategory, { color: cat.color }]} numberOfLines={1}>{cat.label}</Text>
          {leido && <CheckCircle2 size={14} color={semanticColors.success} />}
        </View>
        <Text style={styles.cardTitle} numberOfLines={2}>{item.titulo}</Text>
        <Text style={styles.cardExcerpt} numberOfLines={2}>{item.contenido}</Text>
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
      <TouchableOpacity onPress={onToggleFav} hitSlop={10} style={styles.cardFav} accessibilityLabel={fav ? 'Quitar de favoritos' : 'Guardar'}>
        <Heart size={18} color={fav ? semanticColors.danger : commonColors.textTertiary} fill={fav ? semanticColors.danger : 'transparent'} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

type Seccion = 'parati' | 'biblioteca' | 'favoritos';

export default function EducacionScreen(): React.ReactElement {
  const router = useRouter();
  const [seccion, setSeccion] = useState<Seccion>('parati');
  const [query, setQuery] = useState('');
  const [categoria, setCategoria] = useState<string | null>(null);
  const [toolsVisible, setToolsVisible] = useState(false);

  const { data: eduData, isLoading } = useEducation();
  const { markRead, toggleFavorite, isRead, isFavorite } = useEducationProgress();

  const allContents = eduData?.contents || [];
  const currentTrimester = eduData?.currentTrimester || 1;

  // Categorías presentes en el contenido (para no mostrar chips vacíos).
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    allContents.forEach((c) => set.add(c.categoria || 'general'));
    return Object.keys(CATEGORY_META).filter((k) => set.has(k));
  }, [allContents]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allContents.filter((c) => {
      if (seccion === 'parati' && c.trimestre != null && c.trimestre !== currentTrimester) return false;
      if (seccion === 'favoritos' && !isFavorite(c.id)) return false;
      if (categoria && (c.categoria || 'general') !== categoria) return false;
      if (q && !(`${c.titulo} ${c.contenido}`.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [allContents, seccion, currentTrimester, categoria, query, isFavorite]);

  const renderHeader = () => (
    <View>
      {/* Buscador */}
      <View style={styles.searchBox}>
        <Search size={18} color={commonColors.textTertiary} />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Buscar en educación…"
          placeholderTextColor={commonColors.textTertiary}
          returnKeyType="search"
        />
        {query ? (
          <TouchableOpacity onPress={() => setQuery('')} hitSlop={10} accessibilityLabel="Limpiar búsqueda">
            <X size={16} color={commonColors.textTertiary} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Pestañas */}
      <ToggleTabs
        tabs={[
          { key: 'parati', label: 'Para ti' },
          { key: 'biblioteca', label: 'Biblioteca' },
          { key: 'favoritos', label: 'Favoritos' },
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
    </View>
  );

  const renderEmpty = () => (
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
            <NotificationBell href="/(gestante)/notificaciones" />
          </View>

          {/* Herramientas rápidas */}
          <View style={styles.toolsRow}>
            <TouchableOpacity style={styles.toolBtn} onPress={() => setToolsVisible(true)} activeOpacity={0.85}>
              <Calculator size={16} color={commonColors.white} />
              <Text style={styles.toolBtnText}>Calcular EG</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.toolBtn} onPress={() => router.push('/(gestante)/alarmas')} activeOpacity={0.85}>
              <AlertTriangle size={16} color={commonColors.white} />
              <Text style={styles.toolBtnText}>Signos de alarma</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <FlatList
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
        ListEmptyComponent={!isLoading ? renderEmpty : null}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {/* Modal de herramientas: Calculadora EG */}
      <AppModal
        visible={toolsVisible}
        onClose={() => setToolsVisible(false)}
        title="Calculadora de edad gestacional"
        subtitle="Calcula tus semanas y tu fecha probable de parto."
      >
        <CalculadoraEG />
        <TouchableOpacity style={styles.emergencyRow} onPress={() => Linking.openURL('tel:083421800')}>
          <Phone size={18} color={semanticColors.danger} />
          <Text style={styles.emergencyRowText}>¿Emergencia? Llama al 083 – 421800</Text>
          <ChevronRight size={16} color={commonColors.textTertiary} />
        </TouchableOpacity>
      </AppModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: commonColors.background },
  headerWrapper: { paddingBottom: spacing.lg, borderBottomLeftRadius: borderRadius.xxl, borderBottomRightRadius: borderRadius.xxl },
  safeAreaHeader: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  headerTopRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.18)' },
  headerTitle: { ...typography.display, color: commonColors.white, marginBottom: 2 },
  headerSubtitle: { ...typography.bodySm, color: 'rgba(255,255,255,0.85)' },
  toolsRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  toolBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: borderRadius.full, paddingHorizontal: 14, paddingVertical: 8 },
  toolBtnText: { ...typography.caption, fontWeight: '700', color: commonColors.white },
  listContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: layout.tabBarSpace },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: commonColors.surface, borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md, height: 46, marginBottom: spacing.md,
    borderWidth: 1, borderColor: commonColors.border,
  },
  searchInput: { flex: 1, ...typography.body, fontSize: 15, color: commonColors.text },
  catRow: { gap: spacing.sm, paddingBottom: spacing.sm },
  catChip: { paddingHorizontal: spacing.md, paddingVertical: 7, borderRadius: borderRadius.full, backgroundColor: commonColors.surface, borderWidth: 1, borderColor: commonColors.border },
  catChipActive: { backgroundColor: BRAND, borderColor: BRAND },
  catChipText: { ...typography.caption, fontWeight: '600', color: commonColors.textSecondary },
  catChipTextActive: { color: commonColors.white },
  sectionHint: { ...typography.caption, color: commonColors.textSecondary, marginBottom: spacing.sm, marginLeft: 4 },
  card: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md,
    backgroundColor: commonColors.surface, borderRadius: borderRadius.xl,
    padding: spacing.md, marginBottom: spacing.sm2, borderWidth: 1, borderColor: commonColors.border,
  },
  cardIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  cardThumb: { width: 56, height: 56, borderRadius: borderRadius.lg, backgroundColor: commonColors.surfaceAlt },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  cardCategory: { ...typography.overline, textTransform: 'uppercase', letterSpacing: 0.5, flex: 1 },
  cardTitle: { ...typography.bodyMedium, fontWeight: '700', color: commonColors.text, marginTop: 2 },
  cardExcerpt: { ...typography.caption, color: commonColors.textSecondary, marginTop: 3, lineHeight: 18 },
  cardMetaRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
  cardMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardMetaText: { ...typography.overline, letterSpacing: 0, color: commonColors.textTertiary },
  cardFav: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  emptyWrap: { alignItems: 'center', paddingTop: spacing.xxl, paddingHorizontal: spacing.xl, gap: spacing.sm },
  emptyTitle: { ...typography.h3, color: commonColors.text, marginTop: spacing.sm },
  emptyText: { ...typography.bodySmall, color: commonColors.textSecondary, textAlign: 'center', lineHeight: 20 },
  emergencyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.lg, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: commonColors.borderLight },
  emergencyRowText: { flex: 1, ...typography.bodySmall, color: commonColors.text },
});
