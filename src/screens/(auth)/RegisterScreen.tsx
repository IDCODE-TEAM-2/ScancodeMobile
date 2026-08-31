import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Briefcase, ShoppingCart, Check } from 'lucide-react-native';
import { register, type AccountRole } from '../../api';
import type { NavigationProp } from '../../types';
import CustomInput from '../../components/CustomInput';
import CustomButton from '../../components/CustomButton';
import { cn } from '../../utils/cn';

interface Props {
  navigation: NavigationProp<'Register'>;
}

const ROLE_OPTIONS: { role: AccountRole; label: string; icon: typeof Briefcase }[] = [
  { role: 'vendor', label: 'Vendor', icon: Briefcase },
  { role: 'customer', label: 'Customer', icon: ShoppingCart },
];

export default function RegisterScreen({ navigation }: Props) {
  const [role, setRole] = useState<AccountRole>('vendor');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);

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
      // Server sends an OTP to the email — navigate to the verify screen
      navigation.navigate('VerifyOtp', { email: email.trim().toLowerCase() });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
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
          <Text className="text-base text-gray-500 text-center mb-8">Create your account</Text>

          <View className="flex-row gap-2.5 mb-6">
            {ROLE_OPTIONS.map((option) => {
              const isActive = role === option.role;
              const Icon = option.icon;
              return (
                <TouchableOpacity
                  key={option.role}
                  className={cn(
                    'flex-1 flex-row items-center justify-center gap-2 rounded-xl border-[1.5px] py-3.5',
                    isActive ? 'bg-primary/10 border-primary' : 'bg-white border-gray-300'
                  )}
                  onPress={() => setRole(option.role)}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  <Icon size={16} color={isActive ? '#111827' : '#6B7280'} strokeWidth={2.2} />
                  <Text className={cn('text-sm font-bold', isActive ? 'text-primary' : 'text-gray-500')}>
                    Register as {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {error && (
            <View className="bg-red-100 rounded-lg p-3 mb-4">
              <Text className="text-red-600 text-sm">{error}</Text>
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

            <TouchableOpacity
              className="flex-row items-start gap-2.5 mt-1 mb-1"
              onPress={() => setAgreed((prev) => !prev)}
              disabled={loading}
              activeOpacity={0.7}
            >
              <View
                className={cn(
                  'w-5 h-5 rounded-md border-[1.5px] items-center justify-center mt-0.5',
                  agreed ? 'bg-primary border-primary' : 'bg-white border-gray-300'
                )}
              >
                {agreed && <Check size={13} color="#FFFFFF" strokeWidth={3} />}
              </View>
              <Text className="flex-1 text-[13px] text-gray-600 leading-5">
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

            <CustomButton title="Create Account" onPress={handleRegister} loading={loading} disabled={!agreed} />
          </View>

          <TouchableOpacity
            className="flex-row justify-center mt-6"
            onPress={() => navigation.navigate('Login')}
            disabled={loading}
          >
            <Text className="text-sm text-gray-500">Already have an account?</Text>
            <Text className="text-sm text-primary font-semibold"> Sign in</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
