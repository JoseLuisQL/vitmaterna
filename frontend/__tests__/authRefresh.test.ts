/**
 * Pruebas del flujo de refresh de sesión (issue #37).
 *
 * Verifica que `useAuthStore.refreshToken()`:
 *  1. Envíe el refresh token en el body a POST /auth/refresh (antes iba vacío
 *     y el backend respondía 400 → logout indebido al volver del background).
 *  2. NO cierre sesión ante fallos transitorios (400, error de red).
 *  3. Cierre sesión SOLO cuando el servidor rechaza explícitamente el token
 *     (401/403 = token revocado/expirado).
 *  4. Persista los nuevos tokens en caso de éxito.
 */

// --- Mocks de módulos nativos/expo para poder cargar el store en Node ---
jest.mock('expo-device', () => ({ isDevice: false }));
jest.mock('expo-constants', () => ({ default: { expoConfig: { extra: {} } } }));
jest.mock('../src/utils/pushEnv', () => ({ pushSupported: false }));
jest.mock('../src/services/queryClient', () => ({ clearQueryCache: jest.fn() }));

// Mock de la capa API. Guardamos referencias a los mocks para hacer aserciones.
const mockPost = jest.fn();
const mockDelete = jest.fn();
const mockGet = jest.fn();
const mockStoreTokens = jest.fn();
const mockClearStoredTokens = jest.fn();
const mockGetStoredRefreshToken = jest.fn();

jest.mock('../src/services/api', () => ({
  __esModule: true,
  default: {
    post: (...a: any[]) => mockPost(...a),
    delete: (...a: any[]) => mockDelete(...a),
    get: (...a: any[]) => mockGet(...a),
  },
  storeTokens: (...a: any[]) => mockStoreTokens(...a),
  clearStoredTokens: (...a: any[]) => mockClearStoredTokens(...a),
  getStoredToken: jest.fn(),
  getStoredRefreshToken: (...a: any[]) => mockGetStoredRefreshToken(...a),
  storeUser: jest.fn(),
  getStoredUser: jest.fn(),
  setOnTokenRefreshCallback: jest.fn(),
}));

import { useAuthStore } from '../src/store/authStore';

const resetStore = () =>
  useAuthStore.setState({
    user: { id: 'u1' } as any,
    token: 'old-access',
    isAuthenticated: true,
    isLoading: false,
    isInitialized: true,
    error: null,
  });

beforeEach(() => {
  jest.clearAllMocks();
  resetStore();
});

describe('refreshToken() — issue #37', () => {
  it('envía el refresh token almacenado en el body a /auth/refresh', async () => {
    mockGetStoredRefreshToken.mockResolvedValue('stored-refresh');
    mockPost.mockResolvedValue({
      data: { data: { accessToken: 'new-access', refreshToken: 'new-refresh' } },
    });

    const token = await useAuthStore.getState().refreshToken();

    expect(mockPost).toHaveBeenCalledWith('/auth/refresh', {
      refreshToken: 'stored-refresh',
    });
    expect(token).toBe('new-access');
    expect(mockStoreTokens).toHaveBeenCalledWith('new-access', 'new-refresh');
    expect(useAuthStore.getState().token).toBe('new-access');
    // No debe cerrar sesión en el camino feliz.
    expect(mockClearStoredTokens).not.toHaveBeenCalled();
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it('NO cierra sesión ante un 400 (fallo transitorio de validación)', async () => {
    mockGetStoredRefreshToken.mockResolvedValue('stored-refresh');
    mockPost.mockRejectedValue({ response: { status: 400 } });

    const token = await useAuthStore.getState().refreshToken();

    expect(token).toBeUndefined();
    expect(mockClearStoredTokens).not.toHaveBeenCalled();
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it('NO cierra sesión ante un error de red (sin response)', async () => {
    mockGetStoredRefreshToken.mockResolvedValue('stored-refresh');
    mockPost.mockRejectedValue(new Error('Network Error'));

    const token = await useAuthStore.getState().refreshToken();

    expect(token).toBeUndefined();
    expect(mockClearStoredTokens).not.toHaveBeenCalled();
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it('cierra sesión cuando el servidor rechaza el refresh token (401)', async () => {
    mockGetStoredRefreshToken.mockResolvedValue('stored-refresh');
    mockPost.mockRejectedValue({ response: { status: 401 } });

    const token = await useAuthStore.getState().refreshToken();

    expect(token).toBeUndefined();
    // logout() limpia los tokens y desautentica.
    expect(mockClearStoredTokens).toHaveBeenCalled();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it('cierra sesión cuando el servidor rechaza el refresh token (403)', async () => {
    mockGetStoredRefreshToken.mockResolvedValue('stored-refresh');
    mockPost.mockRejectedValue({ response: { status: 403 } });

    await useAuthStore.getState().refreshToken();

    expect(mockClearStoredTokens).toHaveBeenCalled();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it('sin refresh token almacenado, devuelve undefined y NO cierra sesión', async () => {
    mockGetStoredRefreshToken.mockResolvedValue(null);

    const token = await useAuthStore.getState().refreshToken();

    expect(token).toBeUndefined();
    expect(mockPost).not.toHaveBeenCalled();
    expect(mockClearStoredTokens).not.toHaveBeenCalled();
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });
});
