import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { useAuth } from '@/components/auth/AuthProvider';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { authErrorMessage, validateCredentials } from '@/lib/auth';
import type { CredentialErrors } from '@/lib/auth/validation';

export default function LoginScreen() {
  const { service } = useAuth();
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<CredentialErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isSignUp = mode === 'signUp';

  async function submit() {
    const found = validateCredentials(email, password, { newAccount: isSignUp });
    setErrors(found);
    setFormError(null);
    if (found.email || found.password) return;

    setBusy(true);
    try {
      if (isSignUp) await service.signUpWithEmail(email, password);
      else await service.signInWithEmail(email, password);
      // On success the auth listener flips status and the root navigator swaps to the tabs.
    } catch (e) {
      setFormError(authErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-white dark:bg-black"
    >
      <ScrollView
        contentContainerClassName="flex-grow justify-center gap-4 p-6"
        keyboardShouldPersistTaps="handled"
      >
        <Text
          accessibilityRole="header"
          className="text-3xl font-bold text-gray-900 dark:text-gray-100"
        >
          {isSignUp ? 'Create account' : 'Welcome back'}
        </Text>
        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          error={errors.email}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
        />
        <TextField
          label="Password"
          value={password}
          onChangeText={setPassword}
          error={errors.password}
          secureTextEntry
          autoCapitalize="none"
          autoComplete={isSignUp ? 'new-password' : 'current-password'}
          textContentType={isSignUp ? 'newPassword' : 'password'}
          onSubmitEditing={submit}
        />
        {formError ? (
          <Text accessibilityRole="alert" className="text-red-600 dark:text-red-400">
            {formError}
          </Text>
        ) : null}
        <View className="gap-2">
          <Button title={isSignUp ? 'Create account' : 'Sign in'} onPress={submit} loading={busy} />
          <Button
            title={isSignUp ? 'I already have an account' : 'Create an account'}
            variant="ghost"
            disabled={busy}
            onPress={() => {
              setMode(isSignUp ? 'signIn' : 'signUp');
              setErrors({});
              setFormError(null);
            }}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
