import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

export default function LoginScreen() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();

  async function handleSubmit() {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Ошибка', 'Введите email и пароль');
      return;
    }
    setLoading(true);
    try {
      let cred;
      if (mode === 'register') {
        try {
          cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        } catch (e: unknown) {
          const code = (e as { code?: string }).code;
          const msg =
            code === 'auth/email-already-in-use' ? 'Этот email уже зарегистрирован' :
            code === 'auth/weak-password' ? 'Пароль слишком короткий (минимум 6 символов)' :
            'Ошибка регистрации';
          Alert.alert('Ошибка', msg);
          return;
        }
      } else {
        try {
          cred = await signInWithEmailAndPassword(auth, email.trim(), password);
        } catch (e: unknown) {
          const code = (e as { code?: string }).code;
          const msg =
            code === 'auth/user-not-found' || code === 'auth/invalid-credential' ? 'Неверный email или пароль' :
            code === 'auth/too-many-requests' ? 'Слишком много попыток. Попробуйте позже' :
            'Ошибка входа';
          Alert.alert('Ошибка', msg);
          return;
        }
      }

      const idToken = await cred.user.getIdToken();
      const { data } = await api.post('/auth/login', { idToken });
      const { data: me } = await api.get('/users/me');

      if (mode === 'register' && name.trim()) {
        try { await api.patch('/users/me', { name: name.trim() }); } catch {}
      }

      await setAuth(me, data.accessToken, data.refreshToken);
      router.replace('/(app)/(tabs)');
    } catch {
      Alert.alert('Ошибка', 'Что-то пошло не так. Попробуйте ещё раз.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-1 justify-center px-6 py-12">
          <View className="mb-10">
            <Text className="text-4xl font-bold text-foreground">ForzaFit</Text>
            <Text className="text-muted mt-1">
              {mode === 'login' ? 'Войдите в аккаунт' : 'Создайте аккаунт'}
            </Text>
          </View>

          <View className="gap-4">
            {mode === 'register' && (
              <View>
                <Text className="text-foreground text-sm mb-1">Имя</Text>
                <TextInput
                  className="bg-card border border-border rounded-xl px-4 py-3 text-foreground text-base"
                  placeholder="Ваше имя"
                  placeholderTextColor="#71717a"
                  value={name}
                  onChangeText={setName}
                />
              </View>
            )}

            <View>
              <Text className="text-foreground text-sm mb-1">Email</Text>
              <TextInput
                className="bg-card border border-border rounded-xl px-4 py-3 text-foreground text-base"
                placeholder="email@example.com"
                placeholderTextColor="#71717a"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View>
              <Text className="text-foreground text-sm mb-1">Пароль</Text>
              <TextInput
                className="bg-card border border-border rounded-xl px-4 py-3 text-foreground text-base"
                placeholder="••••••••"
                placeholderTextColor="#71717a"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            <TouchableOpacity
              className="bg-primary rounded-xl py-4 items-center mt-2"
              onPress={handleSubmit}
              disabled={loading}
            >
              <Text className="text-white font-semibold text-base">
                {loading ? 'Загрузка...' : mode === 'login' ? 'Войти' : 'Зарегистрироваться'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="items-center py-2"
              onPress={() => setMode(mode === 'login' ? 'register' : 'login')}
            >
              <Text className="text-muted">
                {mode === 'login' ? 'Нет аккаунта? ' : 'Уже есть аккаунт? '}
                <Text className="text-primary">
                  {mode === 'login' ? 'Зарегистрироваться' : 'Войти'}
                </Text>
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
