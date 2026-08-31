import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { QrCode, FlaskConical, Briefcase, ShoppingCart } from 'lucide-react-native';
import { login, saveToken } from '../../api';
import { demoEngine } from '../../demo/demoEngine';
import { DEMO_ACCOUNTS } from '../../demo/mockData';
import type { NavigationProp } from '../../types';
import { useAppContext } from '../../context/AppContext';
import CustomInput from '../../components/CustomInput';
import CustomButton from '../../components/CustomButton';

interface Props {
  navigation: NavigationProp<'Login'>;
}

export default function LoginScreen({ navigation }: Props) {
  const { setAppState } = useAppContext();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isDemoMode = demoEngine.isDemoModeEnabled();

  async function performLogin(loginEmail: string, loginPassword: string) {
    setError(null);
    setLoading(true);
    try {
      const res = await login(loginEmail.trim(), loginPassword);
      await saveToken(res.token);
      // Only a merchant account routes to the admin dashboard — everyone else (including
      // demo "customer" logins) lands in the customer experience. Anonymous customers can
      // still reach the storefront without an account via "Scan a Table QR Code".
      setAppState(res.roles.includes('ROLE_MERCHANT') ? 'admin' : 'customer');
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

  function handleQuickDemoLogin(role: 'admin' | 'customer') {
    performLogin(DEMO_ACCOUNTS[role].email, 'demo');
  }

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerClassName="flex-grow" keyboardShouldPersistTaps="handled">
        <View className="flex-1 bg-white px-6 justify-center">
          <Text className="text-[34px] font-extrabold text-primary text-center mb-1.5">ScanCode</Text>
          <Text className="text-base text-gray-500 text-center mb-6">Sign in to your account</Text>

          <TouchableOpacity
            className="border-[1.5px] border-primary rounded-[10px] py-3.5 items-center flex-row justify-center gap-2"
            onPress={() => navigation.navigate('CameraQRScanner')}
            disabled={loading}
            activeOpacity={0.85}
          >
            <QrCode size={18} color="#6C63FF" strokeWidth={2.2} />
            <Text className="text-primary text-base font-bold">Scan a Table QR Code</Text>
          </TouchableOpacity>
          <Text className="text-xs text-gray-400 text-center mt-2">Just visiting? No account needed.</Text>

          <View className="flex-row items-center gap-2.5 my-6">
            <View className="flex-1 h-px bg-gray-200" />
            <Text className="text-xs text-gray-400 font-semibold">Merchant Sign In</Text>
            <View className="flex-1 h-px bg-gray-200" />
          </View>

          {error && (
            <View className="bg-red-100 rounded-lg p-3 mb-4">
              <Text className="text-red-600 text-sm">{error}</Text>
            </View>
          )}

          <View accessibilityRole={"form" as any} className="gap-2">
            <CustomInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              placeholder="you@example.com"
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
              className="self-end mb-4 -mt-1"
              onPress={() => navigation.navigate('ForgotPassword')}
              disabled={loading}
            >
              <Text className="text-[13px] text-primary font-semibold">Forgot Password?</Text>
            </TouchableOpacity>

            <CustomButton title="Sign In" onPress={handleLogin} loading={loading} />
          </View>

          {isDemoMode && (
            <View className="bg-violet-50 border border-violet-200 rounded-xl p-3.5 mt-5">
              <View className="flex-row items-center justify-center gap-1.5 mb-2.5">
                <FlaskConical size={13} color="#5B21B6" strokeWidth={2.2} />
                <Text className="text-xs font-bold text-violet-800">Demo Mode — Quick Login</Text>
              </View>
              <View className="flex-row gap-2">
                <TouchableOpacity
                  className="flex-1 bg-white border border-violet-300 rounded-lg py-2.5 items-center flex-row justify-center gap-1.5"
                  onPress={() => handleQuickDemoLogin('admin')}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  <Briefcase size={14} color="#5B21B6" strokeWidth={2.2} />
                  <Text className="text-[13px] font-bold text-violet-800">Admin</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="flex-1 bg-white border border-violet-300 rounded-lg py-2.5 items-center flex-row justify-center gap-1.5"
                  onPress={() => handleQuickDemoLogin('customer')}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  <ShoppingCart size={14} color="#5B21B6" strokeWidth={2.2} />
                  <Text className="text-[13px] font-bold text-violet-800">Customer</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <TouchableOpacity
            className="flex-row justify-center mt-6"
            onPress={() => navigation.navigate('Register')}
            disabled={loading}
          >
            <Text className="text-sm text-gray-500">Don't have an account?</Text>
            <Text className="text-sm text-primary font-semibold"> Sign up</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
