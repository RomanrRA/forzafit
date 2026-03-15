import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { ArrowLeft, Plus, CheckCircle, Circle, Trash2 } from 'lucide-react-native';
import { useWorkout, useFinishWorkout, useAddExerciseToWorkout, useUpdateSet, useAddSet } from '@/hooks/use-workouts';
import { api } from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';

export default function WorkoutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: workout, isLoading } = useWorkout(id);
  const finishWorkout = useFinishWorkout();
  const addSet = useAddSet();
  const updateSet = useUpdateSet();
  const qc = useQueryClient();

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <Text className="text-muted">Загрузка...</Text>
      </SafeAreaView>
    );
  }

  const isFinished = !!workout?.finishedAt;

  async function handleFinish() {
    Alert.alert('Завершить тренировку?', 'Тренировка будет отмечена как завершённая', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Завершить',
        onPress: async () => {
          await finishWorkout.mutateAsync(id);
          router.back();
        },
      },
    ]);
  }

  async function handleRemoveExercise(weId: string) {
    await api.delete(`/workouts/${id}/exercises/${weId}`);
    qc.invalidateQueries({ queryKey: ['workouts', id] });
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-row items-center px-5 py-3 border-b border-border">
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <ArrowLeft color="#fafafa" size={24} />
        </TouchableOpacity>
        <Text className="text-foreground font-semibold text-lg flex-1" numberOfLines={1}>
          {workout?.title ?? 'Тренировка'}
        </Text>
        {!isFinished && (
          <TouchableOpacity
            className="bg-primary rounded-xl px-3 py-1.5"
            onPress={handleFinish}
          >
            <Text className="text-white text-sm font-medium">Завершить</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView className="flex-1 px-5 pt-4">
        {(workout?.exercises ?? []).map((we: any) => (
          <View key={we.id} className="bg-card rounded-2xl border border-border mb-4">
            <View className="flex-row items-center justify-between px-4 pt-4 pb-2">
              <Text className="text-foreground font-semibold flex-1" numberOfLines={1}>
                {we.exercise?.name ?? 'Упражнение'}
              </Text>
              {!isFinished && (
                <TouchableOpacity onPress={() => handleRemoveExercise(we.id)}>
                  <Trash2 color="#71717a" size={18} />
                </TouchableOpacity>
              )}
            </View>

            {/* Sets */}
            <View className="px-4 pb-2">
              <View className="flex-row mb-2">
                <Text className="text-muted text-xs w-8">#</Text>
                <Text className="text-muted text-xs flex-1 text-center">Кг</Text>
                <Text className="text-muted text-xs flex-1 text-center">Повт.</Text>
                <Text className="text-muted text-xs w-8 text-center">✓</Text>
              </View>
              {(we.sets ?? []).map((set: any, i: number) => (
                <SetRow
                  key={set.id}
                  set={set}
                  index={i}
                  disabled={isFinished}
                  onUpdate={(patch) => updateSet.mutate({ workoutId: id, weId: we.id, setId: set.id, patch })}
                />
              ))}
            </View>

            {!isFinished && (
              <TouchableOpacity
                className="mx-4 mb-4 border border-dashed border-border rounded-xl py-2 items-center"
                onPress={() => addSet.mutate({ workoutId: id, weId: we.id })}
              >
                <Text className="text-muted text-sm">+ Добавить подход</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}

        {!isFinished && (
          <TouchableOpacity
            className="border border-dashed border-primary/50 rounded-2xl py-4 items-center mb-6 flex-row justify-center gap-2"
            onPress={() => router.push({ pathname: '/(app)/exercises/select', params: { workoutId: id } })}
          >
            <Plus color="#6366f1" size={20} />
            <Text className="text-primary font-medium">Добавить упражнение</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function SetRow({
  set,
  index,
  disabled,
  onUpdate,
}: {
  set: any;
  index: number;
  disabled: boolean;
  onUpdate: (patch: any) => void;
}) {
  const [weight, setWeight] = useState(set.weightKg?.toString() ?? '');
  const [reps, setReps] = useState(set.reps?.toString() ?? '');

  return (
    <View className="flex-row items-center mb-2">
      <Text className="text-muted text-sm w-8">{index + 1}</Text>
      <TextInput
        className="flex-1 bg-background border border-border rounded-lg px-2 py-1.5 text-foreground text-sm text-center mr-2"
        value={weight}
        onChangeText={setWeight}
        onBlur={() => { if (weight !== (set.weightKg?.toString() ?? '')) onUpdate({ weightKg: Number(weight) || 0 }); }}
        keyboardType="decimal-pad"
        editable={!disabled}
        placeholderTextColor="#71717a"
        placeholder="—"
      />
      <TextInput
        className="flex-1 bg-background border border-border rounded-lg px-2 py-1.5 text-foreground text-sm text-center mr-2"
        value={reps}
        onChangeText={setReps}
        onBlur={() => { if (reps !== (set.reps?.toString() ?? '')) onUpdate({ reps: Number(reps) || 0 }); }}
        keyboardType="number-pad"
        editable={!disabled}
        placeholderTextColor="#71717a"
        placeholder="—"
      />
      <TouchableOpacity
        className="w-8 items-center"
        onPress={() => !disabled && onUpdate({ completed: !set.completed })}
      >
        {set.completed
          ? <CheckCircle color="#22c55e" size={22} />
          : <Circle color="#27272a" size={22} />}
      </TouchableOpacity>
    </View>
  );
}
