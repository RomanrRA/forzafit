import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { signOut } from '@/hooks/use-auth';
import { router } from 'expo-router';
import { LogOut, User } from 'lucide-react-native';

export default function ProfileScreen() {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ['users', 'me'],
    queryFn: async () => {
      const { data } = await api.get('/users/me');
      return data;
    },
  });

  useEffect(() => {
    if (profile) setName(profile.name ?? '');
  }, [profile]);

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const { data } = await api.patch('/users/me', { name: name.trim() });
      qc.setQueryData(['users', 'me'], data);
      Alert.alert('Готово', 'Профиль обновлён');
    } catch {
      Alert.alert('Ошибка', 'Не удалось сохранить');
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    Alert.alert('Выход', 'Выйти из аккаунта?', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Выйти',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/(auth)/login');
        },
      },
    ]);
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1 px-5">
        <Text className="text-foreground text-2xl font-bold pt-4 pb-6">Профиль</Text>

        <View className="bg-card rounded-2xl p-5 border border-border mb-4">
          <View className="flex-row items-center gap-3 mb-4">
            <View className="bg-primary/20 rounded-full w-12 h-12 items-center justify-center">
              <User color="#6366f1" size={24} />
            </View>
            <View>
              <Text className="text-foreground font-semibold">{profile?.name ?? 'Пользователь'}</Text>
              <Text className="text-muted text-sm">{profile?.email}</Text>
            </View>
          </View>

          <View className="mb-3">
            <Text className="text-muted text-xs mb-1">Имя</Text>
            <TextInput
              className="bg-background border border-border rounded-xl px-4 py-3 text-foreground"
              value={name}
              onChangeText={setName}
              placeholder="Ваше имя"
              placeholderTextColor="#71717a"
            />
          </View>

          <TouchableOpacity
            className="bg-primary rounded-xl py-3 items-center"
            onPress={handleSave}
            disabled={saving}
          >
            <Text className="text-white font-medium">{saving ? 'Сохранение...' : 'Сохранить'}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          className="bg-card rounded-2xl p-4 border border-destructive/30 flex-row items-center gap-3"
          onPress={handleSignOut}
        >
          <LogOut color="#ef4444" size={20} />
          <Text className="text-destructive font-medium">Выйти из аккаунта</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
