import { Redirect } from 'expo-router';
import { Stack } from 'expo-router';
import { useAuthStore } from '@/store/auth.store';
import { View, ActivityIndicator } from 'react-native';

export default function AppLayout() {
  const user = useAuthStore((s) => s.user);
  const isInitializing = useAuthStore((s) => s.isInitializing);

  if (isInitializing) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator color="#6366f1" size="large" />
      </View>
    );
  }

  if (!user) return <Redirect href="/(auth)/login" />;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="workouts/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="workouts/new" options={{ headerShown: false }} />
      <Stack.Screen name="exercises/select" options={{ headerShown: false }} />
    </Stack>
  );
}
