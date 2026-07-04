/**
 * VITMATERNA API Service
 * Axios instance with JWT injection, auto-refresh on 401, error handling.
 */
import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { API_URL, SERVER_ORIGIN as ENV_SERVER_ORIGIN } from '../config/env';

const BASE_URL = API_URL;

const STORAGE_KEYS = {
  TOKEN: 'vitmaterna_token',
  REFRESH_TOKEN: 'vitmaterna_refresh_token',
  USER: 'vitmaterna_user',
} as const;

/** Create the Axios instance */
const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

/** Flag to prevent multiple simultaneous refresh attempts */
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null): void => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else if (token) {
      promise.resolve(token);
    }
  });
  failedQueue = [];
};

/** Request Interceptor - Inject JWT */
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await getStoredToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

/** Response Interceptor - Auto-refresh on 401 */
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    if (!originalRequest) {
      return Promise.reject(error);
    }

    // No intentar refrescar token en los propios endpoints de autenticación
    // (login/register/refresh): un 401 ahí es credencial inválida, no sesión
    // expirada. Se deja pasar el error original para mostrar el mensaje real.
    const url = originalRequest.url || '';
    const isAuthEndpoint = url.includes('/auth/login') || url.includes('/auth/register') || url.includes('/auth/refresh');

    // If 401 and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      if (isRefreshing) {
        // Queue this request until the token is refreshed
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await getStoredRefreshToken();

        if (!refreshToken) {
          processQueue(new Error('No refresh token'), null);
          await clearStoredTokens();
          return Promise.reject(error);
        }

        const response = await axios.post(`${BASE_URL}/auth/refresh`, {
          refreshToken,
        });

        const { accessToken: newToken, refreshToken: newRefreshToken } =
          response.data.data;

        await storeTokens(newToken, newRefreshToken);
        if (onTokenRefreshCallback) {
          onTokenRefreshCallback(newToken);
        }

        processQueue(null, newToken);

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
        }

        return api(originalRequest);
      } catch (refreshError: any) {
        processQueue(refreshError, null);
        const status = refreshError?.response?.status;
        if (status === 401 || status === 403 || status === 400) {
          await clearStoredTokens();
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

/** Callback para notificar a capas superiores (como Zustand) cuando se renueva un token por HTTP */
let onTokenRefreshCallback: ((token: string) => void) | null = null;

export const setOnTokenRefreshCallback = (cb: (token: string) => void): void => {
  onTokenRefreshCallback = cb;
};

/** Store tokens securely */
export const storeTokens = async (
  token: string | null | undefined | any,
  refreshToken: string | null | undefined | any,
): Promise<void> => {
  const tStr = typeof token === 'string' ? token : (token ? JSON.stringify(token) : null);
  const rStr = typeof refreshToken === 'string' ? refreshToken : (refreshToken ? JSON.stringify(refreshToken) : null);

  if (Platform.OS === 'web') {
    if (tStr) localStorage.setItem(STORAGE_KEYS.TOKEN, tStr);
    else localStorage.removeItem(STORAGE_KEYS.TOKEN);
    if (rStr) localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, rStr);
    else localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
  } else {
    if (tStr) await SecureStore.setItemAsync(STORAGE_KEYS.TOKEN, tStr);
    else await SecureStore.deleteItemAsync(STORAGE_KEYS.TOKEN);
    if (rStr) await SecureStore.setItemAsync(STORAGE_KEYS.REFRESH_TOKEN, rStr);
    else await SecureStore.deleteItemAsync(STORAGE_KEYS.REFRESH_TOKEN);
  }
};

/** Get stored token */
export const getStoredToken = async (): Promise<string | null> => {
  if (Platform.OS === 'web') {
    return localStorage.getItem(STORAGE_KEYS.TOKEN);
  }
  return SecureStore.getItemAsync(STORAGE_KEYS.TOKEN);
};

/** Get stored refresh token */
export const getStoredRefreshToken = async (): Promise<string | null> => {
  if (Platform.OS === 'web') {
    return localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
  }
  return SecureStore.getItemAsync(STORAGE_KEYS.REFRESH_TOKEN);
};

/** Clear all stored tokens and user data */
export const clearStoredTokens = async (): Promise<void> => {
  if (Platform.OS === 'web') {
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
  } else {
    await Promise.all([
      SecureStore.deleteItemAsync(STORAGE_KEYS.TOKEN).catch(() => {}),
      SecureStore.deleteItemAsync(STORAGE_KEYS.REFRESH_TOKEN).catch(() => {}),
      SecureStore.deleteItemAsync(STORAGE_KEYS.USER).catch(() => {}),
    ]);
  }
};

/** Store user securely/persistently */
export const storeUser = async (user: any): Promise<void> => {
  const uStr = typeof user === 'string' ? user : (user ? JSON.stringify(user) : null);
  try {
    if (Platform.OS === 'web') {
      if (uStr) localStorage.setItem(STORAGE_KEYS.USER, uStr);
      else localStorage.removeItem(STORAGE_KEYS.USER);
    } else {
      if (uStr) await SecureStore.setItemAsync(STORAGE_KEYS.USER, uStr);
      else await SecureStore.deleteItemAsync(STORAGE_KEYS.USER).catch(() => {});
    }
  } catch {
    // Ignore storage errors
  }
};

/** Get stored user */
export const getStoredUser = async (): Promise<any | null> => {
  try {
    const uStr = Platform.OS === 'web'
      ? localStorage.getItem(STORAGE_KEYS.USER)
      : await SecureStore.getItemAsync(STORAGE_KEYS.USER);
    if (!uStr) return null;
    return JSON.parse(uStr);
  } catch {
    return null;
  }
};

/** Origen del servidor sin el sufijo /v1 (para recursos estáticos como /uploads). */
export const SERVER_ORIGIN = ENV_SERVER_ORIGIN;

/** Resuelve una mediaUrl relativa (/uploads/...) a una URL absoluta del servidor. */
export const resolveMediaUrl = (url?: string | null): string | null => {
  if (!url) return null;
  if (/^(https?:\/\/|data:|file:|blob:|content:)/i.test(url)) return url;
  return `${SERVER_ORIGIN}${url.startsWith('/') ? '' : '/'}${url}`;
};

export { STORAGE_KEYS };
export default api;
