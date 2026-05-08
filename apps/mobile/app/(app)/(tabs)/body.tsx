import { useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Scale, Plus } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const STORAGE_KEY = 'forzafit_body_measurements_mobile';

interface BodyEntry {
  id: string;
  date: string;
  weightKg: number | null;
  bodyFatPct: number | null;
  waistCm: number | null;
  chestCm: number | null;
}

export default function BodyScreen() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [weight, setWeight] = useState('');
  const [fat, setFat] = useState('');
  const [waist, setWaist] = useState('');
  const [chest, setChest] = useState('');

  const { data: entries = [] } = useQuery({
    queryKey: ['body-entries'],
    queryFn: async () => {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      return JSON.parse(raw) as BodyEntry[];
    },
  });

  const addEntry = useMutation({
    mutationFn: async () => {
      if (!weight && !fat && !waist && !chest) {
        Alert.alert('Ошибка', 'Введите хотя бы одно значение');
        return;
      }
      const entry: BodyEntry = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        weightKg: weight ? Number(weight) : null,
        bodyFatPct: fat ? Number(fat) : null,
        waistCm: waist ? Number(waist) : null,
        chestCm: chest ? Number(chest) : null,
      };
      const updated = [entry, ...entries];
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    },
    onSuccess: (data) => {
      if (data) qc.setQueryData(['body-entries'], data);
      setWeight(''); setFat(''); setWaist(''); setChest('');
      setShowForm(false);
    },
  });

  const latest = entries[0];

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1 px-5">
        <View className="flex-row items-center justify-between pt-4 pb-6">
          <Text className="text-foreground text-2xl font-bold">Замеры тела</Text>
          <TouchableOpacity
            className="bg-primary rounded-xl p-2"
            onPress={() => setShowForm(!showForm)}
          >
            <Plus color="white" size={22} />
          </TouchableOpacity>
        </View>

        {showForm && (
          <View className="bg-card rounded-2xl p-4 border border-border mb-4">
            <Text className="text-foreground font-semibold mb-3">Новый замер</Text>
            {[
              { label: 'Вес, кг', value: weight, set: setWeight, placeholder: '75.5' },
              { label: '% жира', value: fat, set: setFat, placeholder: '15' },
              { label: 'Талия, см', value: waist, set: setWaist, placeholder: '80' },
              { label: 'Грудь, см', value: chest, set: setChest, placeholder: '100' },
            ].map((f) => (
              <View key={f.label} className="mb-3">
                <Text className="text-muted text-xs mb-1">{f.label}</Text>
                <TextInput
                  className="bg-background border border-border rounded-xl px-3 py-2.5 text-foreground"
                  placeholder={f.placeholder}
                  placeholderTextColor="#71717a"
                  value={f.value}
                  onChangeText={f.set}
                  keyboardType="decimal-pad"
                />
              </View>
            ))}
            <View className="flex-row gap-3">
              <TouchableOpacity
                className="flex-1 bg-primary rounded-xl py-3 items-center"
                onPress={() => addEntry.mutate()}
              >
                <Text className="text-white font-medium">Сохранить</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 bg-card border border-border rounded-xl py-3 items-center"
                onPress={() => setShowForm(false)}
              >
                <Text className="text-foreground">Отмена</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {latest && (
          <View className="flex-row flex-wrap gap-3 mb-6">
            {latest.weightKg && (
              <View className="flex-1 min-w-[140px] bg-card rounded-2xl p-4 border border-border">
                <View className="flex-row items-center gap-2 mb-1">
                  <Scale color="#6366f1" size={16} />
                  <Text className="text-muted text-xs">Вес</Text>
                </View>
                <Text className="text-foreground text-2xl font-bold">{latest.weightKg} <Text className="text-sm text-muted font-normal">кг</Text></Text>
              </View>
            )}
            {latest.bodyFatPct && (
              <View className="flex-1 min-w-[140px] bg-card rounded-2xl p-4 border border-border">
                <Text className="text-muted text-xs mb-1">% жира</Text>
                <Text className="text-foreground text-2xl font-bold">{latest.bodyFatPct}<Text className="text-sm text-muted font-normal">%</Text></Text>
              </View>
            )}
          </View>
        )}

        {entries.length === 0 && !showForm && (
          <View className="items-center py-16">
            <Scale color="#27272a" size={64} />
            <Text className="text-muted mt-4">Замеров пока нет</Text>
          </View>
        )}

        {entries.length > 0 && (
          <View>
            <Text className="text-foreground font-semibold text-lg mb-3">История</Text>
            <View className="gap-3 pb-6">
              {entries.map((e) => (
                <View key={e.id} className="bg-card rounded-2xl p-4 border border-border">
                  <Text className="text-muted text-xs mb-2">
                    {new Date(e.date).toLocaleDateString('ru', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </Text>
                  <View className="flex-row flex-wrap gap-3">
                    {e.weightKg && <Text className="text-foreground text-sm">Вес: {e.weightKg} кг</Text>}
                    {e.bodyFatPct && <Text className="text-foreground text-sm">Жир: {e.bodyFatPct}%</Text>}
                    {e.waistCm && <Text className="text-foreground text-sm">Талия: {e.waistCm} см</Text>}
                    {e.chestCm && <Text className="text-foreground text-sm">Грудь: {e.chestCm} см</Text>}
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
