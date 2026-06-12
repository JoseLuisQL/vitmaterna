/**
 * VITMATERNA Auth Store
 * Zustand store for authentication state management.
 */
import { create } from 'zustand';
import api, { storeTokens, clearStoredTokens, getStoredToken } from '../services/api';
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
  refreshToken: () => Promise<void>;
  clearError: () => void;
  setUser: (user: User) => void;
  registerPushToken: () => Promise<void>;
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
      const response = await api.post<ApiResponse<AuthResponse>>(
        '/auth/register',
        data,
      );

      const { user, accessToken, refreshToken } = response.data.data;
      await storeTokens(accessToken, refreshToken);

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

      // Validate token by fetching user profile
      const response = await api.get<ApiResponse<any>>('/auth/me');
      set({
        user: response.data.data.user,
        token,
        isAuthenticated: true,
        isInitialized: true,
      });

      // Register push notifications
      await get().registerPushToken();
    } catch {
      // Token is invalid or expired, clear storage
      await clearStoredTokens();
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isInitialized: true,
      });
    }
  },

  refreshToken: async (): Promise<void> => {
    try {
      const response = await api.post<ApiResponse<AuthResponse>>(
        '/auth/refresh',
      );
      const { accessToken, refreshToken } = response.data.data;
      await storeTokens(accessToken, refreshToken);
      set({ token: accessToken });
    } catch {
      const { logout } = get();
      await logout();
    }
  },

  clearError: (): void => {
    set({ error: null });
  },

  setUser: (user: User): void => {
    set({ user });
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
        console.log('Failed to get push token for push notification!');
        return;
      }

      if (Platform.OS === 'android') {
        const Notifications = await import('expo-notifications');
        Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
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
      console.log('Error registering push token:', e);
    }
  },
}));
