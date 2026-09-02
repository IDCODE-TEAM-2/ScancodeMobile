import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Mail, ArrowLeft } from 'lucide-react-native';
import { forgotPassword } from '../../api';
import type { NavigationProp } from '../../types';
import CustomInput from '../../components/CustomInput';
import CustomButton from '../../components/CustomButton';

interface Props {
  navigation: NavigationProp<'ForgotPassword'>;
}

export default function ForgotPasswordScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await forgotPassword(email.trim());
      setIsSubmitted(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white dark:bg-[#09090B]"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ paddingTop: Math.max(insets.top, 16) }}
    >
      <ScrollView contentContainerClassName="flex-grow justify-center px-6" keyboardShouldPersistTaps="handled">
        <View className="w-full max-w-md self-center">
          <Text className="text-[34px] font-extrabold text-primary text-center mb-1.5">ScanCode</Text>
          <Text className="text-[22px] font-bold text-gray-900 dark:text-white text-center mb-2">Forgot Password?</Text>
          <Text className="text-sm text-gray-500 dark:text-zinc-400 text-center mb-7 leading-5">
            Enter your email address below and we'll send you instructions to reset your password.
          </Text>

          {isSubmitted ? (
            <View className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-5 items-center mb-5">
              <View className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900 items-center justify-center mb-2.5">
                <Mail size={26} color="#059669" strokeWidth={2} />
              </View>
              <Text className="text-lg font-bold text-emerald-800 dark:text-emerald-300 mb-1.5">Check your email</Text>
              <Text className="text-sm text-emerald-700 dark:text-emerald-400 text-center leading-5 mb-4">
                If an account exists for <Text className="font-bold text-emerald-800 dark:text-emerald-300">{email}</Text>, you will receive a password reset link shortly.
              </Text>
              <TouchableOpacity
                className="py-2 px-4 rounded-lg bg-emerald-100 dark:bg-emerald-900"
                onPress={() => {
                  setIsSubmitted(false);
                  setError(null);
                }}
              >
                <Text className="text-emerald-700 dark:text-emerald-300 text-[13px] font-semibold">Try another email</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {error && (
                <View className="bg-red-100 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4">
                  <Text className="text-red-600 dark:text-red-400 text-sm text-center">{error}</Text>
                </View>
              )}

              <View className="gap-2">
                <CustomInput
                  label="Email Address"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  placeholder="you@example.com"
                  editable={!loading}
                />

                <CustomButton title="Send Reset Link" onPress={handleSubmit} loading={loading} />
              </View>
            </>
          )}

          <TouchableOpacity
            className="flex-row items-center justify-center gap-1.5 mt-6"
            onPress={() => navigation.navigate('Login')}
            disabled={loading}
          >
            <ArrowLeft size={14} color="#059669" strokeWidth={2.5} />
            <Text className="text-primary text-sm font-semibold">Back to Login</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
