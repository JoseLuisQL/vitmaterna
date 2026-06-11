import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, StatusBar, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Building2, Plus, Trash2, Pencil, Phone, MapPin, Mountain } from 'lucide-react-native';
import { AppModal, AppButton, useToast } from '../../../src/components/ui';
import { LoadingScreen } from '../../../src/components/ui/LoadingScreen';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import {
  useFacilities, useCreateFacility, useUpdateFacility, useDeleteFacility,
} from '../../../src/services/admin-queries';
import { commonColors, obstetraColors, semanticColors } from '../../../src/theme/colors';
import { typography } from '../../../src/theme/typography';
import { spacing, borderRadius } from '../../../src/theme/spacing';

const BRAND = obstetraColors.primary;

interface FacilityForm {
  id?: string;
  nombre: string;
  codigo: string;
  direccion: string;
  telefono: string;
  altitudMsnm: string;
  servicios: string;
}

const emptyForm: FacilityForm = {
  nombre: '', codigo: '', direccion: '', telefono: '', altitudMsnm: '2926', servicios: '',
};

export default function SedesScreen(): React.ReactElement {
  const toast = useToast();
  const { data: facilities, isLoading } = useFacilities();
  const createMut = useCreateFacility();
  const updateMut = useUpdateFacility();
  const deleteMut = useDeleteFacility();

  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState<FacilityForm>(emptyForm);

  const openCreate = () => { setForm(emptyForm); setModalVisible(true); };
  const openEdit = (f: any) => {
    setForm({
      id: f.id,
      nombre: f.nombre || '',
      codigo: f.codigo || '',
      direccion: f.direccion || '',
      telefono: f.telefono || '',
      altitudMsnm: String(f.altitudMsnm ?? 2926),
      servicios: (f.servicios || []).join(', '),
    });
    setModalVisible(true);
  };

  const handleSave = () => {
    if (!form.nombre.trim()) return toast.error('Falta el nombre', 'Indica el nombre del establecimiento.');
    const payload = {
      nombre: form.nombre.trim(),
      codigo: form.codigo || null,
      direccion: form.direccion || null,
      telefono: form.telefono || null,
      altitudMsnm: parseInt(form.altitudMsnm, 10) || 2926,
      servicios: form.servicios ? form.servicios.split(',').map((s) => s.trim()).filter(Boolean) : [],
    };
    const onSuccess = () => { toast.success(form.id ? 'Sede actualizada' : 'Sede creada'); setModalVisible(false); };
    const onError = () => toast.error('Error', 'No se pudo guardar la sede.');
    if (form.id) updateMut.mutate({ id: form.id, data: payload }, { onSuccess, onError });
    else createMut.mutate(payload, { onSuccess, onError });
  };

  const confirmDelete = (f: any) => {
    Alert.alert('Eliminar sede', `¿Eliminar "${f.nombre}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive',
        onPress: () => deleteMut.mutate(f.id, {
          onSuccess: () => toast.success('Sede eliminada'),
          onError: () => toast.error('Error', 'No se pudo eliminar.'),
        }),
      },
    ]);
  };

  if (isLoading) return <LoadingScreen message="Cargando establecimientos..." />;

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardIcon}>
        <Building2 size={22} color={BRAND} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.cardName}>{item.nombre}</Text>
          {!item.activo && <Text style={styles.inactiveBadge}>Inactivo</Text>}
        </View>
        {item.codigo ? <Text style={styles.cardMeta}>Código: {item.codigo}</Text> : null}
        {item.direccion ? (
          <View style={styles.metaRow}><MapPin size={13} color={commonColors.textSecondary} /><Text style={styles.cardMeta}>{item.direccion}</Text></View>
        ) : null}
        {item.telefono ? (
          <View style={styles.metaRow}><Phone size={13} color={commonColors.textSecondary} /><Text style={styles.cardMeta}>{item.telefono}</Text></View>
        ) : null}
        <View style={styles.metaRow}><Mountain size={13} color={commonColors.textSecondary} /><Text style={styles.cardMeta}>{item.altitudMsnm} msnm</Text></View>
      </View>
      <View style={styles.cardActions}>
        <TouchableOpacity onPress={() => openEdit(item)} hitSlop={8} style={styles.actionBtn}>
          <Pencil size={18} color={BRAND} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => confirmDelete(item)} hitSlop={8} style={[styles.actionBtn, styles.deleteBtn]}>
          <Trash2 size={18} color={semanticColors.danger} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerWrapper}>
        <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
        <SafeAreaView edges={['top']} style={styles.safeAreaHeader}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.headerTitle}>Establecimientos</Text>
              <Text style={styles.headerSubtitle}>Sedes del centro de salud</Text>
            </View>
            <TouchableOpacity style={styles.addBtn} onPress={openCreate}>
              <Plus size={18} color={obstetraColors.onPrimary} />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>

      <FlatList
        data={facilities}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={{ paddingTop: spacing.xl }}>
            <EmptyState icon={Building2 as any} title="Sin establecimientos" description="Registra el primer establecimiento de salud." themeColor={BRAND} />
          </View>
        }
      />

      <AppModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title={form.id ? 'Editar establecimiento' : 'Nuevo establecimiento'}
        footer={
          <>
            <AppButton title="Cancelar" variant="outline" onPress={() => setModalVisible(false)} style={{ flex: 1 }} />
            <AppButton title="Guardar" onPress={handleSave} style={{ flex: 1 }} themeColor={BRAND} loading={createMut.isPending || updateMut.isPending} />
          </>
        }
      >
        <View style={{ gap: 14 }}>
          <Field label="Nombre *"><TextInput style={styles.input} value={form.nombre} onChangeText={(t) => setForm({ ...form, nombre: t })} placeholder="C.S. Talavera" placeholderTextColor={commonColors.textTertiary} /></Field>
          <Field label="Código"><TextInput style={styles.input} value={form.codigo} onChangeText={(t) => setForm({ ...form, codigo: t })} placeholder="CS001" placeholderTextColor={commonColors.textTertiary} /></Field>
          <Field label="Dirección"><TextInput style={styles.input} value={form.direccion} onChangeText={(t) => setForm({ ...form, direccion: t })} placeholder="Av. Principal 123" placeholderTextColor={commonColors.textTertiary} /></Field>
          <Field label="Teléfono"><TextInput style={styles.input} value={form.telefono} onChangeText={(t) => setForm({ ...form, telefono: t })} keyboardType="phone-pad" placeholder="083421800" placeholderTextColor={commonColors.textTertiary} /></Field>
          <Field label="Altitud (msnm)"><TextInput style={styles.input} value={form.altitudMsnm} onChangeText={(t) => setForm({ ...form, altitudMsnm: t })} keyboardType="number-pad" placeholder="2926" placeholderTextColor={commonColors.textTertiary} /></Field>
          <Field label="Servicios (separados por coma)"><TextInput style={[styles.input, { height: 70 }]} value={form.servicios} onChangeText={(t) => setForm({ ...form, servicios: t })} multiline placeholder="control prenatal, laboratorio, ecografía" placeholderTextColor={commonColors.textTertiary} /></Field>
        </View>
      </AppModal>
    </View>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <View style={{ gap: 6 }}><Text style={styles.inputLabel}>{label}</Text>{children}</View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: commonColors.background },
  headerWrapper: { paddingBottom: spacing.md },
  safeAreaHeader: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { ...typography.display, color: commonColors.text },
  headerSubtitle: { ...typography.bodySmall, color: commonColors.textSecondary, marginTop: 2 },
  addBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: BRAND, alignItems: 'center', justifyContent: 'center' },
  listContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  card: { flexDirection: 'row', gap: spacing.md, backgroundColor: commonColors.surface, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: commonColors.border, padding: spacing.md, marginBottom: spacing.md },
  cardIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: obstetraColors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardName: { ...typography.bodyMedium, fontFamily: typography.h3.fontFamily, color: commonColors.text },
  inactiveBadge: { ...typography.micro, color: semanticColors.danger, backgroundColor: semanticColors.dangerLight, borderRadius: borderRadius.full, paddingHorizontal: 8, paddingVertical: 2, textTransform: 'uppercase', overflow: 'hidden' },
  cardMeta: { ...typography.caption, color: commonColors.textSecondary },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  cardActions: { gap: 8 },
  actionBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: obstetraColors.primaryLight },
  deleteBtn: { backgroundColor: semanticColors.dangerLight },
  inputLabel: { ...typography.caption, fontFamily: typography.label.fontFamily, fontWeight: '600', color: commonColors.textSecondary },
  input: { backgroundColor: commonColors.surfaceAlt, borderWidth: 1, borderColor: commonColors.border, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, ...typography.bodySmall, fontSize: 15, color: commonColors.text },
});
