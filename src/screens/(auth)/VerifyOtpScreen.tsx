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
import { CommonActions } from '@react-navigation/native';
import { verifyOtp, resendOtp } from '../../api';
import type { NavigationProp, RouteProps } from '../../types';
import CustomButton from '../../components/CustomButton';

interface Props {
  navigation: NavigationProp<'VerifyOtp'>;
  route: RouteProps<'VerifyOtp'>;
}

export default function VerifyOtpScreen({ navigation, route }: Props) {
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
      className="flex-1"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerClassName="flex-grow" keyboardShouldPersistTaps="handled">
        <View className="flex-1 bg-white px-6 justify-center py-12">
          <Text className="text-[34px] font-extrabold text-primary text-center mb-1.5">ScanCode</Text>
          <Text className="text-[22px] font-bold text-gray-900 text-center mb-2.5">Verify your email</Text>
          <Text className="text-[15px] text-gray-500 text-center leading-[22px] mb-8">
            Enter the 6-digit code we sent to{'\n'}
            <Text className="text-primary font-semibold">{email}</Text>
          </Text>

          {error && (
            <View className="bg-red-100 rounded-lg p-3 mb-4">
              <Text className="text-red-600 text-sm">{error}</Text>
            </View>
          )}
          {success && (
            <View className="bg-emerald-100 rounded-lg p-3 mb-4">
              <Text className="text-emerald-800 text-sm">{success}</Text>
            </View>
          )}

          <TextInput
            className="border-2 border-primary rounded-2xl px-3.5 py-[18px] text-[28px] font-bold text-gray-900 bg-gray-50 mb-5 tracking-[12px]"
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
              <ActivityIndicator size="small" color="#6C63FF" />
            ) : (
              <>
                <Text className="text-sm text-gray-500">Didn't get the code? </Text>
                <Text className="text-sm text-primary font-semibold">Resend</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
