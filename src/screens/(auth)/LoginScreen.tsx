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
import { QrCode, Compass } from 'lucide-react-native';
import { login, saveToken } from '../../api';
import type { NavigationProp } from '../../types';
import { useAppContext } from '../../context/AppContext';
import CustomInput from '../../components/CustomInput';
import CustomButton from '../../components/CustomButton';

interface Props {
  navigation: NavigationProp<'Login'>;
}

export default function LoginScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { setAppState, clearSession } = useAppContext();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function performLogin(loginEmail: string, loginPassword: string) {
    setError(null);
    setLoading(true);
    try {
      const res = await login(loginEmail.trim(), loginPassword);
      await saveToken(res.token);
      const isMerchant = Array.isArray(res.roles) && res.roles.includes('ROLE_MERCHANT');
      setAppState(isMerchant ? 'admin' : 'customer');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed. Try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleLogin() {
    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password.');
      return;
    }
    performLogin(email, password);
  }

  async function handleBrowseAsGuest() {
    setLoading(true);
    try {
      await clearSession('customer');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-gray-50 dark:bg-[#09090B]"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ paddingTop: Math.max(insets.top, 16) }}
    >
      <ScrollView
        contentContainerClassName="flex-grow justify-center px-6 py-8"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="w-full max-w-md self-center">
          {/* Brand Header */}
          <View className="items-center mb-6">
            <Text className="text-[32px] font-black text-gray-900 dark:text-white tracking-tight text-center">ScanCode</Text>
            <Text className="text-sm text-gray-500 dark:text-zinc-400 text-center mt-1">Smart digital storefronts & tableside ordering</Text>
          </View>

          {/* Guest Quick Actions */}
          <View className="flex-row gap-3 mb-6">
            <TouchableOpacity
              className="flex-1 bg-white dark:bg-[#18181B] border-[1.5px] border-emerald-600/30 dark:border-emerald-700/50 rounded-2xl py-3.5 px-3 items-center flex-row justify-center gap-2 shadow-sm"
              onPress={() => navigation.navigate('CameraQRScanner')}
              disabled={loading}
              activeOpacity={0.8}
            >
              <QrCode size={18} color="#059669" strokeWidth={2.2} />
              <Text className="text-emerald-700 dark:text-emerald-300 text-sm font-bold">Scan Table QR</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-1 bg-white dark:bg-[#18181B] border-[1.5px] border-gray-200 dark:border-zinc-800 rounded-2xl py-3.5 px-3 items-center flex-row justify-center gap-2 shadow-sm"
              onPress={handleBrowseAsGuest}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Compass size={18} color="#059669" strokeWidth={2.2} />
              <Text className="text-gray-800 dark:text-zinc-200 text-sm font-bold">Browse as Guest</Text>
            </TouchableOpacity>
          </View>

          {/* Form Card */}
          <View className="bg-white dark:bg-[#18181B] rounded-3xl p-6 border border-gray-200 dark:border-zinc-800 shadow-sm">
            <Text className="text-lg font-extrabold text-gray-900 dark:text-white mb-1">Merchant Sign In</Text>
            <Text className="text-xs text-gray-400 dark:text-zinc-500 mb-5">Access your live orders, menu catalog, and analytics</Text>

            {error && (
              <View className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl p-3 mb-4">
                <Text className="text-red-600 dark:text-red-400 text-xs font-semibold text-center">{error}</Text>
              </View>
            )}

            <View accessibilityRole={"form" as any} className="gap-1">
              <CustomInput
                label="Email Address"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                placeholder="you@business.com"
                editable={!loading}
              />

              <CustomInput
                label="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="current-password"
                textContentType="password"
                placeholder="••••••••"
                editable={!loading}
              />

              <TouchableOpacity
                className="self-end mb-4 -mt-1 py-1"
                onPress={() => navigation.navigate('ForgotPassword')}
                disabled={loading}
              >
                <Text className="text-xs text-primary font-bold">Forgot Password?</Text>
              </TouchableOpacity>

              <CustomButton
                title="Sign In"
                onPress={handleLogin}
                loading={loading}
                className="w-full shadow-sm"
              />
            </View>
          </View>

          {/* Footer Sign Up Link */}
          <TouchableOpacity
            className="flex-row justify-center items-center py-4 mt-2"
            onPress={() => navigation.navigate('Register')}
            disabled={loading}
          >
            <Text className="text-sm text-gray-500 dark:text-zinc-400">Don't have an account?</Text>
            <Text className="text-sm text-primary font-bold"> Create one</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

