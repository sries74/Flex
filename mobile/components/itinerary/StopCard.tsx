import { Pressable, Text, View } from 'react-native';
import { Card } from '@/components/ui/Card';
import { formatMinutes } from '@/lib/itinerary/format';
import { issueMessage, type Issue, type Stop } from '@/lib/itinerary/itinerary';

export function StopCard({
  stop,
  issues,
  onPress,
}: {
  stop: Stop;
  issues: readonly Issue[];
  onPress: () => void;
}) {
  const deadline =
    stop.windowEndMin === null
      ? 'No delivery deadline'
      : `Deliver by ${formatMinutes(stop.windowEndMin)}`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Edit stop ${stop.stopNumber}`}
      onPress={onPress}
    >
      <Card>
        <View className="flex-row items-start gap-3">
          <Text className="min-w-8 text-xl font-bold text-blue-600 dark:text-blue-400">
            {stop.stopNumber}
          </Text>
          <View className="flex-1 gap-1">
            <Text className="text-base font-semibold text-gray-900 dark:text-gray-100">
              {stop.address}
            </Text>
            <Text className="text-sm text-gray-600 dark:text-gray-400">
              {deadline}
              {stop.packageCount !== null ? ` · ${stop.packageCount} pkg` : ''}
            </Text>
            {stop.needsReview ? (
              <View className="mt-1 gap-1">
                <Text className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                  Check this stop
                </Text>
                {issues.map((i) => (
                  <Text key={i.code} className="text-sm text-amber-700 dark:text-amber-400">
                    {issueMessage(i.code)}
                  </Text>
                ))}
              </View>
            ) : null}
          </View>
        </View>
      </Card>
    </Pressable>
  );
}
