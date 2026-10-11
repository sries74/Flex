import { useState } from 'react';
import { FlatList, Text, View } from 'react-native';
import { StopCard } from '@/components/itinerary/StopCard';
import { StopEditor } from '@/components/itinerary/StopEditor';
import { useItinerary } from '@/components/itinerary/ItineraryProvider';
import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Sheet';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/ScreenState';
import { nextStopNumber, reviewCount } from '@/lib/itinerary/state';
import { extractWithFallback, getOcrProviders } from '@/lib/ocr';
import { pickItineraryImage } from '@/lib/ocr/pickImage';
import type { Stop } from '@/lib/itinerary/itinerary';

type Editing = { kind: 'edit'; stop: Stop } | { kind: 'add' } | null;

export default function ItineraryScreen() {
  const { state, hydrated, replace, upsert, remove, clear } = useItinerary();
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Editing>(null);
  const [confirmingReplace, setConfirmingReplace] = useState(false);

  async function scan() {
    setScanError(null);
    const picked = await pickItineraryImage();
    if (picked.status === 'cancelled') return;
    if (!picked.result.ok) {
      setScanError(picked.result.message);
      return;
    }

    const providers = getOcrProviders();
    if (providers.length === 0) {
      setScanError("Scanning isn't set up in this build yet. You can add your stops by hand.");
      return;
    }

    setScanning(true);
    try {
      const outcome = await extractWithFallback(providers, picked.result.image);
      if (!outcome.ok) setScanError(outcome.message);
      else if (outcome.stops.length === 0) {
        setScanError("We couldn't find any stops in that image. Try a clearer screenshot.");
      } else replace(outcome.stops, outcome.issues);
    } finally {
      setScanning(false);
    }
  }

  if (!hydrated) return <LoadingState message="Loading your stops…" />;
  if (scanning) return <LoadingState message="Reading your itinerary…" />;

  const editor =
    editing === null ? null : (
      <StopEditor
        stop={editing.kind === 'edit' ? editing.stop : undefined}
        defaultStopNumber={nextStopNumber(state.stops)}
        existingNumbers={state.stops.map((s) => s.stopNumber)}
        onSave={(stop, replaces) => upsert(stop, replaces)}
        onDelete={remove}
        onClose={() => setEditing(null)}
      />
    );

  if (scanError && state.stops.length === 0) {
    return (
      <View className="flex-1">
        <ErrorState message={scanError} onRetry={scan} />
        <View className="p-6">
          <Button
            title="Add stops by hand"
            variant="secondary"
            onPress={() => {
              setScanError(null);
              setEditing({ kind: 'add' });
            }}
          />
        </View>
        {editor}
      </View>
    );
  }

  if (state.stops.length === 0) {
    return (
      <View className="flex-1">
        <EmptyState
          title="No stops yet"
          message="Import a screenshot of your itinerary to see your stops here."
          actionLabel="Scan itinerary screenshot"
          onAction={scan}
        />
        <View className="p-6">
          <Button
            title="Add a stop by hand"
            variant="secondary"
            onPress={() => setEditing({ kind: 'add' })}
          />
        </View>
        {editor}
      </View>
    );
  }

  const needReview = reviewCount(state);
  return (
    <View className="flex-1 bg-gray-50 dark:bg-black">
      <FlatList
        data={state.stops}
        keyExtractor={(s) => String(s.stopNumber)}
        contentContainerClassName="gap-3 p-4"
        ListHeaderComponent={
          <View className="gap-2">
            <Text className="text-sm text-gray-600 dark:text-gray-400">
              {state.stops.length} {state.stops.length === 1 ? 'stop' : 'stops'}
            </Text>
            {needReview > 0 ? (
              <Text
                accessibilityRole="alert"
                className="font-semibold text-amber-700 dark:text-amber-400"
              >
                {needReview} {needReview === 1 ? 'stop needs' : 'stops need'} a check
              </Text>
            ) : null}
            {scanError ? (
              <Text accessibilityRole="alert" className="text-red-600 dark:text-red-400">
                {scanError}
              </Text>
            ) : null}
          </View>
        }
        renderItem={({ item }) => (
          <StopCard
            stop={item}
            issues={state.issues.filter((i) => i.stopNumber === item.stopNumber)}
            onPress={() => setEditing({ kind: 'edit', stop: item })}
          />
        )}
        ListFooterComponent={
          <View className="mt-2 gap-2">
            <Button
              title="Add a stop"
              variant="secondary"
              onPress={() => setEditing({ kind: 'add' })}
            />
            <Button
              title="Replace with a new scan"
              variant="ghost"
              onPress={() => setConfirmingReplace(true)}
            />
            <Button title="Clear all stops" variant="ghost" onPress={clear} />
          </View>
        }
      />
      {editor}
      <Sheet
        visible={confirmingReplace}
        title="Replace your stops?"
        onClose={() => setConfirmingReplace(false)}
      >
        <Text className="text-gray-700 dark:text-gray-300">
          Scanning a new screenshot replaces the {state.stops.length} stops you have now, including
          any edits.
        </Text>
        <Button
          title="Choose a screenshot"
          onPress={() => {
            setConfirmingReplace(false);
            void scan();
          }}
        />
      </Sheet>
    </View>
  );
}
