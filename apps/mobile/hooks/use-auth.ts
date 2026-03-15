import { useEffect } from 'react';
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import * as SecureStore from 'expo-secure-store';

export function useAuthInit() {
  const { setAuth, clearAuth, setInitialized } = useAuthStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const existingToken = await SecureStore.getItemAsync('accessToken');
        if (existingToken) {
          try {
            const { data: me } = await api.get('/users/me');
            await setAuth(me, existingToken, (await SecureStore.getItemAsync('refreshToken')) ?? '');
          } catch {
            clearAuth();
          }
          return;
        }
        try {
          const idToken = await firebaseUser.getIdToken();
          const { data } = await api.post('/auth/login', { idToken });
          const { data: me } = await api.get('/users/me');
          await setAuth(me, data.accessToken, data.refreshToken);
        } catch {
          clearAuth();
        }
      } else {
        clearAuth();
      }
    });
    return unsubscribe;
  }, [setAuth, clearAuth, setInitialized]);
}

export async function signOut() {
  await firebaseSignOut(auth);
  await useAuthStore.getState().clearAuth();
}
