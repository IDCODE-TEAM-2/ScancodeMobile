import './global.css';
import { Sentry } from './src/utils/crashReporting';
import React, { useState, useEffect, useMemo } from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator, type NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { View, Text, ActivityIndicator } from 'react-native';
import type { RootStackParamList } from './src/types';
import { demoEngine } from './src/demo/demoEngine';
import { getToken, deleteToken, onUnauthorized } from './src/api';
import { registerForPushNotificationsAsync } from './src/utils/pushNotifications';
import { initOfflineQueue } from './src/utils/offlineQueue';
import { AppContextProvider, useAppContext, type AppState } from './src/context/AppContext';
import { CartProvider } from './src/context/CartContext';
import HeaderBackButton from './src/components/HeaderBackButton';

// Auth Stack Screens
import SplashScreen from './src/screens/(auth)/SplashScreen';
import LoginScreen from './src/screens/(auth)/LoginScreen';
import ForgotPasswordScreen from './src/screens/(auth)/ForgotPasswordScreen';
import RegisterScreen from './src/screens/(auth)/RegisterScreen';
import VerifyOtpScreen from './src/screens/(auth)/VerifyOtpScreen';
import TermsOfServiceScreen from './src/screens/(auth)/TermsOfServiceScreen';
import PrivacyPolicyScreen from './src/screens/(auth)/PrivacyPolicyScreen';

// Customer Storefront & Checkout Screens
import StorefrontScreen from './src/screens/(customer)/StorefrontScreen';
import WishlistScreen from './src/screens/(customer)/WishlistScreen';
import CartDrawerScreen from './src/screens/(customer)/CartDrawerScreen';
import CheckoutScreen from './src/screens/(customer)/CheckoutScreen';
import OrderReceiptTrackerScreen from './src/screens/(customer)/OrderReceiptTrackerScreen';
import CameraQRScannerScreen from './src/screens/(customer)/CameraQRScannerScreen';

// Merchant / Admin Operational Screens
import DashboardScreen from './src/screens/(admin)/DashboardScreen';
import MerchantProfileBankScreen from './src/screens/(admin)/MerchantProfileBankScreen';
import CreateStorefrontScreen from './src/screens/(admin)/CreateStorefrontScreen';
import ActivateQRScreen from './src/screens/(admin)/ActivateQRScreen';
import QRScreen from './src/screens/(admin)/QRScreen';
import StoreChargesConfigScreen from './src/screens/(admin)/StoreChargesConfigScreen';
import LiveOrdersManagerScreen from './src/screens/(admin)/LiveOrdersManagerScreen';
import ToolbarRequestsAdminScreen from './src/screens/(admin)/ToolbarRequestsAdminScreen';
import EventsManagerScreen from './src/screens/(admin)/EventsManagerScreen';
import ServicesScreen from './src/screens/(admin)/ServicesScreen';
import ProductCatalogEditorScreen from './src/screens/(admin)/ProductCatalogEditorScreen';
import AccessPageManagerScreen from './src/screens/(admin)/AccessPageManagerScreen';
import StorefrontDirectoryScreen from './src/screens/(customer)/StorefrontDirectoryScreen';
import AccessPageGuestScreen from './src/screens/(customer)/AccessPageGuestScreen';
import SettingsScreen from './src/screens/SettingsScreen';

// ==========================================
// 1. NAVIGATOR DEFINITIONS
// ==========================================
const AuthStack = createNativeStackNavigator<RootStackParamList>();
const AdminStack = createNativeStackNavigator<RootStackParamList>();
const CustomerStack = createNativeStackNavigator<RootStackParamList>();

const hiddenHeader: NativeStackNavigationOptions = { headerShown: false };
const checkoutOptions: NativeStackNavigationOptions = { title: 'Checkout', headerBackTitle: 'Back' };
const wishlistOptions: NativeStackNavigationOptions = { title: 'Wishlist', headerBackTitle: 'Back' };
const cartOptions: NativeStackNavigationOptions = { title: 'Your Cart', headerBackTitle: 'Back' };
const orderTrackerOptions: NativeStackNavigationOptions = { title: 'Order Status', headerBackTitle: 'Back' };
const accessPageGuestOptions: NativeStackNavigationOptions = { title: 'Event Check-In', headerBackTitle: 'Back' };
const settingsOptions: NativeStackNavigationOptions = { title: 'Settings', headerBackTitle: 'Back' };

// ==========================================
// 2. SUB-STACK DESIGNATED FLOWS
// ==========================================

function AuthNavigator({ screenOptions }: { screenOptions: NativeStackNavigationOptions }) {
  return (
    <AuthStack.Navigator screenOptions={screenOptions}>
      <AuthStack.Screen name="Login" component={LoginScreen} options={hiddenHeader} />
      <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={hiddenHeader} />
      <AuthStack.Screen name="Register" component={RegisterScreen} options={hiddenHeader} />
      <AuthStack.Screen name="VerifyOtp" component={VerifyOtpScreen} options={hiddenHeader} />
      <AuthStack.Screen name="TermsOfService" component={TermsOfServiceScreen} options={{ title: 'Terms of Service', headerBackTitle: 'Back' }} />
      <AuthStack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} options={{ title: 'Privacy Policy', headerBackTitle: 'Back' }} />
      <AuthStack.Screen name="Splash" component={SplashScreen} options={hiddenHeader} />

      <AuthStack.Screen
        name="CameraQRScanner"
        component={CameraQRScannerScreen}
        options={{ title: 'Scan Table QR Code', headerBackTitle: 'Back' }}
      />
      <AuthStack.Screen
        name="Storefront"
        component={StorefrontScreen}
        options={({ route }) => ({
          title: route.params?.name || 'Storefront',
          headerBackTitle: 'Back',
        })}
      />
      <AuthStack.Screen name="Wishlist" component={WishlistScreen} options={wishlistOptions} />
      <AuthStack.Screen name="CartDrawer" component={CartDrawerScreen} options={cartOptions} />
      <AuthStack.Screen name="Checkout" component={CheckoutScreen} options={checkoutOptions} />
      <AuthStack.Screen name="OrderReceiptTracker" component={OrderReceiptTrackerScreen} options={orderTrackerOptions} />
      <AuthStack.Screen name="AccessPageGuest" component={AccessPageGuestScreen} options={accessPageGuestOptions} />
    </AuthStack.Navigator>
  );
}

function AdminNavigator({ screenOptions }: { screenOptions: NativeStackNavigationOptions }) {
  return (
    <AdminStack.Navigator screenOptions={screenOptions}>
      <AdminStack.Screen name="Dashboard" component={DashboardScreen} options={hiddenHeader} />
      <AdminStack.Screen
        name="MerchantProfileBank"
        component={MerchantProfileBankScreen}
        options={({ route }) => ({
          title: route.params?.name || 'Merchant Profile Bank',
          headerBackTitle: 'Back',
        })}
      />
      <AdminStack.Screen
        name="CreateStorefront"
        component={CreateStorefrontScreen}
        options={({ route }) => ({
          title: route.params?.editStorefrontId !== undefined ? 'Edit Storefront' : 'New Storefront',
          headerBackTitle: 'Back',
        })}
      />
      <AdminStack.Screen
        name="ActivateQR"
        component={ActivateQRScreen}
        options={({ route }) => ({
          title: route.params?.name || 'Activate QR',
          headerBackTitle: 'Back',
        })}
      />
      <AdminStack.Screen
        name="QR"
        component={QRScreen}
        options={({ route }) => ({
          title: `${route.params?.name} - QR`,
          headerBackTitle: 'Back',
        })}
      />
      <AdminStack.Screen
        name="StoreChargesConfig"
        component={StoreChargesConfigScreen}
        options={({ route }) => ({
          title: route.params?.name || 'Configure Store',
          headerBackTitle: 'Back',
        })}
      />
      <AdminStack.Screen
        name="LiveOrdersManager"
        component={LiveOrdersManagerScreen}
        options={({ route }) => ({
          title: route.params?.name ? `${route.params.name} - Live Orders` : 'Live Orders Manager',
          headerBackTitle: 'Back',
        })}
      />
      <AdminStack.Screen
        name="ToolbarRequestsAdmin"
        component={ToolbarRequestsAdminScreen}
        options={({ route }) => ({
          title: route.params?.name ? `${route.params.name} - Activity` : 'Activity Feed',
          headerBackTitle: 'Back',
        })}
      />
      <AdminStack.Screen
        name="EventsManager"
        component={EventsManagerScreen}
        options={({ route }) => ({
          title: route.params?.name ? `${route.params.name} - Events` : 'Weekly Events',
          headerBackTitle: 'Back',
        })}
      />
      <AdminStack.Screen
        name="ProductCatalogEditor"
        component={ProductCatalogEditorScreen}
        options={({ route }) => ({
          title: route.params?.name ? `${route.params.name} - Products` : 'Product Catalog',
          headerBackTitle: 'Back',
        })}
      />
      <AdminStack.Screen name="Services" component={ServicesScreen} options={{ title: 'Services', headerBackTitle: 'Back' }} />
      <AdminStack.Screen
        name="StorefrontDirectory"
        component={StorefrontDirectoryScreen}
        options={hiddenHeader}
      />
      <AdminStack.Screen
        name="AccessPageManager"
        component={AccessPageManagerScreen}
        options={({ route }) => ({
          title: route.params?.name ? `${route.params.name} - Access Pages` : 'Access Pages',
          headerBackTitle: 'Back',
        })}
      />
      <AdminStack.Screen name="AccessPageGuest" component={AccessPageGuestScreen} options={accessPageGuestOptions} />
      <AdminStack.Screen name="Settings" component={SettingsScreen} options={settingsOptions} />
      <AdminStack.Screen name="TermsOfService" component={TermsOfServiceScreen} options={{ title: 'Terms of Service', headerBackTitle: 'Back' }} />
      <AdminStack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} options={{ title: 'Privacy Policy', headerBackTitle: 'Back' }} />

      <AdminStack.Screen
        name="Storefront"
        component={StorefrontScreen}
        options={({ route }) => ({
          title: route.params?.name || 'Storefront',
          headerBackTitle: 'Back',
        })}
      />
      <AdminStack.Screen name="Wishlist" component={WishlistScreen} options={wishlistOptions} />
      <AdminStack.Screen name="CartDrawer" component={CartDrawerScreen} options={cartOptions} />
      <AdminStack.Screen name="Checkout" component={CheckoutScreen} options={checkoutOptions} />
      <AdminStack.Screen name="OrderReceiptTracker" component={OrderReceiptTrackerScreen} options={orderTrackerOptions} />
      <AdminStack.Screen
        name="CameraQRScanner"
        component={CameraQRScannerScreen}
        options={{ title: 'Scan Table QR Code', headerBackTitle: 'Back' }}
      />
    </AdminStack.Navigator>
  );
}

function CustomerNavigator({ screenOptions }: { screenOptions: NativeStackNavigationOptions }) {
  return (
    <CustomerStack.Navigator screenOptions={screenOptions}>
      <CustomerStack.Screen name="StorefrontDirectory" component={StorefrontDirectoryScreen} options={hiddenHeader} />
      <CustomerStack.Screen
        name="CameraQRScanner"
        component={CameraQRScannerScreen}
        options={{ title: 'Scan Table QR Code', headerBackTitle: 'Back' }}
      />
      <CustomerStack.Screen
        name="Storefront"
        component={StorefrontScreen}
        options={({ route }) => ({
          title: route.params?.name || 'Storefront',
          headerBackTitle: 'Back',
        })}
      />
      <CustomerStack.Screen name="Wishlist" component={WishlistScreen} options={wishlistOptions} />
      <CustomerStack.Screen name="CartDrawer" component={CartDrawerScreen} options={cartOptions} />
      <CustomerStack.Screen name="Checkout" component={CheckoutScreen} options={checkoutOptions} />
      <CustomerStack.Screen name="OrderReceiptTracker" component={OrderReceiptTrackerScreen} options={orderTrackerOptions} />
      <CustomerStack.Screen name="AccessPageGuest" component={AccessPageGuestScreen} options={accessPageGuestOptions} />
      <CustomerStack.Screen name="Settings" component={SettingsScreen} options={settingsOptions} />
      <CustomerStack.Screen name="TermsOfService" component={TermsOfServiceScreen} options={{ title: 'Terms of Service', headerBackTitle: 'Back' }} />
      <CustomerStack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} options={{ title: 'Privacy Policy', headerBackTitle: 'Back' }} />
    </CustomerStack.Navigator>
  );
}

// ==========================================
// 3. LOADING SCREEN
// ==========================================
function BootScreen({ isDark }: { isDark: boolean }) {
  return (
    <View className={`flex-1 items-center justify-center ${isDark ? 'bg-[#09090B]' : 'bg-white'}`}>
      <Text className="text-[32px] font-bold text-primary tracking-wide">ScanCode</Text>
      <ActivityIndicator size="large" color="#059669" className="mt-6" />
    </View>
  );
}

// ==========================================
// 4. INNER APP CONTENT WITH THEME AWARENESS
// ==========================================
function AppContent() {
  const { appState, isDark } = useAppContext();

  const dynamicScreenOptions: NativeStackNavigationOptions = useMemo(
    () => ({
      headerStyle: { backgroundColor: isDark ? '#18181B' : '#ffffff' },
      headerTintColor: isDark ? '#34D399' : '#059669',
      headerTitleStyle: { color: isDark ? '#F9FAFB' : '#111827', fontWeight: '700' },
      contentStyle: { backgroundColor: isDark ? '#09090B' : '#F3F4F6' },
      headerLeft: ({ canGoBack }) => <HeaderBackButton canGoBack={canGoBack} />,
      headerBackButtonDisplayMode: 'minimal',
    }),
    [isDark]
  );

  const navTheme = useMemo(() => {
    const base = isDark ? DarkTheme : DefaultTheme;
    return {
      ...base,
      dark: isDark,
      colors: {
        ...base.colors,
        primary: '#059669',
        background: isDark ? '#09090B' : '#F3F4F6',
        card: isDark ? '#18181B' : '#ffffff',
        text: isDark ? '#F9FAFB' : '#111827',
        border: isDark ? '#27272A' : '#E5E7EB',
        notification: '#EF4444',
      },
      fonts: base.fonts ?? {
        regular: { fontFamily: '', fontWeight: 'normal' },
        medium: { fontFamily: '', fontWeight: '500' },
        bold: { fontFamily: '', fontWeight: 'bold' },
        heavy: { fontFamily: '', fontWeight: '900' },
      },
    };
  }, [isDark]);

  return (
    <SafeAreaProvider>
      <NavigationContainer theme={navTheme}>
        <StatusBar style={isDark ? 'light' : 'dark'} />

        {appState === 'loading' ? (
          <BootScreen isDark={isDark} />
        ) : appState === 'logged_out' ? (
          <AuthNavigator screenOptions={dynamicScreenOptions} />
        ) : appState === 'admin' ? (
          <AdminNavigator screenOptions={dynamicScreenOptions} />
        ) : (
          <CustomerNavigator screenOptions={dynamicScreenOptions} />
        )}
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

// ==========================================
// 5. MAIN CONTAINER & STATE GATEKEEPER
// ==========================================
function App() {
  const [appState, setAppState] = useState<AppState>('loading');

  useEffect(() => {
    async function bootstrap() {
      await demoEngine.init();

      if (demoEngine.isDemoModeEnabled()) {
        const role = demoEngine.getActiveRole();
        setAppState(role);
      } else {
        try {
          const token = await getToken();
          setAppState(token ? 'admin' : 'logged_out');
        } catch {
          setAppState('logged_out');
        }
      }
    }
    bootstrap();
  }, []);

  useEffect(() => {
    return onUnauthorized(() => {
      deleteToken().finally(() => setAppState('logged_out'));
    });
  }, []);

  useEffect(() => {
    initOfflineQueue();
  }, []);

  useEffect(() => {
    if (appState === 'admin' || appState === 'customer') {
      registerForPushNotificationsAsync();
    }
  }, [appState]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <BottomSheetModalProvider>
        <AppContextProvider appState={appState} setAppState={setAppState}>
          <CartProvider>
            <AppContent />
          </CartProvider>
        </AppContextProvider>
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
}

export default Sentry.wrap(App);
