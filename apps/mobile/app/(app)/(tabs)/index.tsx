import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, Flame, Dumbbell, Calendar } from 'lucide-react-native';
import { useAuthStore } from '@/store/auth.store';
import { useWorkouts, useCreateWorkout } from '@/hooks/use-workouts';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

export default function DashboardScreen() {
  const user = useAuthStore((s) => s.user);
  const { data } = useWorkouts();
  const createWorkout = useCreateWorkout();

  const recentWorkouts = data?.items?.slice(0, 3) ?? [];
  const thisWeek = data?.items?.filter((w) => {
    if (!w.startedAt) return false;
    const d = new Date(w.startedAt);
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return d >= weekAgo;
  }).length ?? 0;

  async function handleStartWorkout() {
    const w = await createWorkout.mutateAsync();
    router.push(`/(app)/workouts/${w.id}`);
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 20 }}>
        {/* Header */}
        <View className="mb-8">
          <Text className="text-muted text-sm">Добро пожаловать</Text>
          <Text className="text-foreground text-3xl font-bold">
            {user?.name ?? 'Атлет'} 👋
          </Text>
        </View>

        {/* Stats */}
        <View className="flex-row gap-3 mb-6">
          <View className="flex-1 bg-card rounded-2xl p-4 border border-border">
            <View className="flex-row items-center gap-2 mb-2">
              <Flame color="#6366f1" size={18} />
              <Text className="text-muted text-xs">На этой неделе</Text>
            </View>
            <Text className="text-foreground text-2xl font-bold">{thisWeek}</Text>
            <Text className="text-muted text-xs">тренировок</Text>
          </View>
          <View className="flex-1 bg-card rounded-2xl p-4 border border-border">
            <View className="flex-row items-center gap-2 mb-2">
              <Dumbbell color="#6366f1" size={18} />
              <Text className="text-muted text-xs">Всего</Text>
            </View>
            <Text className="text-foreground text-2xl font-bold">{data?.total ?? 0}</Text>
            <Text className="text-muted text-xs">тренировок</Text>
          </View>
        </View>

        {/* Start Workout Button */}
        <TouchableOpacity
          className="bg-primary rounded-2xl py-5 items-center mb-6 flex-row justify-center gap-3"
          onPress={handleStartWorkout}
          disabled={createWorkout.isPending}
        >
          <Plus color="white" size={22} />
          <Text className="text-white font-bold text-lg">
            {createWorkout.isPending ? 'Создание...' : 'Начать тренировку'}
          </Text>
        </TouchableOpacity>

        {/* Recent Workouts */}
        {recentWorkouts.length > 0 && (
          <View>
            <Text className="text-foreground font-semibold text-lg mb-3">Последние тренировки</Text>
            <View className="gap-3">
              {recentWorkouts.map((w) => (
                <TouchableOpacity
                  key={w.id}
                  className="bg-card rounded-2xl p-4 border border-border flex-row items-center justify-between"
                  onPress={() => router.push(`/(app)/workouts/${w.id}`)}
                >
                  <View className="flex-row items-center gap-3">
                    <View className="bg-primary/20 rounded-xl p-2">
                      <Dumbbell color="#6366f1" size={20} />
                    </View>
                    <View>
                      <Text className="text-foreground font-medium">
                        {w.title ?? 'Тренировка'}
                      </Text>
                      {w.startedAt && (
                        <Text className="text-muted text-xs">
                          {format(new Date(w.startedAt), 'd MMMM', { locale: ru })}
                        </Text>
                      )}
                    </View>
                  </View>
                  {w.finishedAt ? (
                    <View className="bg-green-500/20 rounded-full px-2 py-1">
                      <Text className="text-green-400 text-xs">Завершена</Text>
                    </View>
                  ) : (
                    <View className="bg-primary/20 rounded-full px-2 py-1">
                      <Text className="text-primary text-xs">Активна</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {recentWorkouts.length === 0 && (
          <View className="items-center py-12">
            <Dumbbell color="#27272a" size={64} />
            <Text className="text-muted mt-4 text-center">Тренировок пока нет</Text>
            <Text className="text-muted text-sm text-center">Нажмите «Начать тренировку»</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
