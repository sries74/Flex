import { ActivityIndicator, Text, View } from 'react-native';
import { Button } from './Button';

function Centered({ children }: { children: React.ReactNode }) {
  return <View className="flex-1 items-center justify-center gap-3 p-6">{children}</View>;
}

export function LoadingState({ message = 'Loading…' }: { message?: string }) {
  return (
    <Centered>
      <ActivityIndicator accessibilityLabel="Loading" />
      <Text className="text-gray-600 dark:text-gray-400">{message}</Text>
    </Centered>
  );
}

export function EmptyState({
  title,
  message,
  actionLabel,
  onAction,
}: {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <Centered>
      <Text
        accessibilityRole="header"
        className="text-lg font-bold text-gray-900 dark:text-gray-100"
      >
        {title}
      </Text>
      <Text className="text-center text-gray-600 dark:text-gray-400">{message}</Text>
      {actionLabel && onAction ? <Button title={actionLabel} onPress={onAction} /> : null}
    </Centered>
  );
}

export function ErrorState({
  message = 'Something went wrong.',
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <Centered>
      <Text accessibilityRole="alert" className="text-center text-red-600 dark:text-red-400">
        {message}
      </Text>
      {onRetry ? <Button title="Try again" variant="secondary" onPress={onRetry} /> : null}
    </Centered>
  );
}
