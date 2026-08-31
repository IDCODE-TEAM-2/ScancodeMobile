import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import { ArrowLeft, Flashlight, FlashlightOff, Zap } from 'lucide-react-native';
import type { NavigationProp, RouteProps } from '../../types';
import ErrorBanner from '../../components/ErrorBanner';
import { cn } from '../../utils/cn';

let CameraView: any = null;
let useCameraPermissions: any = null;
try {
  const expoCam = require('expo-camera');
  CameraView = expoCam.CameraView;
  useCameraPermissions = expoCam.useCameraPermissions;
} catch {
  // Fallback if expo-camera is unavailable
}

interface Props {
  navigation: NavigationProp<'CameraQRScanner'>;
  route: RouteProps<'CameraQRScanner'>;
}

export default function CameraQRScannerScreen({ navigation }: Props) {
  const cameraHook = useCameraPermissions ? useCameraPermissions() : [null, () => {}];
  const permission = cameraHook[0];
  const requestPermission = cameraHook[1];

  const [scanned, setScanned] = useState(false);
  const [torch, setTorch] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (useCameraPermissions && !permission) {
      requestPermission();
    }
  }, [permission]);

  function processQrData(data: string) {
    if (scanned) return;
    setScanned(true);

    try {
      let slug = '';
      let tableCode = '';

      if (data.includes('http') || data.includes('/store/')) {
        const urlParts = data.split('/store/');
        if (urlParts.length > 1) {
          const pathAndQuery = urlParts[1].split('?');
          slug = pathAndQuery[0].replace(/\/$/, '');
          const query = pathAndQuery[1];
          if (query && query.includes('table=')) {
            tableCode = new URLSearchParams(query).get('table') || '';
          }
        }
      } else if (data.includes(':')) {
        const parts = data.split(':');
        slug = parts[0].trim();
        tableCode = parts[1].trim();
      } else {
        slug = data.trim();
      }

      if (!slug) {
        throw new Error('Invalid QR code format. Could not detect a valid storefront.');
      }

      Alert.alert(
        'QR Code Scanned!',
        `Store: ${slug}${tableCode ? ` | Table: ${tableCode}` : ''}`,
        [
          {
            text: 'Open Menu',
            onPress: () => {
              navigation.navigate('Storefront', { slug, tableCode });
            },
          },
          {
            text: 'Scan Again',
            style: 'cancel',
            onPress: () => setScanned(false),
          },
        ]
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unrecognized QR code.';
      setError(msg);
      setTimeout(() => setScanned(false), 2500);
    }
  }

  function handleManualSubmit() {
    if (!manualCode.trim()) {
      setError('Please enter a store code or slug.');
      return;
    }
    const cleanCode = manualCode.trim();
    navigation.navigate('Storefront', { slug: cleanCode });
  }

  function handleTestMockScan() {
    processQrData('https://scancode.app/store/sample-bistro?table=Table08');
  }

  const renderCameraViewfinder = () => {
    if (CameraView && permission?.granted) {
      return (
        <CameraView
          style={StyleSheet.absoluteFill}
          enableTorch={torch}
          onBarcodeScanned={scanned ? undefined : ({ data }: { data: string }) => processQrData(data)}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        >
          <View className="flex-1 bg-black/45 items-center justify-center">
            <View className="w-60 h-60 relative justify-between">
              <View className="absolute w-8 h-8 border-primary top-0 left-0 border-t-4 border-l-4" />
              <View className="absolute w-8 h-8 border-primary top-0 right-0 border-t-4 border-r-4" />
              <View className="absolute w-8 h-8 border-primary bottom-0 left-0 border-b-4 border-l-4" />
              <View className="absolute w-8 h-8 border-primary bottom-0 right-0 border-b-4 border-r-4" />
            </View>
            <Text className="text-white text-sm font-semibold mt-5 bg-black/60 px-4 py-2 rounded-full overflow-hidden">
              Align physical table QR code inside the frame
            </Text>
          </View>
        </CameraView>
      );
    }

    return (
      <View className="absolute inset-0 bg-indigo-950 items-center justify-center">
        <View className="w-60 h-60 relative justify-between">
          <View className="absolute w-8 h-8 border-primary top-0 left-0 border-t-4 border-l-4" />
          <View className="absolute w-8 h-8 border-primary top-0 right-0 border-t-4 border-r-4" />
          <View className="absolute w-8 h-8 border-primary bottom-0 left-0 border-b-4 border-l-4" />
          <View className="absolute w-8 h-8 border-primary bottom-0 right-0 border-b-4 border-r-4" />
        </View>
        <Text className="text-white text-sm font-semibold mt-5 bg-black/60 px-4 py-2 rounded-full overflow-hidden">
          {permission && !permission.granted
            ? 'Camera permission denied'
            : 'Camera Viewfinder Active (Simulator Mode)'}
        </Text>
        <TouchableOpacity
          className="mt-[18px] bg-primary px-4.5 py-2.5 rounded-full flex-row items-center gap-1.5"
          onPress={handleTestMockScan}
        >
          <Zap size={14} color="#FFFFFF" strokeWidth={2.2} />
          <Text className="text-white font-bold text-[13px]">Simulate QR Scan (Sample Bistro)</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-black">
      <View className="flex-[2] relative">
        {renderCameraViewfinder()}

        <TouchableOpacity
          className="absolute left-4 w-10 h-10 rounded-full bg-black/55 items-center justify-center"
          style={{ top: 16 }}
          onPress={() => navigation.goBack()}
          accessibilityLabel="Go back"
          activeOpacity={0.8}
        >
          <ArrowLeft size={20} color="#FFFFFF" strokeWidth={2.4} />
        </TouchableOpacity>
      </View>

      <View className="bg-white rounded-t-3xl p-5">
        {error ? <ErrorBanner message={error} onDismiss={() => setError(null)} /> : null}

        <View className="flex-row items-center justify-between mb-4 gap-3">
          <TouchableOpacity
            className={cn('rounded-[10px] py-2.5 px-4 flex-row items-center gap-2', torch ? 'bg-amber-100' : 'bg-gray-100')}
            onPress={() => setTorch(!torch)}
          >
            {torch ? (
              <Flashlight size={16} color="#92400E" strokeWidth={2.2} />
            ) : (
              <FlashlightOff size={16} color="#374151" strokeWidth={2.2} />
            )}
            <Text className={cn('font-semibold text-sm', torch ? 'text-amber-800' : 'text-gray-700')}>
              {torch ? 'Flash On' : 'Flash Off'}
            </Text>
          </TouchableOpacity>

          {scanned && (
            <TouchableOpacity className="bg-primary rounded-[10px] py-2.5 px-4" onPress={() => setScanned(false)}>
              <Text className="text-white font-bold text-sm">Tap to Scan Again</Text>
            </TouchableOpacity>
          )}

          {permission && !permission.granted && (
            <TouchableOpacity className="bg-red-500 rounded-[10px] py-2.5 px-3.5" onPress={requestPermission}>
              <Text className="text-white font-bold text-[13px]">Grant Camera</Text>
            </TouchableOpacity>
          )}
        </View>

        <View className="bg-gray-50 rounded-xl p-3.5 border border-gray-200">
          <Text className="text-[13px] font-semibold text-gray-600 mb-2">Or Enter Store Code Manually</Text>
          <View className="flex-row gap-2">
            <TextInput
              className="flex-1 bg-white border-[1.5px] border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900"
              value={manualCode}
              onChangeText={setManualCode}
              placeholder="e.g. sample-bistro"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="none"
            />
            <TouchableOpacity className="bg-primary rounded-lg px-4.5 justify-center items-center" onPress={handleManualSubmit}>
              <Text className="text-white font-bold text-sm">Go</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}
