import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CommonActions } from '@react-navigation/native';
import { verifyOtp, resendOtp } from '../../api';
import type { NavigationProp, RouteProps } from '../../types';
import CustomButton from '../../components/CustomButton';

interface Props {
  navigation: NavigationProp<'VerifyOtp'>;
  route: RouteProps<'VerifyOtp'>;
}

export default function VerifyOtpScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { email } = route.params;
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleVerify() {
    if (otp.trim().length !== 6) {
      setError('Please enter the 6-digit code from your email.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await verifyOtp(email, otp.trim());
      // Verified — reset stack so back button can't return here
      navigation.dispatch(
        CommonActions.reset({ index: 0, routes: [{ name: 'Login' }] }),
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Verification failed. Try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setError(null);
    setSuccess(null);
    setResending(true);
    try {
      await resendOtp(email);
      setSuccess('A new code has been sent to your email.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not resend code. Try again.');
    } finally {
      setResending(false);
    }
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white dark:bg-[#09090B]"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ paddingTop: Math.max(insets.top, 16) }}
    >
      <ScrollView contentContainerClassName="flex-grow justify-center px-6 py-12" keyboardShouldPersistTaps="handled">
        <View className="w-full max-w-md self-center">
          <Text className="text-[34px] font-extrabold text-primary text-center mb-1.5">ScanCode</Text>
          <Text className="text-[22px] font-bold text-gray-900 dark:text-white text-center mb-2.5">Verify your email</Text>
          <Text className="text-[15px] text-gray-500 dark:text-zinc-400 text-center leading-[22px] mb-8">
            Enter the 6-digit code we sent to{'\n'}
            <Text className="text-primary font-semibold">{email}</Text>
          </Text>

          {error && (
            <View className="bg-red-100 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4">
              <Text className="text-red-600 dark:text-red-400 text-sm text-center">{error}</Text>
            </View>
          )}
          {success && (
            <View className="bg-emerald-100 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg p-3 mb-4">
              <Text className="text-emerald-800 dark:text-emerald-300 text-sm text-center">{success}</Text>
            </View>
          )}

          <TextInput
            className="border-2 border-primary rounded-2xl px-3.5 py-[18px] text-[28px] font-bold text-gray-900 dark:text-white bg-gray-50 dark:bg-zinc-900 mb-5 tracking-[12px]"
            value={otp}
            onChangeText={(v) => setOtp(v.replace(/\D/g, '').slice(0, 6))}
            keyboardType="number-pad"
            placeholder="000000"
            placeholderTextColor="#9CA3AF"
            maxLength={6}
            editable={!loading}
            textAlign="center"
          />

          <CustomButton
            title="Verify Email"
            onPress={handleVerify}
            loading={loading}
            disabled={otp.length < 6}
            className="mb-4"
          />

          <TouchableOpacity
            className="flex-row justify-center mt-1"
            onPress={handleResend}
            disabled={resending || loading}
          >
            {resending ? (
              <ActivityIndicator size="small" color="#059669" />
            ) : (
              <>
                <Text className="text-sm text-gray-500 dark:text-zinc-400">Didn't get the code? </Text>
                <Text className="text-sm text-primary font-semibold">Resend</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
