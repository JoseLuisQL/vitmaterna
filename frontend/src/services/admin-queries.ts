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
  whatsapp: {
    /** 'whatsapp_cloud' (Meta), 'openwa' (self-hosted) o 'mock'. */
    provider: string;
    configured: boolean;
    phoneNumberId: string | null;
    /** OpenWA: URL del gateway (dato público, sin secretos). */
    baseUrl?: string | null;
    /** OpenWA: ID de la sesión (dato público). */
    sessionId?: string | null;
    /** OpenWA: indica solo SI hay secreto de webhook configurado (no lo expone). */
    webhookConfigured?: boolean;
  };
  /** Interruptor global de canales de pago (SMS/WhatsApp). */
  paidEnabled?: boolean;
}

/** Payload para configurar el canal WhatsApp según el proveedor elegido. */
export type WhatsAppConfigPayload =
  | { provider: 'whatsapp_cloud'; apiToken?: string; phoneNumberId?: string }
  | { provider: 'openwa'; baseUrl?: string; apiKey?: string; sessionId?: string }
  | { provider: 'mock' };

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
    mutationFn: async (data: WhatsAppConfigPayload) => {
      const res = await api.put('/notifications/channels/whatsapp', data);
      return res.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['channelsConfig'] }),
  });
};

export const useTestChannel = () =>
  useMutation({
    mutationFn: async (data: { canal: 'sms' | 'whatsapp'; destino: string; mensaje?: string }) => {
      const res = await api.post('/notifications/channels/test', data);
      return res.data;
    },
  });

/**
 * Activa o desactiva el interruptor GLOBAL de los canales de pago (SMS/WhatsApp).
 * En `false` apaga al instante todo envío que consume créditos, sin tocar push
 * ni in-app.
 */
export const useSetPaidChannelsEnabled = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (enabled: boolean) => {
      const res = await api.put('/notifications/channels/paid-enabled', { enabled });
      return res.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['channelsConfig'] }),
  });
};

// --- Panel de gestión OpenWA (estado/reconexión/entregas del gateway) ---

/** Estado de la sesión OpenWA (datos públicos; nunca incluye la apiKey). */
export interface OpenWAStatus {
  id: string;
  name: string | null;
  status: string; // ready | disconnected | initializing | failed | …
  phone: string | null;
  pushName: string | null;
  connectedAt: string | null;
  lastActive: string | null;
  lastError: string | null;
}

/** Resultado de la reconexión: QR (si hace falta) o aviso de ya-autenticada. */
export interface OpenWAConnectResult {
  needsQr: boolean;
  qr: string | null;
  pairingCode: string | null;
  message: string | null;
}

export interface OpenWAMessage {
  id: string;
  body: string;
  from: string | null;
  to: string | null;
  type: string | null;
  direction: string | null;
  status: string | null;
  timestamp: number | null;
  createdAt: string | null;
}

/**
 * Estado de la sesión del gateway OpenWA. Hace polling solo mientras el panel
 * esté visible y el proveedor sea OpenWA (`enabled`). Refresca cada 8 s para
 * reflejar reconexiones sin recargar.
 */
export const useOpenWAStatus = (enabled: boolean) =>
  useQuery({
    queryKey: ['openwaStatus'],
    queryFn: async (): Promise<OpenWAStatus> => {
      const res = await api.get('/notifications/openwa/status');
      return res.data?.data;
    },
    enabled,
    refetchInterval: enabled ? 8000 : false,
    retry: false,
  });

/** Inicia/reconecta la sesión (devuelve QR si hace falta vincular). */
export const useOpenWAConnect = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<OpenWAConnectResult> => {
      const res = await api.post('/notifications/openwa/connect');
      return res.data?.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['openwaStatus'] }),
  });
};

/** Detiene (desvincula) la sesión del gateway. */
export const useOpenWADisconnect = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await api.post('/notifications/openwa/disconnect');
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['openwaStatus'] }),
  });
};

/** Historial saliente reciente del gateway (para la tarjeta de entregas). */
export const useOpenWAMessages = (enabled: boolean, limit = 15) =>
  useQuery({
    queryKey: ['openwaMessages', limit],
    queryFn: async (): Promise<OpenWAMessage[]> => {
      const res = await api.get(`/notifications/openwa/messages?limit=${limit}`);
      return res.data?.data?.messages || [];
    },
    enabled,
    retry: false,
    refetchInterval: enabled ? 5000 : false, // Refresca en tiempo real cada 5s
  });

/**
 * Registra en OpenWA el webhook entrante (respuestas de la gestante por WhatsApp
 * → su chat con el obstetra). `webhookUrl` debe ser pública y apuntar a
 * `/v1/webhooks/openwa` del backend.
 */
export const useRegisterOpenWAWebhook = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (webhookUrl: string) => {
      const res = await api.post('/notifications/channels/openwa/register-webhook', { webhookUrl });
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['channelsConfig'] }),
  });
};

// --- Admin Dashboard (resumen global) ---
export interface AdminDashboard {
  usuarios: { total: number; admins: number; obstetras: number; gestantes: number; obstetrasPendientes: number; pendientes?: number };
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
