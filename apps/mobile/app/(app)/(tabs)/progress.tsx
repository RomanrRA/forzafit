import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChartLine } from 'lucide-react-native';

export default function ProgressScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1 px-5">
        <Text className="text-foreground text-2xl font-bold pt-4 pb-6">Прогресс</Text>
        <View className="items-center py-16">
          <ChartLine color="#27272a" size={64} />
          <Text className="text-muted mt-4">Скоро появятся графики прогресса</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
