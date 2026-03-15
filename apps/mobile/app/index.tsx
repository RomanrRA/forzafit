import { Redirect } from 'expo-router';
import { useAuthStore } from '@/store/auth.store';
import { View, ActivityIndicator } from 'react-native';

export default function Index() {
  const user = useAuthStore((s) => s.user);
  const isInitializing = useAuthStore((s) => s.isInitializing);

  if (isInitializing) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator color="#6366f1" size="large" />
      </View>
    );
  }

  return <Redirect href={user ? '/(app)/(tabs)' : '/(auth)/login'} />;
}
