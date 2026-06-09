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

// --- Admin Education Content ---
export const createEducationContent = async (data: any) => {
  const res = await api.post('/admin/education', data);
  return res.data;
};

export const useCreateEducationContent = () => {
  return useMutation({
    mutationFn: createEducationContent,
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
  const res = await api.post('/admin/backup');
  return res.data?.data || res.data;
};

export const useExportBackup = () => {
  return useMutation({
    mutationFn: exportBackup,
  });
};
