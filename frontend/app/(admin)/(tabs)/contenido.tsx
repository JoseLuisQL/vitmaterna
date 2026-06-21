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
import { Plus, Pencil, Trash2, BookOpen, Search, X, ImagePlus, Eye, TrendingUp, Menu } from 'lucide-react-native';
import { useSidebar } from '../../../src/components/layout/SidebarProvider';
import { ScreenLayout } from '../../../src/components/layout/ScreenLayout';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import * as ImagePicker from 'expo-image-picker';
import api, { resolveMediaUrl } from '../../../src/services/api';
import { AppInput } from '../../../src/components/ui/AppInput';
import { AppButton } from '../../../src/components/ui/AppButton';
import { AppModal } from '../../../src/components/ui/AppModal';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { AppBadge } from '../../../src/components/ui/AppBadge';
import { ListSkeleton } from '../../../src/components/ui/SkeletonLoader';
import { useToast, RichText } from '../../../src/components/ui';
import { SearchField } from '../../../src/components/ui/Field';
import { DataTable, type DataTableColumn } from '../../../src/components/web';
import { categoryMeta, typeMeta, readingTime } from '../../../src/utils/educationMeta';
import { confirmAction } from '../../../src/utils/confirm';
import { useDebouncedValue } from '../../../src/hooks/useDebouncedValue';
import { LinearGradient } from 'expo-linear-gradient';
import { commonColors, obstetraColors, adminColors, semanticColors } from '../../../src/theme/colors';
import { spacing, borderRadius, layout, webLayout } from '../../../src/theme/spacing';
import { useResponsive } from '../../../src/theme/responsive';
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

/** Valida un entero opcional dentro de un rango (campo de texto). */
const optIntInRange = (label: string, min: number, max: number) =>
  z
    .string()
    .optional()
    .refine((v) => {
      if (!v || !v.trim()) return true;
      const n = Number(v);
      return Number.isInteger(n) && n >= min && n <= max;
    }, `${label} entre ${min} y ${max}`);

const schema = z.object({
  titulo: z.string().min(1, 'El título es requerido').max(200, 'Máximo 200 caracteres'),
  contenido: z.string().min(1, 'El contenido es requerido'),
  tipo: z.enum(EDUCATION_TIPOS),
  categoria: z.enum(EDUCATION_CATEGORIAS),
  trimestre: optIntInRange('Trimestre', 1, 3),
  semanaInicio: optIntInRange('Semana inicio', 1, 42),
  semanaFin: optIntInRange('Semana fin', 1, 42),
  mediaUrl: z
    .string()
    .optional()
    .refine((v) => !v || !v.trim() || /^https?:\/\//.test(v.trim()) || v.startsWith('/uploads/'), 'Debe ser una URL válida (http/https)'),
  thumbnailUrl: z.string().optional(),
  duracionMin: optIntInRange('Duración', 1, 600),
  orden: optIntInRange('Orden', 0, 9999),
  activo: z.boolean().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function ContenidoScreen(): React.ReactElement {
  const toast = useToast();
  const { open: openSidebar } = useSidebar();
  const { webShell } = useResponsive();
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
  // Previsualización de cómo verá la gestante el contenido (modal aparte).
  const [previewVisible, setPreviewVisible] = useState(false);

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
          <View style={styles.viewsTag}>
            <Eye size={11} color={commonColors.textSecondary} />
            <Text style={styles.tagText}>{item.viewsCount ?? 0}</Text>
          </View>
          {!item.activo ? <View style={[styles.tag, styles.tagInactive]}><Text style={styles.tagInactiveText}>Inactivo</Text></View> : null}
        </View>
      </View>
      <TouchableOpacity onPress={() => openEdit(item)} hitSlop={8} style={styles.iconBtn} accessibilityRole="button" accessibilityLabel={`Editar ${item.titulo}`}>
        <Pencil size={18} color={commonColors.textSecondary} />
      </TouchableOpacity>
      <TouchableOpacity onPress={() => confirmDelete(item)} hitSlop={8} style={styles.iconBtn} accessibilityRole="button" accessibilityLabel={`Eliminar ${item.titulo}`}>
        <Trash2 size={18} color={semanticColors.danger} />
      </TouchableOpacity>
    </View>
  );

  const debouncedSearch = useDebouncedValue(search, 400);
  const filteredItems = React.useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    return items.filter((it) => {
      if (filterCat && (it.categoria || 'general') !== filterCat) return false;
      if (q && !(`${it.titulo} ${it.contenido}`.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [items, debouncedSearch, filterCat]);

  const availableCats = React.useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => set.add(i.categoria || 'general'));
    return EDUCATION_CATEGORIAS.filter((c) => set.has(c));
  }, [items]);



  const totalViews = React.useMemo(() => items.reduce((a, i) => a + (i.viewsCount || 0), 0), [items]);
  const topRead = React.useMemo(
    () => [...items].filter((i) => (i.viewsCount || 0) > 0).sort((a, b) => (b.viewsCount || 0) - (a.viewsCount || 0)).slice(0, 3),
    [items],
  );

  const renderListHeader = () => (
    <View>
      {/* Resumen de lecturas */}
      <View style={styles.statsCard}>
        <View style={styles.statsHeaderRow}>
          <TrendingUp size={16} color={BRAND} />
          <Text style={styles.statsTitle}>Estadísticas de lectura</Text>
          <Text style={styles.statsTotal}>{totalViews} vistas</Text>
        </View>
        {topRead.length > 0 ? (
          topRead.map((it, i) => (
            <View key={it.id} style={styles.topRow}>
              <Text style={styles.topRank}>{i + 1}</Text>
              <Text style={styles.topTitle} numberOfLines={1}>{it.titulo}</Text>
              <View style={styles.viewsTag}>
                <Eye size={11} color={commonColors.textSecondary} />
                <Text style={styles.tagText}>{it.viewsCount}</Text>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.statsEmpty}>Aún no hay lecturas registradas.</Text>
        )}
      </View>

      <SearchField
        value={search}
        onChangeText={setSearch}
        placeholder="Buscar recurso…"
        containerStyle={styles.searchBox}
      />
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

  const contentList = (
      <FlatList
        data={isLoading ? [] : filteredItems}
        keyExtractor={(i) => i.id}
        renderItem={renderItem}
        ListHeaderComponent={renderListHeader}
        contentContainerStyle={[styles.list, webShell ? styles.listWeb : null]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={BRAND} />}
        ListEmptyComponent={
          isLoading ? (
            <View style={{ paddingTop: spacing.md }}><ListSkeleton count={6} /></View>
          ) : (
            <View style={{ marginTop: 60 }}>
              <EmptyState icon={BookOpen as any} title="Sin contenido" description={search || filterCat ? 'No hay recursos con ese filtro.' : 'Crea el primer recurso educativo para las gestantes.'} themeColor={BRAND} />
            </View>
          )
        }
      />
  );

  const tableColumns: DataTableColumn<EducationContent>[] = [
    {
      key: 'titulo',
      header: 'Título del Recurso',
      flex: 2,
      sortValue: (u) => u.titulo.toLowerCase(),
      render: (u) => (
        <View style={styles.tableTitleCell}>
          <View style={styles.tableIcon}>
            <BookOpen size={16} color={BRAND} />
          </View>
          <Text style={styles.tableName} numberOfLines={1}>{u.titulo}</Text>
        </View>
      ),
    },
    {
      key: 'tipo',
      header: 'Tipo',
      width: 120,
      align: 'center',
      sortValue: (u) => u.tipo || '',
      render: (u) => <AppBadge label={TIPO_LABEL[u.tipo || ''] || u.tipo || '—'} variant="default" size="sm" />,
    },
    {
      key: 'categoria',
      header: 'Categoría',
      width: 140,
      align: 'center',
      sortValue: (u) => u.categoria || '',
      render: (u) => <AppBadge label={CATEGORIA_LABEL[u.categoria || ''] || 'General'} variant="info" size="sm" />,
    },
    {
      key: 'vistas',
      header: 'Vistas',
      width: 90,
      align: 'center',
      sortValue: (u) => u.viewsCount || 0,
      render: (u) => (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
          <Eye size={14} color={commonColors.textSecondary} />
          <Text style={{ ...typography.bodySm, color: commonColors.textSecondary }}>{u.viewsCount || 0}</Text>
        </View>
      ),
    },
    {
      key: 'estado',
      header: 'Estado',
      width: 100,
      align: 'center',
      sortValue: (u) => (u.activo ? 1 : 0),
      render: (u) => <AppBadge label={u.activo ? 'Activo' : 'Inactivo'} variant={u.activo ? 'success' : 'danger'} size="sm" />,
    },
    {
      key: 'acciones',
      header: '',
      width: 100,
      align: 'right',
      render: (u) => (
        <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'flex-end', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => openEdit(u)} hitSlop={8} style={{ padding: 4, cursor: 'pointer', outlineStyle: 'none' } as any} accessibilityRole="button" accessibilityLabel={`Editar ${u.titulo}`}>
            <Pencil size={18} color={commonColors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => confirmDelete(u)} hitSlop={8} style={{ padding: 4, cursor: 'pointer', outlineStyle: 'none' } as any} accessibilityRole="button" accessibilityLabel={`Eliminar ${u.titulo}`}>
            <Trash2 size={18} color={semanticColors.danger} />
          </TouchableOpacity>
        </View>
      ),
    },
  ];

  const webBody = (
    <ScreenLayout
      role="admin"
      title="Contenido educativo"
      subtitle={`${items.length} recurso(s) · ${items.filter((i) => i.activo).length} activos`}
      scroll={false}
      width="full"
      accentColor={adminColors.primary}
    >
      <>
        <View style={styles.webToolbar}>
          <SearchField
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar contenido..."
            containerStyle={styles.webSearchBox}
          />
          <TouchableOpacity style={styles.webCreateBtn} onPress={openCreate} activeOpacity={0.85}>
            <Plus size={18} color={commonColors.white} />
            <Text style={styles.webCreateText}>Nuevo contenido</Text>
          </TouchableOpacity>
        </View>
        {availableCats.length > 0 && (
          <View style={styles.webFilterRow}>
            <TouchableOpacity style={[styles.filterChip, !filterCat && styles.filterChipActive]} onPress={() => setFilterCat(null)}>
              <Text style={[styles.filterChipText, !filterCat && styles.filterChipTextActive]}>Todas</Text>
            </TouchableOpacity>
            {availableCats.map((c) => (
              <TouchableOpacity key={c} style={[styles.filterChip, filterCat === c && styles.filterChipActive]} onPress={() => setFilterCat(filterCat === c ? null : c)}>
                <Text style={[styles.filterChipText, filterCat === c && styles.filterChipTextActive]}>{CATEGORIA_LABEL[c]}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </>

      <DataTable
        columns={tableColumns}
        data={filteredItems ?? []}
        keyExtractor={(u) => u.id}
        loading={isLoading}
        onRowPress={(u) => openEdit(u)}
        rowLabel={(u: any) => `Editar contenido: ${u.titulo || ''}`.trim()}
        emptyIcon={BookOpen as any}
        emptyTitle="Sin contenido"
        emptyMessage={search || filterCat ? 'No hay recursos con ese filtro.' : 'Crea el primer recurso educativo para las gestantes.'}
        emptyAccent={adminColors.primary}
      />
    </ScreenLayout>
  );

  return (
    <View style={styles.container}>
      {webShell ? webBody : (
        <>
          <LinearGradient colors={adminColors.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.headerGradient}>
            <SafeAreaView edges={['top']}>
              <View style={styles.header}>
                <TouchableOpacity style={styles.menuBtn} onPress={openSidebar} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel="Abrir menú">
                  <Menu size={22} color={commonColors.white} />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>Contenido educativo</Text>
                  <Text style={styles.subtitle}>{items.length} recurso(s) · {items.filter((i) => i.activo).length} activos</Text>
                </View>
                <TouchableOpacity style={styles.addBtn} onPress={openCreate} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel="Crear contenido educativo">
                  <Plus size={22} color={commonColors.white} />
                </TouchableOpacity>
              </View>
            </SafeAreaView>
          </LinearGradient>
          {contentList}
        </>
      )}

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
        <AppInput name="contenido" control={control} label="Contenido" placeholder={'Escribe el artículo. Puedes usar formato:\n## Título de sección\n- viñeta\n**negrita**\n> cita destacada'} error={errors.contenido?.message} themeColor={BRAND} multiline numberOfLines={8} containerStyle={{ minHeight: 180 }} />
        <View style={styles.formatHintRow}>
          <Text style={styles.formatHint}>
            Formato: <Text style={styles.formatCode}>## Sección</Text> · <Text style={styles.formatCode}>### Subtítulo</Text> · <Text style={styles.formatCode}>- viñeta</Text> · <Text style={styles.formatCode}>1. lista</Text> · <Text style={styles.formatCode}>**negrita**</Text> · <Text style={styles.formatCode}>&gt; cita</Text>
          </Text>
          <TouchableOpacity
            style={styles.previewBtn}
            onPress={() => setPreviewVisible(true)}
            disabled={!watch('contenido')?.trim()}
            activeOpacity={0.7}
          >
            <Eye size={15} color={!watch('contenido')?.trim() ? commonColors.textTertiary : BRAND} />
            <Text style={[styles.previewBtnText, !watch('contenido')?.trim() && { color: commonColors.textTertiary }]}>Vista previa</Text>
          </TouchableOpacity>
        </View>

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

      {/* MODAL: VISTA PREVIA (cómo lo verá la gestante) */}
      <AppModal
        visible={previewVisible}
        onClose={() => setPreviewVisible(false)}
        title="Vista previa"
        subtitle="Así verá la gestante este contenido."
      >
        {(() => {
          const cm = categoryMeta(watch('categoria'));
          const tm = typeMeta(watch('tipo'));
          const CIcon = cm.icon;
          return (
            <ScrollView style={{ maxHeight: 460 }} showsVerticalScrollIndicator={false}>
              {thumbUrl ? (
                <Image source={{ uri: resolveMediaUrl(thumbUrl) || undefined }} style={styles.previewCover} resizeMode="cover" />
              ) : null}
              <View style={[styles.previewCatRow, { backgroundColor: cm.bg }]}>
                <CIcon size={16} color={cm.color} />
                <Text style={[styles.previewCat, { color: cm.color }]}>{cm.label}</Text>
              </View>
              <Text style={styles.previewTitle}>{watch('titulo') || 'Sin título'}</Text>
              <Text style={styles.previewMeta}>
                {tm.label} · {readingTime(watch('contenido') || '', watch('duracionMin') ? Number(watch('duracionMin')) : null)}
                {watch('trimestre') ? ` · ${watch('trimestre')}° trimestre` : ''}
              </Text>
              <View style={{ height: 1, backgroundColor: commonColors.borderLight, marginVertical: spacing.md }} />
              <RichText content={watch('contenido') || ''} accentColor={cm.color} />
            </ScrollView>
          );
        })()}
      </AppModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: commonColors.background },
  headerGradient: { borderBottomLeftRadius: borderRadius.xxl, borderBottomRightRadius: borderRadius.xxl, paddingBottom: spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm2, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  menuBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: commonColors.onColorSurface, alignItems: 'center', justifyContent: 'center' },
  title: { ...typography.h1, color: commonColors.white },
  subtitle: { ...typography.bodySm, color: commonColors.onColorTextSoft, marginTop: 2 },
  addBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: commonColors.onColorSurfaceStrong, alignItems: 'center', justifyContent: 'center' },
  webCreateBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: adminColors.primary, borderRadius: borderRadius.lg, paddingHorizontal: spacing.lg, height: 44 },
  webCreateText: { ...typography.button, color: commonColors.white, fontSize: 14 },
  list: { padding: spacing.lg, paddingTop: spacing.sm, paddingBottom: layout.tabBarSpace },
  listWeb: { width: '100%', paddingBottom: spacing.xl },
  webToolbar: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.md, marginBottom: spacing.md },
  webSearchBox: { flex: 1 },
  webFilterRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap', marginBottom: spacing.md },
  tableTitleCell: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  tableIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: adminColors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  tableName: { ...typography.bodySm, fontWeight: '600', color: commonColors.text, flex: 1, minWidth: 0 },
  // Editor: ayuda de formato + botón de previsualización
  formatHintRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, marginTop: -spacing.sm, marginBottom: spacing.md },
  formatHint: { ...typography.caption, color: commonColors.textTertiary, flex: 1, lineHeight: 16 },
  formatCode: { ...typography.caption, color: commonColors.textSecondary, fontWeight: '700' },
  previewBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: spacing.sm2, paddingVertical: 7, borderRadius: borderRadius.full, backgroundColor: obstetraColors.primaryLight },
  previewBtnText: { ...typography.caption, fontWeight: '700', color: BRAND },
  // Vista previa
  previewCover: { width: '100%', height: 150, borderRadius: borderRadius.lg, backgroundColor: commonColors.surfaceAlt, marginBottom: spacing.md },
  previewCatRow: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: spacing.sm2, paddingVertical: 5, borderRadius: borderRadius.full, marginBottom: spacing.sm },
  previewCat: { ...typography.overline, fontWeight: '700' },
  previewTitle: { ...typography.h2, color: commonColors.text, marginBottom: spacing.xs },
  previewMeta: { ...typography.caption, color: commonColors.textSecondary },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: commonColors.surface, borderRadius: borderRadius.lg,
    padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: commonColors.border,
  },
  cardIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: obstetraColors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { ...typography.bodyMd, fontWeight: '700', color: commonColors.text },
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
  chipText: { ...typography.bodySm, color: commonColors.textSecondary },
  chipTextActive: { color: obstetraColors.onPrimary, fontWeight: '700' },
  searchBox: { marginBottom: spacing.sm },
  filterRow: { gap: spacing.sm, paddingBottom: spacing.sm },
  filterChip: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: borderRadius.full, backgroundColor: commonColors.surface, borderWidth: 1, borderColor: commonColors.border },
  filterChipActive: { backgroundColor: BRAND, borderColor: BRAND },
  filterChipText: { ...typography.caption, fontWeight: '600', color: commonColors.textSecondary },
  filterChipTextActive: { color: commonColors.white },
  switchRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: commonColors.borderLight },
  switchLabel: { ...typography.bodyMd, color: commonColors.text, fontWeight: '600' },
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
  viewsTag: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: commonColors.surfaceAlt, borderRadius: borderRadius.sm, paddingHorizontal: 8, paddingVertical: 2 },
  statsCard: { backgroundColor: commonColors.surface, borderRadius: borderRadius.lg, padding: spacing.md, marginBottom: spacing.md, borderWidth: 1, borderColor: commonColors.border },
  statsHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.sm },
  statsTitle: { ...typography.bodySm, fontWeight: '700', color: commonColors.text, flex: 1 },
  statsTotal: { ...typography.caption, fontWeight: '700', color: BRAND },
  statsEmpty: { ...typography.caption, color: commonColors.textTertiary },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 5 },
  topRank: { ...typography.caption, fontWeight: '800', color: BRAND, width: 16 },
  topTitle: { flex: 1, ...typography.caption, color: commonColors.text },
});
