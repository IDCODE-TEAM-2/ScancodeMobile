import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Linking,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  endConnection,
  ErrorCode,
  fetchProducts,
  finishTransaction,
  getAvailablePurchases,
  initConnection,
  purchaseErrorListener,
  purchaseUpdatedListener,
  requestPurchase,
  restorePurchases,
  type ProductSubscriptionIOS,
  type Purchase,
} from 'expo-iap';
import { CheckCircle2, PartyPopper } from 'lucide-react-native';
import {
  getMe,
  getMyStorefronts,
  publishStorefront,
  verifyAppleSubscription,
} from '../../api';
import type { NavigationProp, RouteProps } from '../../types';
import { useAppContext } from '../../context/AppContext';
import { cn } from '../../utils/cn';

const PRODUCTS = [
  { id: 'com.scancode.pro.monthly', plan: 'ScanCode Pro', period: 'Monthly' },
  { id: 'com.scancode.pro.yearly', plan: 'ScanCode Pro', period: 'Yearly' },
  { id: 'com.scancode.enterprise.monthly', plan: 'ScanCode Enterprise', period: 'Monthly' },
  { id: 'com.scancode.enterprise.yearly', plan: 'ScanCode Enterprise', period: 'Yearly' },
] as const;

interface Props {
  navigation: NavigationProp<'ActivateQR'>;
  route: RouteProps<'ActivateQR'>;
}

type Step = 'loading' | 'ready' | 'activating' | 'restoring' | 'success' | 'error';

export default function ActivateQRScreen({ navigation, route }: Props) {
  const { storefrontId, slug, name } = route.params;
  const { isDark } = useAppContext();
  const [step, setStep] = useState<Step>('loading');
  const [products, setProducts] = useState<ProductSubscriptionIOS[]>([]);
  const [planSelected, setPlanSelected] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingProduct, setPendingProduct] = useState<string | null>(null);
  const [storefrontPublished, setStorefrontPublished] = useState(false);
  const processingTransactions = useRef(new Set<string>());
  const mounted = useRef(true);

  const processPurchase = useCallback(async (purchase: Purchase): Promise<boolean> => {
    const transactionKey = purchase.transactionId ?? purchase.id;
    if (!transactionKey || processingTransactions.current.has(transactionKey)) return false;
    processingTransactions.current.add(transactionKey);

    try {
      if (!PRODUCTS.some((product) => product.id === purchase.productId) || !purchase.purchaseToken) {
        throw new Error('The App Store did not return a verifiable ScanCode subscription transaction.');
      }

      const entitlement = await verifyAppleSubscription(purchase.purchaseToken);
      if (!entitlement.active) {
        throw new Error('Apple could not confirm an active subscription for this account.');
      }

      await finishTransaction({ purchase, isConsumable: false });
      setPlanSelected(entitlement.planSelected);
      const storefront = await publishStorefront(storefrontId);
      setStorefrontPublished(storefront.isPublished);
      setStep(storefront.isPublished ? 'success' : 'ready');
      setErrorMessage(null);
      return storefront.isPublished;
    } catch (error: unknown) {
      setStep('error');
      setErrorMessage(error instanceof Error ? error.message : 'Could not verify the App Store subscription.');
      return false;
    } finally {
      processingTransactions.current.delete(transactionKey);
      setPendingProduct(null);
    }
  }, [storefrontId]);

  useEffect(() => {
    mounted.current = true;
    const purchaseUpdates = purchaseUpdatedListener((purchase) => {
      void processPurchase(purchase);
    });
    const purchaseErrors = purchaseErrorListener((error) => {
      setPendingProduct(null);
      if (error.code !== ErrorCode.UserCancelled) {
        setStep('error');
        setErrorMessage(error.message || 'The App Store could not complete this subscription.');
      } else {
        setStep('ready');
      }
    });

    async function prepareStore() {
      if (Platform.OS === 'ios') {
        try {
          await initConnection();
          const availableProducts = await fetchProducts({
            skus: PRODUCTS.map((product) => product.id),
            type: 'subs',
          });
          if (mounted.current) {
            setProducts((availableProducts ?? []).filter(
              (product): product is ProductSubscriptionIOS => product.platform === 'ios',
            ));
          }
        } catch (error: unknown) {
          if (mounted.current) {
            setErrorMessage(error instanceof Error ? error.message : 'Could not load App Store products.');
          }
        }
      }

      try {
        const [user, storefronts] = await Promise.all([getMe(), getMyStorefronts()]);
        if (!mounted.current) return;
        const storefront = storefronts.find((item) => item.id === storefrontId);
        if (!storefront) throw new Error('This storefront could not be found in your account.');
        const planIsActive = user.isPaid
          && (!user.planExpiresAt || Date.parse(user.planExpiresAt) > Date.now());
        setPlanSelected(planIsActive ? user.planSelected : null);
        setStorefrontPublished(storefront.isPublished);
        setStep(storefront.isPublished ? 'success' : 'ready');
        if (planIsActive) setErrorMessage(null);
      } catch (error: unknown) {
        if (!mounted.current) return;
        setErrorMessage(error instanceof Error ? error.message : 'Could not load subscription details.');
        setStep('error');
      }
    }

    void prepareStore();
    return () => {
      mounted.current = false;
      purchaseUpdates.remove();
      purchaseErrors.remove();
      void endConnection().catch((error: unknown) => {
        console.warn('Could not close the App Store connection.', error);
      });
    };
  }, [processPurchase, storefrontId]);

  const isActiveSubscription = !!planSelected
    && ['PRO', 'ENTERPRISE', 'BUSINESS'].includes(planSelected.split('_')[0]);
  const isBusy = step === 'loading' || step === 'activating' || step === 'restoring';

  async function activateExistingSubscription() {
    setStep('activating');
    setErrorMessage(null);
    try {
      const storefront = await publishStorefront(storefrontId);
      setStorefrontPublished(storefront.isPublished);
      setStep(storefront.isPublished ? 'success' : 'ready');
    } catch (error: unknown) {
      setStep('error');
      setErrorMessage(error instanceof Error ? error.message : 'Could not activate this storefront.');
    }
  }

  async function beginPurchase(productId: string) {
    setPendingProduct(productId);
    setErrorMessage(null);
    setStep('activating');
    try {
      await requestPurchase({
        request: { apple: { sku: productId } },
        type: 'subs',
      });
    } catch (error: unknown) {
      setPendingProduct(null);
      setStep('error');
      setErrorMessage(error instanceof Error ? error.message : 'Could not start the App Store subscription.');
    }
  }

  async function restoreSubscription() {
    setStep('restoring');
    setErrorMessage(null);
    try {
      await restorePurchases();
      const purchases = await getAvailablePurchases();
      const subscriptionPurchases = purchases.filter((purchase) =>
        PRODUCTS.some((product) => product.id === purchase.productId),
      );
      if (subscriptionPurchases.length === 0) {
        setStep('ready');
        setErrorMessage('No ScanCode subscription was found for this Apple account.');
        return;
      }

      let restored = false;
      for (const purchase of subscriptionPurchases) {
        restored = await processPurchase(purchase) || restored;
      }
      if (!restored) {
        setStep('error');
        setErrorMessage('The restored subscription could not be verified or linked to this account.');
      }
    } catch (error: unknown) {
      setStep('error');
      setErrorMessage(error instanceof Error ? error.message : 'Could not restore App Store purchases.');
    }
  }

  async function refreshPublishedState() {
    try {
      const storefronts = await getMyStorefronts();
      const storefront = storefronts.find((item) => item.id === storefrontId);
      if (!storefront) throw new Error('This storefront could not be found in your account.');
      setStorefrontPublished(storefront.isPublished);
      if (storefront.isPublished) setStep('success');
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not refresh storefront status.');
    }
  }

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && storefrontPublished) void refreshPublishedState();
    });
    return () => subscription.remove();
  }, [storefrontPublished, storefrontId]);

  const productPrice = (productId: string) =>
    products.find((product) => product.id === productId)?.displayPrice ?? null;

  return (
    <ScrollView
      className="flex-1 bg-gray-100 dark:bg-[#09090B]"
      contentContainerClassName="justify-center p-5"
    >
      <View className="rounded-2xl border border-transparent bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-[#18181B]">
        <Text className="mb-1 text-[11px] font-extrabold tracking-wide text-primary">STOREFRONT ACTIVATION</Text>
        <Text className="mb-4 text-[22px] font-extrabold text-gray-900 dark:text-white">{name}</Text>

        <View className="mb-5 flex-row items-center gap-3 rounded-xl bg-gray-50 p-4 dark:bg-zinc-900">
          <CheckCircle2 size={20} color={isDark ? '#34D399' : '#374151'} strokeWidth={2.2} />
          <Text className="flex-1 text-[13px] text-gray-600 dark:text-zinc-300">
            One active ScanCode Pro or Enterprise subscription activates your single storefront.
          </Text>
        </View>

        {errorMessage ? (
          <View className="mb-4 rounded-lg border border-red-200 bg-red-100 p-3 dark:border-red-800 dark:bg-red-950/40">
            <Text className="text-[13px] text-red-600 dark:text-red-400">{errorMessage}</Text>
          </View>
        ) : null}

        {step === 'success' && storefrontPublished ? (
          <View className="items-center rounded-xl border border-emerald-200 bg-emerald-100 p-4 dark:border-emerald-800 dark:bg-emerald-950/40">
            <View className="mb-1 flex-row items-center gap-2">
              <PartyPopper size={18} color={isDark ? '#34D399' : '#374151'} strokeWidth={2.2} />
              <Text className="text-lg font-extrabold text-emerald-800 dark:text-emerald-400">Storefront Activated</Text>
            </View>
            <Text className="mb-3 text-center text-[13px] text-emerald-700 dark:text-emerald-500">
              Your storefront is live and published.
            </Text>
            <TouchableOpacity
              className="w-full items-center rounded-xl bg-primary py-3.5"
              onPress={() => navigation.navigate('QR', { slug, name })}
            >
              <Text className="text-base font-bold text-white">View QR Code</Text>
            </TouchableOpacity>
          </View>
        ) : Platform.OS !== 'ios' ? (
          <Text className="text-center text-sm text-gray-600 dark:text-zinc-300">
            ScanCode subscriptions are available on iOS.
          </Text>
        ) : isBusy ? (
          <View className="items-center py-4">
            <ActivityIndicator color="#059669" />
            <Text className="mt-2 text-sm text-gray-500 dark:text-zinc-400">
              {step === 'restoring' ? 'Restoring subscription…' : 'Verifying subscription…'}
            </Text>
          </View>
        ) : isActiveSubscription ? (
          <View className="gap-3">
            <Text className="text-center text-sm text-gray-600 dark:text-zinc-300">
              Your {planSelected?.split('_')[0].toLowerCase()} subscription is active.
            </Text>
            <TouchableOpacity
              className="items-center rounded-xl bg-primary py-3.5"
              onPress={activateExistingSubscription}
            >
              <Text className="text-base font-bold text-white">Activate Storefront</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View className="gap-4">
            {(['PRO', 'ENTERPRISE'] as const).map((tier) => {
              const label = tier === 'PRO' ? 'ScanCode Pro' : 'ScanCode Enterprise';
              const productsForTier = PRODUCTS.filter((product) =>
                product.plan === label,
              );
              return (
                <View key={tier} className="rounded-xl border border-gray-200 p-4 dark:border-zinc-700">
                  <Text className="mb-3 text-lg font-bold text-gray-900 dark:text-white">{label}</Text>
                  <View className="flex-row gap-2">
                    {productsForTier.map((product) => {
                      const price = productPrice(product.id);
                      return (
                        <TouchableOpacity
                          key={product.id}
                          className={cn(
                            'flex-1 items-center rounded-lg bg-primary px-2 py-3',
                            (!price || !!pendingProduct) && 'opacity-50',
                          )}
                          disabled={!price || !!pendingProduct}
                          onPress={() => void beginPurchase(product.id)}
                        >
                          <Text className="text-sm font-bold text-white">{product.period}</Text>
                          <Text className="mt-1 text-xs text-white">{price ?? 'Unavailable'}</Text>
                          {pendingProduct === product.id ? <ActivityIndicator color="#FFFFFF" className="mt-2" /> : null}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              );
            })}

            <View className="rounded-xl border border-gray-200 p-4 dark:border-zinc-700">
              <Text className="text-lg font-bold text-gray-900 dark:text-white">ScanCode Ultimate</Text>
              <Text className="mt-1 text-sm text-gray-600 dark:text-zinc-300">
                Contact us for ScanCode Ultimate.
              </Text>
              <TouchableOpacity
                className="mt-3 items-center rounded-lg border border-gray-300 py-3 dark:border-zinc-600"
                onPress={() => void Linking.openURL('mailto:support@scancode.ng?subject=ScanCode%20Ultimate')}
              >
                <Text className="text-sm font-bold text-gray-800 dark:text-zinc-100">Contact Us</Text>
              </TouchableOpacity>
            </View>

            {products.length === 0 ? (
              <Text className="text-center text-xs text-gray-500 dark:text-zinc-400">
                App Store subscription products are not available right now. Please try again later.
              </Text>
            ) : null}

            <TouchableOpacity
              className="items-center rounded-xl border border-gray-300 py-3 dark:border-zinc-700"
              onPress={() => void restoreSubscription()}
            >
              <Text className="text-sm font-semibold text-gray-700 dark:text-zinc-200">Restore Purchases</Text>
            </TouchableOpacity>
            <Text className="text-center text-[11px] text-gray-500 dark:text-zinc-500">
              Subscriptions renew automatically unless canceled in your Apple account settings.
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
