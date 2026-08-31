import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { CheckCircle2, PartyPopper } from 'lucide-react-native';
import * as WebBrowser from 'expo-web-browser';
import { initializePayment, verifyPayment } from '../../api';
import type { NavigationProp, RouteProps } from '../../types';
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

  async function handleVerify(reference: string) {
    setStep('verifying');
    setErrorMsg(null);
    try {
      const res = await verifyPayment(reference);
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
    <ScrollView contentContainerClassName="flex-grow">
      <View className="flex-1 bg-gray-100 p-5 justify-center">
        <View className="bg-white rounded-2xl p-6 shadow-sm">
          <Text className="text-[11px] font-extrabold text-primary tracking-wide mb-1">QR ACTIVATION</Text>
          <Text className="text-[22px] font-extrabold text-gray-900 mb-4">{name}</Text>

          <View className="bg-emerald-50 rounded-xl p-4 items-center mb-4">
            <Text className="text-[13px] text-gray-500 mb-0.5">One-time Activation Fee</Text>
            <Text className="text-[28px] font-extrabold text-primary">₦15,000</Text>
          </View>

          <View className="gap-2 mb-5">
            {FEATURES.map((feature) => (
              <View key={feature} className="flex-row items-center gap-2">
                <CheckCircle2 size={16} color="#374151" strokeWidth={2.2} />
                <Text className="text-sm text-gray-700 font-medium">{feature}</Text>
              </View>
            ))}
          </View>

          {errorMsg ? (
            <View className="bg-red-100 rounded-lg p-3 mb-4">
              <Text className="text-red-600 text-[13px]">{errorMsg}</Text>
            </View>
          ) : null}

          {step === 'success' ? (
            <View className="bg-emerald-100 rounded-xl p-4 items-center">
              <View className="flex-row items-center gap-2 mb-1">
                <PartyPopper size={18} color="#374151" strokeWidth={2.2} />
                <Text className="text-lg font-extrabold text-emerald-800">QR Code Activated!</Text>
              </View>
              <Text className="text-[13px] text-emerald-700 mb-3">Your storefront is now live and published.</Text>
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
                  {step === 'waiting' ? 'Verify Payment' : 'Pay ₦15,000 with Paystack'}
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    </ScrollView>
  );
}
