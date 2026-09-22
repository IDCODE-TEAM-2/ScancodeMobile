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
import { Briefcase, ShoppingCart, Check } from 'lucide-react-native';
import { register, type AccountRole } from '../../api';
import { setIntendedMerchant } from '../../utils/resolveAppState';
import type { NavigationProp } from '../../types';
import CustomInput from '../../components/CustomInput';
import CustomButton from '../../components/CustomButton';
import { useAppContext } from '../../context/AppContext';
import { cn } from '../../utils/cn';

interface Props {
  navigation: NavigationProp<'Register'>;
}

const ROLE_OPTIONS: { role: AccountRole; label: string; icon: typeof Briefcase }[] = [
  { role: 'merchant', label: 'Merchant', icon: Briefcase },
  { role: 'customer', label: 'Customer', icon: ShoppingCart },
];

function getPasswordStrength(pwd: string): { score: number; label: string; color: string } {
  if (!pwd) return { score: 0, label: '', color: '' };
  let score = 0;
  if (pwd.length >= 8) score += 1;
  if (/[A-Z]/.test(pwd)) score += 1;
  if (/[0-9]/.test(pwd)) score += 1;
  if (/[^A-Za-z0-9]/.test(pwd)) score += 1;

  if (score <= 1) return { score: 1, label: 'Weak', color: '#EF4444' };
  if (score === 2) return { score: 2, label: 'Fair', color: '#F59E0B' };
  if (score === 3) return { score: 3, label: 'Good', color: '#3B82F6' };
  return { score: 4, label: 'Strong', color: '#10B981' };
}

export default function RegisterScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { isDark } = useAppContext();
  const [role, setRole] = useState<AccountRole>('merchant');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);

  const passwordStrength = getPasswordStrength(password);

  async function handleRegister() {
    if (!username.trim() || !email.trim() || !password.trim()) {
      setError('All fields are required.');
      return;
    }
    if (!agreed) {
      setError('Please agree to the Terms of Service and Privacy Policy to continue.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await register(username.trim(), email.trim(), password, role);
      // Remember what the user chose during signup so verify-OTP knows where to land
      // even before they've created their first storefront.
      await setIntendedMerchant(role === 'merchant');
      navigation.navigate('VerifyOtp', { email: email.trim() });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
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
      <ScrollView contentContainerClassName="flex-grow justify-center px-6 py-12" keyboardShouldPersistTaps="handled">
        <View className="w-full max-w-md self-center">
          <Text className="text-[34px] font-extrabold text-primary text-center mb-1.5">ScanCode</Text>
          <Text className="text-base text-gray-500 dark:text-zinc-400 text-center mb-8">Create your account</Text>

          <View className="flex-row gap-2.5 mb-6">
            {ROLE_OPTIONS.map((option) => {
              const isActive = role === option.role;
              const Icon = option.icon;
              return (
                <TouchableOpacity
                  key={option.role}
                  className={cn(
                    'flex-1 flex-row items-center justify-center gap-2 rounded-xl border-[1.5px] py-3.5',
                    isActive
                      ? 'bg-primary/10 dark:bg-primary/20 border-primary'
                      : 'bg-white dark:bg-[#18181B] border-gray-300 dark:border-zinc-700'
                  )}
                  onPress={() => setRole(option.role)}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  <Icon size={16} color={isActive ? '#059669' : '#6B7280'} strokeWidth={2.2} />
                  <Text
                    className={cn('text-sm font-bold shrink', isActive ? 'text-primary' : 'text-gray-500 dark:text-zinc-400')}
                    numberOfLines={1}
                  >
                    Register as {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {error && (
            <View className="bg-red-100 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4">
              <Text className="text-red-600 dark:text-red-400 text-sm text-center">{error}</Text>
            </View>
          )}

          <View className="gap-2">
            <CustomInput
              label="Username"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoComplete="username"
              placeholder="johndoe"
              editable={!loading}
            />

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
              placeholder="••••••••"
              editable={!loading}
            />

            {password.length > 0 && (
              <View className="mt-1 mb-2 px-1">
                <View className="flex-row gap-1.5 h-1.5 mb-1.5">
                  {[1, 2, 3, 4].map((step) => (
                    <View
                      key={step}
                      className="flex-1 rounded-full"
                      style={{
                        backgroundColor:
                          step <= passwordStrength.score
                            ? passwordStrength.color
                            : isDark
                            ? '#27272A'
                            : '#E5E7EB',
                      }}
                    />
                  ))}
                </View>
                <Text className="text-[11px] font-semibold" style={{ color: passwordStrength.color }}>
                  Password strength: {passwordStrength.label}
                </Text>
              </View>
            )}

            <TouchableOpacity
              className="flex-row items-start gap-2.5 mt-1 mb-1"
              onPress={() => setAgreed((prev) => !prev)}
              disabled={loading}
              activeOpacity={0.7}
            >
              <View
                className={cn(
                  'w-5 h-5 rounded-md border-[1.5px] items-center justify-center mt-0.5',
                  agreed
                    ? 'bg-primary border-primary'
                    : 'bg-white dark:bg-[#18181B] border-gray-300 dark:border-zinc-700'
                )}
              >
                {agreed && <Check size={13} color="#FFFFFF" strokeWidth={3} />}
              </View>
              <Text className="flex-1 text-[13px] text-gray-600 dark:text-zinc-400 leading-5">
                I agree to the{' '}
                <Text className="text-primary font-semibold" onPress={() => navigation.navigate('TermsOfService')}>
                  Terms of Service
                </Text>{' '}
                and{' '}
                <Text className="text-primary font-semibold" onPress={() => navigation.navigate('PrivacyPolicy')}>
                  Privacy Policy
                </Text>
              </Text>
            </TouchableOpacity>

            <CustomButton title="Create Account" onPress={handleRegister} loading={loading} />
          </View>

          <TouchableOpacity
            className="flex-row justify-center mt-6"
            onPress={() => navigation.navigate('Login')}
            disabled={loading}
          >
            <Text className="text-sm text-gray-500 dark:text-zinc-400">Already have an account?</Text>
            <Text className="text-sm text-primary font-semibold"> Sign in</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
