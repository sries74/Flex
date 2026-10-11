import { useState } from 'react';
import { View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Sheet';
import { TextField } from '@/components/ui/TextField';
import {
  draftFromStop,
  parseStopDraft,
  type DraftErrors,
  type StopDraft,
} from '@/lib/itinerary/format';
import type { Stop } from '@/lib/itinerary/itinerary';

export function StopEditor({
  stop,
  defaultStopNumber,
  existingNumbers,
  onSave,
  onDelete,
  onClose,
}: {
  /** The stop being edited; omit to add a new one. */
  stop?: Stop;
  defaultStopNumber: number;
  existingNumbers: readonly number[];
  onSave: (stop: Stop, replacesNumber?: number) => void;
  onDelete?: (stopNumber: number) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<StopDraft>(
    stop
      ? draftFromStop(stop)
      : {
          stopNumber: String(defaultStopNumber),
          address: '',
          windowStart: '',
          windowEnd: '',
          packageCount: '',
        },
  );
  const [errors, setErrors] = useState<DraftErrors>({});
  const set = (field: keyof StopDraft) => (value: string) =>
    setDraft((d) => ({ ...d, [field]: value }));

  function save() {
    const result = parseStopDraft(draft, { existingNumbers, editingNumber: stop?.stopNumber });
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    onSave(result.stop, stop?.stopNumber);
    onClose();
  }

  return (
    <Sheet visible title={stop ? `Edit stop ${stop.stopNumber}` : 'Add a stop'} onClose={onClose}>
      <TextField
        label="Stop number"
        value={draft.stopNumber}
        onChangeText={set('stopNumber')}
        error={errors.stopNumber}
        keyboardType="number-pad"
      />
      <TextField
        label="Address"
        value={draft.address}
        onChangeText={set('address')}
        error={errors.address}
        autoCapitalize="words"
        multiline
      />
      <TextField
        label="Window starts (optional)"
        value={draft.windowStart}
        onChangeText={set('windowStart')}
        error={errors.windowStart}
        placeholder="3:00 PM"
        autoCapitalize="characters"
      />
      <TextField
        label="Deliver by (optional)"
        value={draft.windowEnd}
        onChangeText={set('windowEnd')}
        error={errors.windowEnd}
        placeholder="6:30 PM"
        autoCapitalize="characters"
      />
      <TextField
        label="Packages (optional)"
        value={draft.packageCount}
        onChangeText={set('packageCount')}
        error={errors.packageCount}
        keyboardType="number-pad"
      />
      <View className="gap-2">
        <Button title="Save stop" onPress={save} />
        {stop && onDelete ? (
          <Button
            title="Delete stop"
            variant="ghost"
            onPress={() => {
              onDelete(stop.stopNumber);
              onClose();
            }}
          />
        ) : null}
      </View>
    </Sheet>
  );
}
