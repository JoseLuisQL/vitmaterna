import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from './api';

// --- Admin Users ---
export const fetchUsers = async () => {
  const res = await api.get('/admin/users');
  return res.data?.data || [];
};

export const approveUser = async (id: string) => {
  const res = await api.put(`/admin/users/${id}/approve`);
  return res.data;
};

export const useAdminUsers = () => useQuery({ queryKey: ['adminUsers'], queryFn: fetchUsers });

export const useApproveUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: approveUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
    },
  });
};

export const toggleUserActive = async (id: string) => {
  const res = await api.put(`/admin/users/${id}/toggle-active`);
  return res.data;
};

export const useToggleUserActive = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: toggleUserActive,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
    },
  });
};

// --- Admin Education Content ---

/** Tipos y categorías válidos (alineados con el enum del backend). */
export const EDUCATION_TIPOS = ['articulo', 'infografia', 'video', 'audio', 'faq'] as const;
export const EDUCATION_CATEGORIAS = [
  'nutricion',
  'suplementos',
  'signos_alarma',
  'parto',
  'lactancia',
  'cuidado_bebe',
  'salud_mental',
  'general',
] as const;

export interface EducationContent {
  id: string;
  titulo: string;
  contenido: string;
  tipo?: string;
  categoria?: string;
  trimestre?: number | null;
  semanaInicio?: number | null;
  semanaFin?: number | null;
  mediaUrl?: string | null;
  thumbnailUrl?: string | null;
  duracionMin?: number | null;
  orden: number;
  activo: boolean;
  viewsCount?: number;
}

export const fetchEducationContent = async (): Promise<EducationContent[]> => {
  const res = await api.get('/admin/education');
  return res.data?.data || [];
};

export const useEducationContent = () =>
  useQuery({ queryKey: ['adminEducation'], queryFn: fetchEducationContent });

export const createEducationContent = async (data: any) => {
  const res = await api.post('/admin/education', data);
  return res.data;
};

export const useCreateEducationContent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createEducationContent,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['adminEducation'] }),
  });
};

export const useUpdateEducationContent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await api.put(`/admin/education/${id}`, data);
      return res.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['adminEducation'] }),
  });
};

export const useDeleteEducationContent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/admin/education/${id}`);
      return res.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['adminEducation'] }),
  });
};

// --- Admin Config ---
export const fetchSystemConfig = async () => {
  const res = await api.get('/admin/config');
  const arr = res.data?.data || [];
  const configObj: Record<string, any> = {};
  arr.forEach((item: any) => {
    configObj[item.clave] = item.valor;
  });
  return configObj;
};

export const updateSystemConfig = async (data: any) => {
  const res = await api.put('/admin/config', data);
  return res.data;
};

export const useSystemConfig = () => useQuery({ queryKey: ['adminConfig'], queryFn: fetchSystemConfig });

export const useUpdateSystemConfig = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateSystemConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminConfig'] });
    },
  });
};

// --- Admin Audit Logs ---
export const fetchAuditLogs = async () => {
  const res = await api.get('/admin/audit-logs');
  return res.data?.data || [];
};

export const useAuditLogs = () => useQuery({ queryKey: ['adminAuditLogs'], queryFn: fetchAuditLogs });

// --- Admin Backup ---
export const exportBackup = async () => {
  // El endpoint de respaldo es de lectura (GET), genera un dump JSON.
  const res = await api.get('/admin/backup');
  return res.data?.data || res.data;
};

export const useExportBackup = () => {
  return useMutation({
    mutationFn: exportBackup,
  });
};

export const createUser = async (data: any) => {
  const res = await api.post('/admin/users', data);
  return res.data;
};

export const useCreateUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
    },
  });
};

// --- Establecimientos de salud (RF-10.02) ---
export const fetchFacilities = async () => {
  const res = await api.get('/admin/facilities');
  return res.data?.data || [];
};

export const useFacilities = () => useQuery({ queryKey: ['adminFacilities'], queryFn: fetchFacilities });

export const useCreateFacility = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post('/admin/facilities', data);
      return res.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['adminFacilities'] }),
  });
};

export const useUpdateFacility = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await api.put(`/admin/facilities/${id}`, data);
      return res.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['adminFacilities'] }),
  });
};

export const useDeleteFacility = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/admin/facilities/${id}`);
      return res.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['adminFacilities'] }),
  });
};

// --- Notification Channels (SMS / WhatsApp) ---
export interface ChannelsStatus {
  sms: { provider: string; configured: boolean; fromNumber: string | null };
  whatsapp: { provider: string; configured: boolean; phoneNumberId: string | null };
}

export const fetchChannelsConfig = async (): Promise<ChannelsStatus> => {
  const res = await api.get('/notifications/channels/config');
  return res.data?.data;
};

export const useChannelsConfig = () =>
  useQuery({ queryKey: ['channelsConfig'], queryFn: fetchChannelsConfig });

export const useUpdateSmsConfig = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { provider: 'twilio' | 'mock'; accountSid?: string; authToken?: string; fromNumber?: string }) => {
      const res = await api.put('/notifications/channels/sms', data);
      return res.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['channelsConfig'] }),
  });
};

export const useUpdateWhatsAppConfig = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { provider: 'whatsapp_cloud' | 'mock'; apiToken?: string; phoneNumberId?: string }) => {
      const res = await api.put('/notifications/channels/whatsapp', data);
      return res.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['channelsConfig'] }),
  });
};

export const useTestChannel = () =>
  useMutation({
    mutationFn: async (data: { canal: 'sms' | 'whatsapp'; destino: string }) => {
      const res = await api.post('/notifications/channels/test', data);
      return res.data;
    },
  });

// --- Admin Dashboard (resumen global) ---
export interface AdminDashboard {
  usuarios: { total: number; admins: number; obstetras: number; gestantes: number; obstetrasPendientes: number };
  gestantes: { activas: number; altoRiesgo: number };
  citas: { hoy: number; proximas7dias: number };
  alertas: { pendientes: number };
  contenido: { publicado: number; total: number; vistasTotales: number };
  notificaciones: { smsConfigurado: boolean; whatsappConfigurado: boolean };
}

export const fetchAdminDashboard = async (): Promise<AdminDashboard> => {
  const res = await api.get('/admin/dashboard');
  return res.data?.data;
};

export const useAdminDashboard = () =>
  useQuery({ queryKey: ['adminDashboard'], queryFn: fetchAdminDashboard });

// --- Admin: gestión avanzada de usuarios ---
export const useAdminUserDetail = (id: string) =>
  useQuery({
    queryKey: ['adminUser', id],
    queryFn: async () => {
      const res = await api.get(`/admin/users/${id}`);
      return res.data?.data;
    },
    enabled: !!id,
  });

export const useUpdateUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      const res = await api.put(`/admin/users/${id}`, data);
      return res.data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['adminUsers'] });
      qc.invalidateQueries({ queryKey: ['adminUser', vars.id] });
    },
  });
};

export const useResetUserPassword = () =>
  useMutation({
    mutationFn: async ({ id, newPassword }: { id: string; newPassword: string }) => {
      const res = await api.post(`/admin/users/${id}/reset-password`, { newPassword });
      return res.data;
    },
  });

export const useDeleteUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/admin/users/${id}`);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['adminUsers'] }),
  });
};
