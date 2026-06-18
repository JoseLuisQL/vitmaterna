/**
 * VITMATERNA - Detalle de contenido educativo (gestante)
 *
 * Vista de lectura tipo artículo: portada con categoría/tipo/tiempo de lectura,
 * cuerpo del contenido, recurso multimedia si existe y acciones (favorito,
 * abrir recurso). Marca el artículo como leído al abrirlo.
 */
import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, StatusBar, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Heart, Clock, ExternalLink, PlayCircle, CheckCircle2 } from 'lucide-react-native';
import { RichText } from '../../../src/components/ui';
import { resolveMediaUrl } from '../../../src/services/api';
import { useEducation, useEducationContentById, registerContentView } from '../../../src/services/api-queries';
import { useEducationProgress } from '../../../src/hooks/useEducationProgress';
import { categoryMeta, typeMeta, readingTime } from '../../../src/utils/educationMeta';
import { gestanteColors, commonColors } from '../../../src/theme/colors';
import { typography } from '../../../src/theme/typography';
import { spacing, borderRadius, layout } from '../../../src/theme/spacing';
import { shadows } from '../../../src/theme/shadows';

const BRAND = gestanteColors.primary;

export default function EducacionDetalleScreen(): React.ReactElement {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data } = useEducation();
  const { markRead, toggleFavorite, isFavorite } = useEducationProgress();

  // Primero intenta encontrarlo en el feed cacheado (rápido). Si no está (p. ej.
  // un contenido recomendado de otro trimestre), lo carga por id desde el backend.
  const cached = useMemo(
    () => (data?.contents || []).find((c) => c.id === id),
    [data, id],
  );
  const { data: fetched, isLoading: isLoadingById } = useEducationContentById(id || '', !cached);
  const item = cached || fetched || undefined;

  useEffect(() => {
    if (item?.id) {
      markRead(item.id);
      // Registra la vista en el backend (estadísticas + marca la recomendación
      // como leída si la envió la obstetra), luego refresca el feed de educación.
      registerContentView(item.id).finally(() => {
        queryClient.invalidateQueries({ queryKey: ['education'] });
      });
    }
  }, [item?.id, markRead, queryClient]);

  if (!item) {
    return (
      <View style={styles.container}>
        <SafeAreaView edges={['top']} style={{ padding: spacing.lg }}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtnPlain} accessibilityLabel="Volver" accessibilityRole="button">
            <ArrowLeft size={24} color={commonColors.text} />
          </TouchableOpacity>
          <Text style={styles.notFound}>
            {isLoadingById ? 'Cargando contenido…' : 'Este contenido ya no está disponible.'}
          </Text>
        </SafeAreaView>
      </View>
    );
  }

  const cat = categoryMeta(item.categoria);
  const ty = typeMeta(item.tipo);
  const CatIcon = cat.icon;
  const TypeIcon = ty.icon;
  const fav = isFavorite(item.id);
  const media = resolveMediaUrl(item.mediaUrl);
  const thumb = resolveMediaUrl(item.thumbnailUrl);
  const isPlayable = item.tipo === 'video' || item.tipo === 'audio';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <LinearGradient colors={[cat.color, cat.color + 'DD']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
        <SafeAreaView edges={['top']} style={styles.safeAreaHeader}>
          <View style={styles.headerRow}>
            <TouchableOpacity
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/(gestante)/(tabs)/educacion'))}
              style={styles.backBtn}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityLabel="Volver"
              accessibilityRole="button"
            >
              <ArrowLeft size={24} color={commonColors.white} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => toggleFavorite(item.id)}
              style={styles.favBtn}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityLabel={fav ? 'Quitar de favoritos' : 'Guardar en favoritos'}
              accessibilityRole="button"
            >
              <Heart size={22} color={commonColors.white} fill={fav ? commonColors.white : 'transparent'} />
            </TouchableOpacity>
          </View>
          <View style={styles.headerIcon}>
            <CatIcon size={26} color={commonColors.white} />
          </View>
          <Text style={styles.category}>{cat.label}</Text>
          <Text style={styles.title}>{item.titulo}</Text>
          <View style={styles.metaRow}>
            <View style={styles.metaChip}>
              <TypeIcon size={13} color={commonColors.white} />
              <Text style={styles.metaChipText}>{ty.label}</Text>
            </View>
            <View style={styles.metaChip}>
              <Clock size={13} color={commonColors.white} />
              <Text style={styles.metaChipText}>{readingTime(item.contenido, item.duracionMin)}</Text>
            </View>
            {item.trimestre ? (
              <View style={styles.metaChip}>
                <Text style={styles.metaChipText}>{item.trimestre}° trimestre</Text>
              </View>
            ) : null}
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Portada */}
        {thumb ? (
          <Image source={{ uri: thumb }} style={styles.cover} resizeMode="cover" accessibilityLabel="Portada del artículo" />
        ) : null}

        {/* Recurso multimedia */}
        {media ? (
          <TouchableOpacity style={styles.mediaCard} onPress={() => Linking.openURL(media)} activeOpacity={0.85}>
            {isPlayable ? <PlayCircle size={24} color={BRAND} /> : <ExternalLink size={20} color={BRAND} />}
            <Text style={styles.mediaText}>
              {item.tipo === 'video' ? 'Ver video' : item.tipo === 'audio' ? 'Escuchar audio' : 'Abrir recurso'}
            </Text>
          </TouchableOpacity>
        ) : null}

        <RichText content={item.contenido} accentColor={cat.color} />

        <View style={styles.readBadge}>
          <CheckCircle2 size={16} color={cat.color} />
          <Text style={[styles.readBadgeText, { color: cat.color }]}>Marcado como leído</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: commonColors.background },
  header: { borderBottomLeftRadius: borderRadius.xxl, borderBottomRightRadius: borderRadius.xxl, paddingBottom: spacing.xl },
  safeAreaHeader: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.18)' },
  backBtnPlain: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: commonColors.surfaceAlt, marginBottom: spacing.lg },
  favBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.18)' },
  headerIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginTop: spacing.md },
  category: { ...typography.overline, color: 'rgba(255,255,255,0.9)', textTransform: 'uppercase', letterSpacing: 0.8, marginTop: spacing.md },
  title: { ...typography.h1, color: commonColors.white, marginTop: 4 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  metaChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: borderRadius.full, paddingHorizontal: 10, paddingVertical: 5 },
  metaChipText: { ...typography.caption, color: commonColors.white, fontWeight: '600' },
  scroll: { flex: 1 },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: layout.tabBarSpace },
  cover: { width: '100%', height: 180, borderRadius: borderRadius.xl, backgroundColor: commonColors.surfaceAlt, marginBottom: spacing.lg },
  mediaCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: commonColors.surface, borderRadius: borderRadius.xl,
    padding: spacing.lg, marginBottom: spacing.lg, borderWidth: 1, borderColor: commonColors.border, ...shadows.card,
  },
  mediaText: { ...typography.bodyMedium, fontWeight: '700', color: BRAND },
  readBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.xl, alignSelf: 'center' },
  readBadgeText: { ...typography.caption, fontWeight: '700' },
  notFound: { ...typography.body, color: commonColors.textSecondary, textAlign: 'center', marginTop: spacing.xl },
});
