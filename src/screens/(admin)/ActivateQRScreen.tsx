import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { CheckCircle2, PartyPopper } from 'lucide-react-native';
import * as WebBrowser from 'expo-web-browser';
import { initializePayment, verifyPayment, devSkipPayment } from '../../api';
import type { NavigationProp, RouteProps } from '../../types';
import { useAppContext } from '../../context/AppContext';
import { formatMoney } from '../../utils/currency';
import { cn } from '../../utils/cn';

interface Props {
  navigation: NavigationProp<'ActivateQR'>;
  route: RouteProps<'ActivateQR'>;
}

type Step = 'idle' | 'initializing' | 'waiting' | 'verifying' | 'success' | 'error';

const FEATURES = [
  'Unlimited Digital QR Table Codes',
  'Real-time Order Management',
  'Paid Customer Requests & Tips',
];

export default function ActivateQRScreen({ navigation, route }: Props) {
  const { slug, name } = route.params;
  const { isDark } = useAppContext();
  const [step, setStep] = useState<Step>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handlePay() {
    setErrorMsg(null);
    setStep('initializing');

    let initRes: { authorizationUrl: string; reference: string };
    try {
      initRes = await initializePayment('STOREFRONT_CREATION', slug);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not initialize payment.';
      setErrorMsg(msg);
      setStep('error');
      return;
    }

    setStep('waiting');

    try {
      const result = await WebBrowser.openAuthSessionAsync(
        initRes.authorizationUrl,
        'scancode://payment-complete',
      );

      if (result.type === 'cancel' || result.type === 'dismiss') {
        setStep('waiting');
        Alert.alert(
          'Payment Pending',
          'Did you complete the payment in the browser?',
          [
            { text: 'No, cancel', style: 'cancel', onPress: () => setStep('idle') },
            { text: 'Yes, verify', onPress: () => handleVerify(initRes.reference) },
          ],
        );
        return;
      }

      await handleVerify(initRes.reference);
    } catch {
      handleVerify(initRes.reference);
    }
  }

  async function handleDevSkip() {
    setErrorMsg(null);
    setStep('verifying');
    try {
      await devSkipPayment();
      setStep('success');
    } catch (err: unknown) {
      // Expected on any server where the dev flag isn't explicitly enabled — 403 "not
      // enabled". Not a real error state, just means this build's backend has it off.
      const msg = err instanceof Error ? err.message : 'Dev skip is not enabled on this server.';
      setErrorMsg(msg);
      setStep('error');
    }
  }

  async function handleVerify(reference: string) {
    setStep('verifying');
    setErrorMsg(null);
    try {
      const res = await verifyPayment(reference, true);
      if (res.verified) {
        setStep('success');
      } else {
        setErrorMsg('Payment verification incomplete. If you paid, try verifying again.');
        setStep('error');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Verification error.';
      setErrorMsg(msg);
      setStep('error');
    }
  }

  return (
    <ScrollView className="flex-1 bg-gray-100 dark:bg-[#09090B]" contentContainerClassName="flex-grow">
      <View className="flex-1 p-5 justify-center">
        <View className="bg-white dark:bg-[#18181B] rounded-2xl p-6 shadow-sm border border-transparent dark:border-zinc-800">
          <Text className="text-[11px] font-extrabold text-primary tracking-wide mb-1">QR ACTIVATION</Text>
          <Text className="text-[22px] font-extrabold text-gray-900 dark:text-white mb-4">{name}</Text>

          <View className="bg-emerald-50 dark:bg-emerald-950/40 rounded-xl p-4 items-center mb-4">
            <Text className="text-[13px] text-gray-500 dark:text-zinc-400 mb-0.5">One-time Activation Fee</Text>
            <Text className="text-[28px] font-extrabold text-primary">{formatMoney(5000)}</Text>
          </View>

          <View className="gap-2 mb-5">
            {FEATURES.map((feature) => (
              <View key={feature} className="flex-row items-center gap-2">
                <CheckCircle2 size={16} color={isDark ? '#34D399' : '#374151'} strokeWidth={2.2} />
                <Text className="text-sm text-gray-700 dark:text-zinc-300 font-medium">{feature}</Text>
              </View>
            ))}
          </View>

          {errorMsg ? (
            <View className="bg-red-100 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4">
              <Text className="text-red-600 dark:text-red-400 text-[13px]">{errorMsg}</Text>
            </View>
          ) : null}

          {step === 'success' ? (
            <View className="bg-emerald-100 dark:bg-emerald-950/40 rounded-xl p-4 items-center border border-emerald-200 dark:border-emerald-800">
              <View className="flex-row items-center gap-2 mb-1">
                <PartyPopper size={18} color={isDark ? '#34D399' : '#374151'} strokeWidth={2.2} />
                <Text className="text-lg font-extrabold text-emerald-800 dark:text-emerald-400">QR Code Activated!</Text>
              </View>
              <Text className="text-[13px] text-emerald-700 dark:text-emerald-500 mb-3">Your storefront is now live and published.</Text>
              <TouchableOpacity
                className="bg-primary rounded-xl py-3.5 items-center w-full"
                onPress={() => navigation.navigate('QR', { slug, name })}
              >
                <Text className="text-white text-base font-bold">View QR Code</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              className={cn(
                'bg-primary rounded-xl py-3.5 items-center',
                (step === 'initializing' || step === 'verifying') && 'opacity-60'
              )}
              onPress={handlePay}
              disabled={step === 'initializing' || step === 'verifying'}
            >
              {step === 'initializing' || step === 'verifying' ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text className="text-white text-base font-bold">
                  {step === 'waiting' ? 'Verify Payment' : `Pay ${formatMoney(5000)} with Paystack`}
                </Text>
              )}
            </TouchableOpacity>
          )}

          {/* TEMPORARY — TestFlight testing only. Only works if the backend explicitly has
              app.dev-skip-payment-enabled turned on (default off); otherwise this just shows
              a "not enabled" error. Remove before the build submitted for App Store review. */}
          {step !== 'success' && (
            <TouchableOpacity
              className={cn(
                'border border-dashed border-gray-300 dark:border-zinc-700 rounded-xl py-2.5 items-center mt-2.5',
                (step === 'initializing' || step === 'verifying') && 'opacity-60'
              )}
              onPress={handleDevSkip}
              disabled={step === 'initializing' || step === 'verifying'}
            >
              <Text className="text-gray-500 dark:text-zinc-500 text-xs font-semibold">Dev Skip (Test Only)</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </ScrollView>
  );
}
