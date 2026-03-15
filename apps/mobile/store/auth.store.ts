import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  firebaseUid: string;
}

interface AuthState {
  user: AuthUser | null;
  isInitializing: boolean;
  setAuth: (user: AuthUser, accessToken: string, refreshToken: string) => Promise<void>;
  clearAuth: () => Promise<void>;
  setInitialized: () => void;
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  isInitializing: true,
  setAuth: async (user, accessToken, refreshToken) => {
    await SecureStore.setItemAsync('accessToken', accessToken);
    await SecureStore.setItemAsync('refreshToken', refreshToken);
    set({ user, isInitializing: false });
  },
  clearAuth: async () => {
    await SecureStore.deleteItemAsync('accessToken');
    await SecureStore.deleteItemAsync('refreshToken');
    set({ user: null, isInitializing: false });
  },
  setInitialized: () => set({ isInitializing: false }),
}));
