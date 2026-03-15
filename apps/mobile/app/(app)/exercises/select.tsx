import { useState } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Search } from 'lucide-react-native';
import { useExercises } from '@/hooks/use-exercises';
import { useAddExerciseToWorkout } from '@/hooks/use-workouts';

const MUSCLE_GROUPS = ['Все', 'Грудь', 'Спина', 'Плечи', 'Бицепс', 'Трицепс', 'Ноги', 'Пресс', 'Кардио'];

export default function ExerciseSelectScreen() {
  const { workoutId } = useLocalSearchParams<{ workoutId: string }>();
  const [search, setSearch] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('Все');

  const { data } = useExercises({
    muscleGroup: selectedGroup !== 'Все' ? selectedGroup : undefined,
    search: search || undefined,
  });

  const addExercise = useAddExerciseToWorkout(workoutId);

  async function handleSelect(exerciseId: string) {
    await addExercise.mutateAsync(exerciseId);
    router.back();
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-row items-center px-5 py-3 border-b border-border">
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <ArrowLeft color="#fafafa" size={24} />
        </TouchableOpacity>
        <Text className="text-foreground font-semibold text-lg">Выбрать упражнение</Text>
      </View>

      <View className="px-5 py-3">
        <View className="flex-row items-center bg-card border border-border rounded-xl px-3 gap-2">
          <Search color="#71717a" size={18} />
          <TextInput
            className="flex-1 py-3 text-foreground"
            placeholder="Поиск..."
            placeholderTextColor="#71717a"
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      <View className="h-10 mb-2">
        <FlatList
          horizontal
          data={MUSCLE_GROUPS}
          keyExtractor={(item) => item}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              className={`rounded-full px-4 py-1.5 border ${selectedGroup === item ? 'bg-primary border-primary' : 'bg-card border-border'}`}
              onPress={() => setSelectedGroup(item)}
            >
              <Text className={selectedGroup === item ? 'text-white text-sm' : 'text-muted text-sm'}>
                {item}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      <FlatList
        data={data?.items ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 20, gap: 10 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            className="bg-card rounded-2xl p-4 border border-border"
            onPress={() => handleSelect(item.id)}
          >
            <Text className="text-foreground font-medium">{item.name}</Text>
            <Text className="text-muted text-xs mt-1">
              {item.muscleGroups.join(', ')}
              {item.equipment ? ` · ${item.equipment}` : ''}
            </Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text className="text-muted text-center mt-8">Упражнений не найдено</Text>
        }
      />
    </SafeAreaView>
  );
}
