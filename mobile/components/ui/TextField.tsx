import { Text, TextInput, View, type TextInputProps } from 'react-native';

export interface TextFieldProps extends Omit<TextInputProps, 'className'> {
  label: string;
  error?: string;
}

export function TextField({ label, error, ...inputProps }: TextFieldProps) {
  return (
    <View className="gap-1">
      <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor="#9ca3af"
        className={`min-h-12 rounded-xl border px-3 text-base text-gray-900 dark:text-gray-100 ${
          error ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'
        } bg-white dark:bg-gray-900`}
        {...inputProps}
      />
      {error ? (
        <Text accessibilityLiveRegion="polite" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </Text>
      ) : null}
    </View>
  );
}
