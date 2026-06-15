/**
 * VITMATERNA - Admin: gestión de contenido educativo (RF-10.05)
 * Crear, listar, editar y eliminar contenido. Campos y enums alineados con el
 * backend (titulo/contenido/tipo/categoria/mediaUrl/duracionMin).
 */
import React, { useState } from 'react';
import {
  View, StyleSheet, Text, ScrollView, FlatList, TouchableOpacity, RefreshControl, Switch, TextInput, Image, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, Pencil, Trash2, BookOpen, Search, X, ImagePlus } from 'lucide-react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import * as ImagePicker from 'expo-image-picker';
import api, { resolveMediaUrl } from '../../../src/services/api';
import { AppInput } from '../../../src/components/ui/AppInput';
import { AppButton } from '../../../src/components/ui/AppButton';
import { AppModal } from '../../../src/components/ui/AppModal';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { LoadingScreen } from '../../../src/components/ui/LoadingScreen';
import { useToast } from '../../../src/components/ui';
import { confirmAction } from '../../../src/utils/confirm';
import { LinearGradient } from 'expo-linear-gradient';
import { commonColors, obstetraColors, adminColors, semanticColors } from '../../../src/theme/colors';
import { spacing, borderRadius, layout } from '../../../src/theme/spacing';
import { typography } from '../../../src/theme/typography';
import {
  useEducationContent,
  useCreateEducationContent,
  useUpdateEducationContent,
  useDeleteEducationContent,
  EDUCATION_TIPOS,
  EDUCATION_CATEGORIAS,
  type EducationContent,
} from '../../../src/services/admin-queries';

const BRAND = obstetraColors.primary;

const TIPO_LABEL: Record<string, string> = {
  articulo: 'Artículo',
  infografia: 'Infografía',
  video: 'Video',
  audio: 'Audio',
  faq: 'FAQ',
};

const CATEGORIA_LABEL: Record<string, string> = {
  nutricion: 'Nutrición',
  suplementos: 'Suplementos',
  signos_alarma: 'Signos de alarma',
  parto: 'Parto',
  lactancia: 'Lactancia',
  cuidado_bebe: 'Cuidado del bebé',
  salud_mental: 'Salud mental',
  general: 'General',
};

const schema = z.object({
  titulo: z.string().min(1, 'El título es requerido'),
  contenido: z.string().min(1, 'El contenido es requerido'),
  tipo: z.enum(EDUCATION_TIPOS),
  categoria: z.enum(EDUCATION_CATEGORIAS),
  trimestre: z.string().optional(),
  semanaInicio: z.string().optional(),
  semanaFin: z.string().optional(),
  mediaUrl: z.string().optional(),
  thumbnailUrl: z.string().optional(),
  duracionMin: z.string().optional(),
  orden: z.string().optional(),
  activo: z.boolean().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function ContenidoScreen(): React.ReactElement {
  const toast = useToast();
  const { data: items = [], isLoading, refetch, isRefetching } = useEducationContent();
  const createMut = useCreateEducationContent();
  const updateMut = useUpdateEducationContent();
  const deleteMut = useDeleteEducationContent();

  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<EducationContent | null>(null);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState<string | null>(null);
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);
  const [uploadingThumb, setUploadingThumb] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);

  const { control, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      titulo: '', contenido: '', tipo: 'articulo', categoria: 'general',
      trimestre: '', semanaInicio: '', semanaFin: '', mediaUrl: '', thumbnailUrl: '', duracionMin: '', orden: '', activo: true,
    },
  });

  const openCreate = () => {
    setEditing(null);
    setThumbUrl(null);
    reset({ titulo: '', contenido: '', tipo: 'articulo', categoria: 'general', trimestre: '', semanaInicio: '', semanaFin: '', mediaUrl: '', thumbnailUrl: '', duracionMin: '', orden: '', activo: true });
    setModalVisible(true);
  };

  const openEdit = (item: EducationContent) => {
    setEditing(item);
    setThumbUrl(item.thumbnailUrl || null);
    reset({
      titulo: item.titulo,
      contenido: item.contenido,
      tipo: (item.tipo as any) || 'articulo',
      categoria: (item.categoria as any) || 'general',
      trimestre: item.trimestre ? String(item.trimestre) : '',
      semanaInicio: item.semanaInicio ? String(item.semanaInicio) : '',
      semanaFin: item.semanaFin ? String(item.semanaFin) : '',
      mediaUrl: item.mediaUrl || '',
      thumbnailUrl: item.thumbnailUrl || '',
      duracionMin: item.duracionMin ? String(item.duracionMin) : '',
      orden: item.orden ? String(item.orden) : '',
      activo: item.activo,
    });
    setModalVisible(true);
  };

  // Sube una imagen de la galería y devuelve su ruta /uploads/..., o null.
  const uploadImageFromGallery = async (): Promise<string | null> => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      toast.info('Permiso requerido', 'Permite el acceso a tus fotos para subir la imagen.');
      return null;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6, base64: true });
    if (result.canceled || !result.assets?.[0]?.base64) return null;
    const asset = result.assets[0];
    const res = await api.post('/chat/upload', { base64: asset.base64, mimeType: asset.mimeType || 'image/jpeg' });
    return res.data?.data?.mediaUrl || null;
  };

  const pickThumbnail = async () => {
    if (uploadingThumb) return;
    try {
      setUploadingThumb(true);
      const url = await uploadImageFromGallery();
      if (url) setThumbUrl(url);
    } catch {
      toast.error('No se pudo subir', 'Inténtalo nuevamente con otra imagen.');
    } finally {
      setUploadingThumb(false);
    }
  };

  const pickMediaImage = async () => {
    if (uploadingMedia) return;
    try {
      setUploadingMedia(true);
      const url = await uploadImageFromGallery();
      if (url) setValue('mediaUrl', url);
    } catch {
      toast.error('No se pudo subir', 'Inténtalo nuevamente con otra imagen.');
    } finally {
      setUploadingMedia(false);
    }
  };

  const onSubmit = (data: FormValues) => {
    const payload: any = {
      titulo: data.titulo,
      contenido: data.contenido,
      tipo: data.tipo,
      categoria: data.categoria,
      trimestre: data.trimestre ? parseInt(data.trimestre, 10) : null,
      semanaInicio: data.semanaInicio ? parseInt(data.semanaInicio, 10) : null,
      semanaFin: data.semanaFin ? parseInt(data.semanaFin, 10) : null,
      mediaUrl: data.mediaUrl || null,
      thumbnailUrl: thumbUrl || null,
      duracionMin: data.duracionMin ? parseInt(data.duracionMin, 10) : null,
      orden: data.orden ? parseInt(data.orden, 10) : 0,
      activo: data.activo ?? true,
    };

    if (editing) {
      updateMut.mutate({ id: editing.id, data: payload }, {
        onSuccess: () => { toast.success('Contenido actualizado'); setModalVisible(false); },
        onError: (e: any) => toast.error('Error', e?.response?.data?.error?.message || 'No se pudo actualizar'),
      });
    } else {
      createMut.mutate(payload, {
        onSuccess: () => { toast.success('Contenido creado'); setModalVisible(false); },
        onError: (e: any) => toast.error('Error', e?.response?.data?.error?.message || 'No se pudo crear'),
      });
    }
  };

  const confirmDelete = async (item: EducationContent) => {
    const ok = await confirmAction({
      title: 'Eliminar contenido',
      message: `¿Eliminar "${item.titulo}"?`,
      confirmText: 'Eliminar',
      destructive: true,
    });
    if (!ok) return;
    deleteMut.mutate(item.id, {
      onSuccess: () => toast.success('Contenido eliminado'),
      onError: () => toast.error('Error', 'No se pudo eliminar'),
    });
  };

  const renderItem = ({ item }: { item: EducationContent }) => (
    <View style={styles.card}>
      <View style={styles.cardIcon}>
        <BookOpen size={20} color={BRAND} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.cardTitle} numberOfLines={1}>{item.titulo}</Text>
        <View style={styles.cardMeta}>
          <View style={styles.tag}><Text style={styles.tagText}>{TIPO_LABEL[item.tipo || ''] || item.tipo || '—'}</Text></View>
          <View style={styles.tag}><Text style={styles.tagText}>{CATEGORIA_LABEL[item.categoria || ''] || 'General'}</Text></View>
          {item.trimestre ? <View style={styles.tag}><Text style={styles.tagText}>T{item.trimestre}</Text></View> : null}
          {!item.activo ? <View style={[styles.tag, styles.tagInactive]}><Text style={styles.tagInactiveText}>Inactivo</Text></View> : null}
        </View>
      </View>
      <TouchableOpacity onPress={() => openEdit(item)} hitSlop={8} style={styles.iconBtn}>
        <Pencil size={18} color={commonColors.textSecondary} />
      </TouchableOpacity>
      <TouchableOpacity onPress={() => confirmDelete(item)} hitSlop={8} style={styles.iconBtn}>
        <Trash2 size={18} color={semanticColors.danger} />
      </TouchableOpacity>
    </View>
  );

  const filteredItems = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((it) => {
      if (filterCat && (it.categoria || 'general') !== filterCat) return false;
      if (q && !(`${it.titulo} ${it.contenido}`.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [items, search, filterCat]);

  const availableCats = React.useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => set.add(i.categoria || 'general'));
    return EDUCATION_CATEGORIAS.filter((c) => set.has(c));
  }, [items]);

  if (isLoading) return <LoadingScreen message="Cargando contenido..." />;

  const renderListHeader = () => (
    <View>
      <View style={styles.searchBox}>
        <Search size={18} color={commonColors.textTertiary} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar recurso…"
          placeholderTextColor={commonColors.textTertiary}
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch('')} hitSlop={10}><X size={16} color={commonColors.textTertiary} /></TouchableOpacity>
        ) : null}
      </View>
      {availableCats.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          <TouchableOpacity style={[styles.filterChip, !filterCat && styles.filterChipActive]} onPress={() => setFilterCat(null)}>
            <Text style={[styles.filterChipText, !filterCat && styles.filterChipTextActive]}>Todas</Text>
          </TouchableOpacity>
          {availableCats.map((c) => (
            <TouchableOpacity key={c} style={[styles.filterChip, filterCat === c && styles.filterChipActive]} onPress={() => setFilterCat(filterCat === c ? null : c)}>
              <Text style={[styles.filterChipText, filterCat === c && styles.filterChipTextActive]}>{CATEGORIA_LABEL[c]}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <LinearGradient colors={adminColors.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.headerGradient}>
        <SafeAreaView edges={['top']}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Contenido educativo</Text>
              <Text style={styles.subtitle}>{items.length} recurso(s) · {items.filter((i) => i.activo).length} activos</Text>
            </View>
            <TouchableOpacity style={styles.addBtn} onPress={openCreate} activeOpacity={0.8}>
              <Plus size={22} color={commonColors.white} />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <FlatList
        data={filteredItems}
        keyExtractor={(i) => i.id}
        renderItem={renderItem}
        ListHeaderComponent={renderListHeader}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={BRAND} />}
        ListEmptyComponent={
          <View style={{ marginTop: 60 }}>
            <EmptyState icon={BookOpen} title="Sin contenido" description={search || filterCat ? 'No hay recursos con ese filtro.' : 'Crea el primer recurso educativo para las gestantes.'} themeColor={BRAND} />
          </View>
        }
      />

      <AppModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title={editing ? 'Editar contenido' : 'Nuevo contenido'}
        footer={
          <>
            <AppButton title="Cancelar" variant="outline" onPress={() => setModalVisible(false)} style={{ flex: 1 }} />
            <AppButton
              title={editing ? 'Guardar' : 'Crear'}
              onPress={handleSubmit(onSubmit)}
              loading={createMut.isPending || updateMut.isPending}
              themeColor={BRAND}
              style={{ flex: 1 }}
            />
          </>
        }
      >
        {/* Portada (thumbnail) */}
        <Text style={styles.label}>Imagen de portada (opcional)</Text>
        <TouchableOpacity style={styles.thumbPicker} onPress={pickThumbnail} activeOpacity={0.8} disabled={uploadingThumb}>
          {uploadingThumb ? (
            <ActivityIndicator color={BRAND} />
          ) : thumbUrl ? (
            <Image source={{ uri: resolveMediaUrl(thumbUrl) || undefined }} style={styles.thumbPreview} resizeMode="cover" />
          ) : (
            <View style={styles.thumbPlaceholder}>
              <ImagePlus size={26} color={commonColors.textTertiary} />
              <Text style={styles.thumbPlaceholderText}>Subir portada</Text>
            </View>
          )}
        </TouchableOpacity>
        {thumbUrl && !uploadingThumb ? (
          <TouchableOpacity onPress={() => setThumbUrl(null)} style={styles.thumbRemove}>
            <X size={14} color={semanticColors.danger} />
            <Text style={styles.thumbRemoveText}>Quitar portada</Text>
          </TouchableOpacity>
        ) : null}

        <AppInput name="titulo" control={control} label="Título" placeholder="Ej. Cuidados en el primer trimestre" error={errors.titulo?.message} themeColor={BRAND} />
        <AppInput name="contenido" control={control} label="Contenido" placeholder="Texto del artículo o descripción" error={errors.contenido?.message} themeColor={BRAND} multiline numberOfLines={4} containerStyle={{ minHeight: 110 }} />

        <Text style={styles.label}>Tipo</Text>
        <Controller name="tipo" control={control} render={({ field: { onChange, value } }) => (
          <View style={styles.chipsWrap}>
            {EDUCATION_TIPOS.map((t) => (
              <TouchableOpacity key={t} style={[styles.chip, value === t && styles.chipActive]} onPress={() => onChange(t)}>
                <Text style={[styles.chipText, value === t && styles.chipTextActive]}>{TIPO_LABEL[t]}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )} />

        <Text style={styles.label}>Categoría</Text>
        <Controller name="categoria" control={control} render={({ field: { onChange, value } }) => (
          <View style={styles.chipsWrap}>
            {EDUCATION_CATEGORIAS.map((c) => (
              <TouchableOpacity key={c} style={[styles.chip, value === c && styles.chipActive]} onPress={() => onChange(c)}>
                <Text style={[styles.chipText, value === c && styles.chipTextActive]}>{CATEGORIA_LABEL[c]}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )} />

        <AppInput name="trimestre" control={control} label="Trimestre (1-3, opcional)" placeholder="Ej. 1" keyboardType="numeric" error={errors.trimestre?.message} themeColor={BRAND} />

        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <View style={{ flex: 1 }}>
            <AppInput name="semanaInicio" control={control} label="Semana inicio (op.)" placeholder="Ej. 1" keyboardType="numeric" error={errors.semanaInicio?.message} themeColor={BRAND} />
          </View>
          <View style={{ flex: 1 }}>
            <AppInput name="semanaFin" control={control} label="Semana fin (op.)" placeholder="Ej. 13" keyboardType="numeric" error={errors.semanaFin?.message} themeColor={BRAND} />
          </View>
        </View>

        <AppInput name="mediaUrl" control={control} label="URL del recurso (opcional)" placeholder="https://… (video, audio, infografía)" error={errors.mediaUrl?.message} themeColor={BRAND} />
        <TouchableOpacity style={styles.uploadMediaBtn} onPress={pickMediaImage} activeOpacity={0.7} disabled={uploadingMedia}>
          {uploadingMedia ? <ActivityIndicator size="small" color={BRAND} /> : <ImagePlus size={16} color={BRAND} />}
          <Text style={styles.uploadMediaText}>{uploadingMedia ? 'Subiendo…' : 'Subir imagen (infografía)'}</Text>
        </TouchableOpacity>
        {watch('mediaUrl') && (watch('mediaUrl') || '').startsWith('/uploads/') ? (
          <Image source={{ uri: resolveMediaUrl(watch('mediaUrl')) || undefined }} style={styles.mediaPreview} resizeMode="cover" />
        ) : null}

        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <View style={{ flex: 1 }}>
            <AppInput name="duracionMin" control={control} label="Duración (min)" placeholder="Ej. 15" keyboardType="numeric" error={errors.duracionMin?.message} themeColor={BRAND} />
          </View>
          <View style={{ flex: 1 }}>
            <AppInput name="orden" control={control} label="Orden" placeholder="Ej. 0" keyboardType="numeric" error={errors.orden?.message} themeColor={BRAND} />
          </View>
        </View>

        <Controller name="activo" control={control} render={({ field: { onChange, value } }) => (
          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.switchLabel}>Publicado</Text>
              <Text style={styles.switchHint}>{value ? 'Visible para las gestantes' : 'Oculto (borrador)'}</Text>
            </View>
            <Switch value={value ?? true} onValueChange={onChange} trackColor={{ false: commonColors.border, true: BRAND }} thumbColor={commonColors.white} />
          </View>
        )} />
      </AppModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: commonColors.background },
  headerGradient: { borderBottomLeftRadius: borderRadius.xxl, borderBottomRightRadius: borderRadius.xxl, paddingBottom: spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  title: { ...typography.h1, color: commonColors.white },
  subtitle: { ...typography.bodySm, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  addBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  list: { padding: spacing.lg, paddingTop: spacing.sm, paddingBottom: layout.tabBarSpace },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: commonColors.surface, borderRadius: borderRadius.lg,
    padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: commonColors.border,
  },
  cardIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: obstetraColors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { ...typography.bodyMedium, fontWeight: '700', color: commonColors.text },
  cardMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  tag: { backgroundColor: commonColors.surfaceAlt, borderRadius: borderRadius.sm, paddingHorizontal: 8, paddingVertical: 2 },
  tagText: { ...typography.overline, color: commonColors.textSecondary, letterSpacing: 0 },
  tagInactive: { backgroundColor: semanticColors.dangerLight },
  tagInactiveText: { ...typography.overline, color: semanticColors.danger, letterSpacing: 0 },
  iconBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  label: { ...typography.label, color: commonColors.textSecondary, marginBottom: spacing.sm, marginTop: spacing.md },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: borderRadius.md, backgroundColor: commonColors.surfaceAlt, borderWidth: 1, borderColor: commonColors.border },
  chipActive: { backgroundColor: BRAND, borderColor: BRAND },
  chipText: { ...typography.bodySmall, color: commonColors.textSecondary },
  chipTextActive: { color: obstetraColors.onPrimary, fontWeight: '700' },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: commonColors.surface, borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md, height: 44, marginBottom: spacing.sm,
    borderWidth: 1, borderColor: commonColors.border,
  },
  searchInput: { flex: 1, ...typography.body, fontSize: 15, color: commonColors.text },
  filterRow: { gap: spacing.sm, paddingBottom: spacing.sm },
  filterChip: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: borderRadius.full, backgroundColor: commonColors.surface, borderWidth: 1, borderColor: commonColors.border },
  filterChipActive: { backgroundColor: BRAND, borderColor: BRAND },
  filterChipText: { ...typography.caption, fontWeight: '600', color: commonColors.textSecondary },
  filterChipTextActive: { color: commonColors.white },
  switchRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: commonColors.borderLight },
  switchLabel: { ...typography.bodyMedium, color: commonColors.text, fontWeight: '600' },
  switchHint: { ...typography.caption, color: commonColors.textSecondary, marginTop: 2 },
  thumbPicker: { height: 140, borderRadius: borderRadius.lg, backgroundColor: commonColors.surfaceAlt, borderWidth: 1, borderColor: commonColors.border, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  thumbPreview: { width: '100%', height: '100%' },
  thumbPlaceholder: { alignItems: 'center', gap: 6 },
  thumbPlaceholderText: { ...typography.caption, color: commonColors.textTertiary },
  thumbRemove: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', marginTop: spacing.sm },
  thumbRemoveText: { ...typography.caption, color: semanticColors.danger },
  uploadMediaBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginTop: spacing.sm },
  uploadMediaText: { ...typography.caption, color: BRAND, fontWeight: '600' },
  mediaPreview: { width: '100%', height: 140, borderRadius: borderRadius.lg, backgroundColor: commonColors.surfaceAlt, marginTop: spacing.sm },
});
