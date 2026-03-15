import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, Dumbbell } from 'lucide-react-native';
import { useWorkouts, useCreateWorkout } from '@/hooks/use-workouts';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

export default function WorkoutsScreen() {
  const { data, isLoading } = useWorkouts();
  const createWorkout = useCreateWorkout();

  async function handleCreate() {
    const w = await createWorkout.mutateAsync();
    router.push(`/(app)/workouts/${w.id}`);
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-row items-center justify-between px-5 pt-4 pb-2">
        <Text className="text-foreground text-2xl font-bold">Тренировки</Text>
        <TouchableOpacity
          className="bg-primary rounded-xl p-2"
          onPress={handleCreate}
          disabled={createWorkout.isPending}
        >
          <Plus color="white" size={22} />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-5">
        {isLoading && (
          <Text className="text-muted text-center mt-10">Загрузка...</Text>
        )}
        {!isLoading && (data?.items ?? []).length === 0 && (
          <View className="items-center py-16">
            <Dumbbell color="#27272a" size={64} />
            <Text className="text-muted mt-4">Тренировок пока нет</Text>
          </View>
        )}
        <View className="gap-3 pb-6 pt-2">
          {(data?.items ?? []).map((w) => (
            <TouchableOpacity
              key={w.id}
              className="bg-card rounded-2xl p-4 border border-border"
              onPress={() => router.push(`/(app)/workouts/${w.id}`)}
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-3 flex-1">
                  <View className="bg-primary/20 rounded-xl p-2">
                    <Dumbbell color="#6366f1" size={20} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-foreground font-medium" numberOfLines={1}>
                      {w.title ?? 'Тренировка'}
                    </Text>
                    {w.startedAt && (
                      <Text className="text-muted text-xs">
                        {format(new Date(w.startedAt), 'd MMMM yyyy', { locale: ru })}
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
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
