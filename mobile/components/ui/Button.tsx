import { ActivityIndicator, Pressable, Text } from 'react-native';

type Variant = 'primary' | 'secondary' | 'ghost';

const container: Record<Variant, string> = {
  primary: 'bg-blue-600 active:bg-blue-700',
  secondary: 'bg-gray-200 active:bg-gray-300 dark:bg-gray-800 dark:active:bg-gray-700',
  ghost: 'bg-transparent active:bg-gray-100 dark:active:bg-gray-800',
};

const label: Record<Variant, string> = {
  primary: 'text-white',
  secondary: 'text-gray-900 dark:text-gray-100',
  ghost: 'text-blue-600 dark:text-blue-400',
};

export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  accessibilityLabel,
}: ButtonProps) {
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      // min-h-12 = 48dp touch target
      className={`min-h-12 flex-row items-center justify-center rounded-xl px-4 ${container[variant]} ${inactive ? 'opacity-50' : ''}`}
    >
      {loading ? <ActivityIndicator color={variant === 'primary' ? '#fff' : '#2563eb'} /> : null}
      <Text className={`text-base font-semibold ${loading ? 'ml-2' : ''} ${label[variant]}`}>
        {title}
      </Text>
    </Pressable>
  );
}
