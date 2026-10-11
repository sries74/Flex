import type { ReactNode } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { Button } from './Button';

export interface SheetProps {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

/** Simple bottom sheet built on Modal. Tapping the scrim or Close dismisses it. */
export function Sheet({ visible, title, onClose, children }: SheetProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        accessibilityLabel="Dismiss"
        className="flex-1 justify-end bg-black/50"
        onPress={onClose}
      >
        {/* Inner Pressable swallows taps so the sheet body doesn't dismiss itself. */}
        <Pressable className="gap-4 rounded-t-3xl bg-white p-6 dark:bg-gray-900">
          <View accessibilityRole="header">
            <Text className="text-lg font-bold text-gray-900 dark:text-gray-100">{title}</Text>
          </View>
          {children}
          <Button title="Close" variant="secondary" onPress={onClose} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}
