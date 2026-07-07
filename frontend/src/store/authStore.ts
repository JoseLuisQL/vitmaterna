/**
 * VITMATERNA Auth Store
 * Zustand store for authentication state management.
 */
import { create } from 'zustand';
import api, { storeTokens, clearStoredTokens, getStoredToken, storeUser, getStoredUser, setOnTokenRefreshCallback } from '../services/api';
import type { User, LoginRequest, RegisterRequest, AuthResponse } from '../types/user';
import type { ApiResponse } from '../types/api';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { pushSupported } from '../utils/pushEnv';
import { getApiErrorMessage } from '../utils/apiError';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;

  login: (dni: string, password: string) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  loadStoredAuth: () => Promise<void>;
  refreshToken: () => Promise<string | undefined>;
  clearError: () => void;
  setUser: (user: User) => void;
  registerPushToken: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string, confirmPassword: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false,
  error: null,

  login: async (dni: string, password: string): Promise<void> => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post<ApiResponse<AuthResponse>>('/auth/login', {
        dni,
        password,
      } as LoginRequest);

      const { user, accessToken, refreshToken } = response.data.data;
      await storeTokens(accessToken, refreshToken);
      await storeUser(user);

      set({
        user,
        token: accessToken,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      // Register push notifications
      await get().registerPushToken();
    } catch (error: unknown) {
      const message = getApiErrorMessage(error, 'No se pudo iniciar sesión. Verifica tus credenciales.');
      set({
        isLoading: false,
        error: message,
        isAuthenticated: false,
      });
      throw new Error(message);
    }
  },

  register: async (data: RegisterRequest): Promise<void> => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post<ApiResponse<any>>(
        '/auth/register',
        data,
      );

      const payload = response.data.data;
      const { user, accessToken, refreshToken, requiresApproval } = payload;

      // Obstetras: la cuenta queda pendiente de aprobación; NO se inicia sesión.
      if (requiresApproval || !accessToken) {
        set({ isLoading: false, error: null, isAuthenticated: false, user: null, token: null });
        return;
      }

      await storeTokens(accessToken, refreshToken);
      await storeUser(user);

      set({
        user,
        token: accessToken,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      // Register push notifications
      await get().registerPushToken();
    } catch (error: unknown) {
      const message = getApiErrorMessage(error, 'No se pudo registrar. Inténtalo de nuevo.');
      set({
        isLoading: false,
        error: message,
        isAuthenticated: false,
      });
      throw new Error(message);
    }
  },

  logout: async (): Promise<void> => {
    try {
      // Quitar el push token de este dispositivo antes de cerrar sesión,
      // para no seguir recibiendo notificaciones de un usuario deslogueado.
      try {
        await api.delete('/notifications/token');
      } catch {
        // No bloquear el logout si falla.
      }
      await api.post('/auth/logout');
    } catch {
      // Proceed with local logout even if API call fails
    } finally {
      await clearStoredTokens();
      // Limpiar la caché persistente de React Query para no filtrar datos de un
      // usuario al siguiente que inicie sesión en el mismo dispositivo.
      try {
        const { clearQueryCache } = await import('../services/queryClient');
        await clearQueryCache();
      } catch {
        // ignore
      }
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    }
  },

  loadStoredAuth: async (): Promise<void> => {
    try {
      const token = await getStoredToken();
      if (!token) {
        set({ isInitialized: true });
        return;
      }

      const storedUser = await getStoredUser();

      if (storedUser) {
        // Restaurar sesión inmediatamente con datos locales. Si hay red, se
        // refrescan abajo; si no, el usuario entra con lo que tenemos.
        set({
          user: storedUser,
          token,
          isAuthenticated: true,
          isInitialized: true,
        });
      }

      try {
        const response = await api.get<ApiResponse<any>>('/auth/me');
        const freshUser = response.data.data.user;
        await storeUser(freshUser);
        set({
          user: freshUser,
          token,
          isAuthenticated: true,
          isInitialized: true,
        });

        await get().registerPushToken();
      } catch (error: any) {
        const status = error?.response?.status;
        if (status === 401 || status === 403) {
          // Sesión inválida: el servidor rechaza explícitamente → cerrar sesión.
          await clearStoredTokens();
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isInitialized: true,
          });
        } else if (storedUser) {
          // Error de red u otro transitorio con usuario almacenado → mantener
          // la sesión con datos locales. El usuario puede seguir usando la app
          // offline con los datos cacheados.
          // (Ya se seteó isAuthenticated=true arriba, no hacer nada más.)
        } else {
          // Sin storedUser Y sin poder verificar → no se puede autenticar.
          await clearStoredTokens();
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isInitialized: true,
          });
        }
      }
    } catch {
      // Error de lectura de SecureStore u otro imprevisto. Si ya restauramos
      // la sesión con storedUser, NO la borramos para no romper el flujo
      // offline. Solo si nunca se inicializó, marcamos como no autenticado.
      if (!get().isInitialized) {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isInitialized: true,
        });
      }
    }
  },

  refreshToken: async (): Promise<string | undefined> => {
    try {
      const response = await api.post<ApiResponse<AuthResponse>>(
        '/auth/refresh',
      );
      const { accessToken, refreshToken } = response.data.data;
      await storeTokens(accessToken, refreshToken);
      set({ token: accessToken });
      return accessToken;
    } catch (error: any) {
      const status = error?.response?.status;
      if (status === 401 || status === 403 || status === 400) {
        const { logout } = get();
        await logout();
      }
      return undefined;
    }
  },

  clearError: (): void => {
    set({ error: null });
  },

  setUser: (user: User): void => {
    storeUser(user).catch(() => {});
    set({ user });
  },

  changePassword: async (currentPassword, newPassword, confirmPassword): Promise<void> => {
    try {
      await api.post('/auth/change-password', { currentPassword, newPassword, confirmPassword });
      // Limpiar la bandera localmente para liberar el guard de cambio obligatorio.
      const current = get().user;
      if (current) {
        const updatedUser = { ...current, mustChangePassword: false };
        await storeUser(updatedUser);
        set({ user: updatedUser });
      }
    } catch (error: unknown) {
      throw new Error(getApiErrorMessage(error, 'No se pudo cambiar la contraseña. Inténtalo de nuevo.'));
    }
  },

  registerPushToken: async (): Promise<void> => {
    try {
      // Push real requiere dispositivo físico + build de desarrollo (no Expo Go
      // ni web). Importar expo-notifications en Expo Go provoca un error, por eso
      // se sale ANTES de cualquier import.
      if (!pushSupported || !Device.isDevice) {
        return;
      }

      const NotificationsPerms = await import('expo-notifications');
      const { status: existingStatus } = await NotificationsPerms.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await NotificationsPerms.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        if (__DEV__) console.log('Failed to get push token for push notification!');
        return;
      }

      if (Platform.OS === 'android') {
        const Notifications = await import('expo-notifications');
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Notificaciones VitMaterna',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF0C8174',
          sound: 'default',
          showBadge: true,
          enableVibrate: true,
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        });
      }

      const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
      
      const NotificationsModule = await import('expo-notifications');
      const token = await NotificationsModule.getExpoPushTokenAsync({
        projectId,
      });

      if (token?.data) {
        await api.post('/notifications/token', { expoPushToken: token.data });
      }
    } catch (e) {
      if (__DEV__) console.log('Error registering push token:', e);
    }
  },
}));

// Conectar el refresco automático de token HTTP de api.ts con el estado en memoria de Zustand
setOnTokenRefreshCallback((newToken: string) => {
  useAuthStore.setState({ token: newToken });
});

