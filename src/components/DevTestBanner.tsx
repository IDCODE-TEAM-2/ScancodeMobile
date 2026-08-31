// =========================================================================
// DEV TEST & DEMO CONTROL PANEL
// TO REMOVE AFTER TESTING: Simply delete this file or remove <DevTestBanner /> from DashboardScreen.tsx
// =========================================================================

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Briefcase, ShoppingCart, Lock, Camera, Bell, Store, RotateCcw } from 'lucide-react-native';
import type { RootStackParamList } from '../types';
import { demoEngine } from '../demo/demoEngine';
import { cn } from '../utils/cn';

interface Props {
  onRoleChange?: (role: 'admin' | 'customer' | 'logged_out') => void;
}

export default function DevTestBanner({ onRoleChange }: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [isDemo, setIsDemo] = useState(demoEngine.isDemoModeEnabled());
  const [activeRole, setActiveRole] = useState<'admin' | 'customer' | 'logged_out'>(
    demoEngine.getActiveRole(),
  );

  useEffect(() => {
    setIsDemo(demoEngine.isDemoModeEnabled());
    setActiveRole(demoEngine.getActiveRole());
  }, []);

  async function toggleDemoMode() {
    const next = !isDemo;
    setIsDemo(next);
    await demoEngine.setDemoModeEnabled(next);
    Alert.alert(
      'Demo Mode Toggled',
      next
        ? 'Demo Mode is now ACTIVE. Requests will return local mock data.'
        : 'Demo Mode is now OFF. Requests will hit the live API server (http://192.168.1.155:8082).',
    );
  }

  async function switchRole(role: 'admin' | 'customer' | 'logged_out') {
    setActiveRole(role);
    await demoEngine.setActiveRole(role);
    if (onRoleChange) {
      onRoleChange(role);
    }
  }

  async function handleResetData() {
    await demoEngine.resetDemoState();
    Alert.alert('Reset Complete', 'Demo data has been restored to default values.');
  }

  const ROLE_OPTIONS: { role: 'admin' | 'customer' | 'logged_out'; label: string; icon: typeof Briefcase }[] = [
    { role: 'admin', label: 'Admin', icon: Briefcase },
    { role: 'customer', label: 'Customer', icon: ShoppingCart },
    { role: 'logged_out', label: 'Logged Out', icon: Lock },
  ];

  return (
    <View className="bg-indigo-950 rounded-xl p-3.5 mx-4 my-2.5 border border-indigo-700">
      <View className="flex-row items-center justify-between mb-2.5">
        <Text className="bg-red-500 text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded">DEMO CONTROL PANEL</Text>
        <TouchableOpacity className="bg-indigo-900 px-2 py-1 rounded-md" onPress={toggleDemoMode}>
          <Text className="text-indigo-100 text-[11px] font-semibold">
            Mode: <Text className={cn('font-black', isDemo ? 'text-emerald-400' : 'text-red-400')}>{isDemo ? 'DEMO (MOCK)' : 'LIVE API'}</Text>
          </Text>
        </TouchableOpacity>
      </View>

      <Text className="text-indigo-300 text-[11px] font-bold mt-1 mb-1.5 uppercase">Active Role Switcher:</Text>
      <View className="flex-row gap-1.5 mb-2.5">
        {ROLE_OPTIONS.map(({ role, label, icon: Icon }) => {
          const isActive = activeRole === role;
          return (
            <TouchableOpacity
              key={role}
              className={cn('flex-1 py-1.5 rounded-md items-center flex-row justify-center gap-1', isActive ? 'bg-primary' : 'bg-indigo-900')}
              onPress={() => switchRole(role)}
            >
              <Icon size={12} color={isActive ? '#FFFFFF' : '#C7D2FE'} strokeWidth={2.2} />
              <Text className={cn('text-[11px]', isActive ? 'text-white font-extrabold' : 'text-indigo-200 font-semibold')}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text className="text-indigo-300 text-[11px] font-bold mt-1 mb-1.5 uppercase">Quick Test Actions:</Text>
      <View className="flex-row gap-1.5">
        <TouchableOpacity
          className="flex-1 py-2 rounded-md items-center bg-indigo-600 gap-1"
          onPress={() => navigation.navigate('CameraQRScanner')}
          activeOpacity={0.8}
        >
          <Camera size={13} color="#FFFFFF" strokeWidth={2.2} />
          <Text className="text-white text-[11px] font-bold">Scanner</Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="flex-1 py-2 rounded-md items-center bg-emerald-600 gap-1"
          onPress={() => navigation.navigate('LiveOrdersManager', { storefrontId: 1, name: 'Lagos Grill' })}
          activeOpacity={0.8}
        >
          <Bell size={13} color="#FFFFFF" strokeWidth={2.2} />
          <Text className="text-white text-[11px] font-bold">Live Orders</Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="flex-1 py-2 rounded-md items-center bg-amber-600 gap-1"
          onPress={() => navigation.navigate('Storefront', { slug: 'lagos-grill', name: 'Lagos Grill' })}
          activeOpacity={0.8}
        >
          <Store size={13} color="#FFFFFF" strokeWidth={2.2} />
          <Text className="text-white text-[11px] font-bold">Storefront</Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="flex-1 py-2 rounded-md items-center bg-red-600 gap-1"
          onPress={handleResetData}
          activeOpacity={0.8}
        >
          <RotateCcw size={13} color="#FFFFFF" strokeWidth={2.2} />
          <Text className="text-white text-[11px] font-bold">Reset</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
