/**
 * VITMATERNA — Pruebas del hook useOnboarding (estado del onboarding).
 *
 * Verifica:
 *  - Carga inicial: por defecto no visto, `loaded` pasa a true.
 *  - `markWelcomeSeen` / `markTourDone` persisten con la clave per-usuario.
 *  - `reset` limpia ambas marcas.
 *  - Las claves de almacenamiento son namespaced por usuario.
 */
import { renderHook, act, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Usuario fijo para las pruebas.
jest.mock('../src/store/authStore', () => ({
  useAuthStore: (selector: any) => selector({ user: { id: 'user-123' } }),
}));

import { useOnboarding, onboardingKey } from '../src/hooks/useOnboarding';

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('onboardingKey', () => {
  it('genera claves namespaced por usuario y tipo', () => {
    expect(onboardingKey('user-123', 'welcome')).toBe('vitmaterna_onboarding_welcome_user-123');
    expect(onboardingKey('user-123', 'tour')).toBe('vitmaterna_onboarding_tour_user-123');
  });

  it('usa "anon" cuando no hay usuario', () => {
    expect(onboardingKey(undefined, 'welcome')).toBe('vitmaterna_onboarding_welcome_anon');
  });
});

describe('useOnboarding', () => {
  it('por defecto: no visto y termina cargando', async () => {
    const { result } = renderHook(() => useOnboarding());
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.welcomeSeen).toBe(false);
    expect(result.current.tourDone).toBe(false);
  });

  it('markWelcomeSeen persiste y actualiza el estado', async () => {
    const { result } = renderHook(() => useOnboarding());
    await waitFor(() => expect(result.current.loaded).toBe(true));

    act(() => {
      result.current.markWelcomeSeen();
    });

    expect(result.current.welcomeSeen).toBe(true);
    await waitFor(async () => {
      const stored = await AsyncStorage.getItem('vitmaterna_onboarding_welcome_user-123');
      expect(stored).toBe('true');
    });
  });

  it('markTourDone persiste y actualiza el estado', async () => {
    const { result } = renderHook(() => useOnboarding());
    await waitFor(() => expect(result.current.loaded).toBe(true));

    act(() => {
      result.current.markTourDone();
    });

    expect(result.current.tourDone).toBe(true);
    await waitFor(async () => {
      const stored = await AsyncStorage.getItem('vitmaterna_onboarding_tour_user-123');
      expect(stored).toBe('true');
    });
  });

  it('lee el estado ya persistido al montar', async () => {
    await AsyncStorage.setItem('vitmaterna_onboarding_welcome_user-123', 'true');
    await AsyncStorage.setItem('vitmaterna_onboarding_tour_user-123', 'true');

    const { result } = renderHook(() => useOnboarding());
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.welcomeSeen).toBe(true);
    expect(result.current.tourDone).toBe(true);
  });

  it('reset limpia ambas marcas (memoria y almacenamiento)', async () => {
    await AsyncStorage.setItem('vitmaterna_onboarding_welcome_user-123', 'true');
    await AsyncStorage.setItem('vitmaterna_onboarding_tour_user-123', 'true');

    const { result } = renderHook(() => useOnboarding());
    await waitFor(() => expect(result.current.welcomeSeen).toBe(true));

    await act(async () => {
      await result.current.reset();
    });

    expect(result.current.welcomeSeen).toBe(false);
    expect(result.current.tourDone).toBe(false);
    expect(await AsyncStorage.getItem('vitmaterna_onboarding_welcome_user-123')).toBeNull();
    expect(await AsyncStorage.getItem('vitmaterna_onboarding_tour_user-123')).toBeNull();
  });
});
