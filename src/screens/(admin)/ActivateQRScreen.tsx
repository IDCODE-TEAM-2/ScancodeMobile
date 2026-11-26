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
  fetchProducts,
  finishTransaction,
  getAvailablePurchases,
  initConnection,
  purchaseErrorListener,
  purchaseUpdatedListener,
  requestPurchase,
  restorePurchases,
  type ProductSubscription,
  type Purchase,
} from 'expo-iap';
import { PartyPopper } from 'lucide-react-native';
import {
  ApiError,
  getMe,
  getMyStorefronts,
  publishStorefront,
  type PaymentPurpose,
  verifyAppleSubscription,
  verifyGooglePlaySubscription,
} from '../../api';
import type { NavigationProp, RouteProps } from '../../types';
import { useAppContext } from '../../context/AppContext';
import { cn } from '../../utils/cn';
import { payWithPaystack } from '../../utils/paystack';
import {
  appStoreErrorMessage,
  isAppStoreCancellation,
} from '../../utils/appStoreErrors';

const PRODUCTS = [
  { id: 'com.scancode.pro.monthly', plan: 'ScanCode Pro', period: 'Monthly', price: '₦7,999 / month', paystackPurpose: 'QR_PRO' },
  { id: 'com.scancode.pro.yearly', plan: 'ScanCode Pro', period: 'Yearly', price: '₦79,999 / year', paystackPurpose: 'QR_PRO_SUB' },
  { id: 'com.scancode.enterprise.monthly', plan: 'ScanCode Enterprise', period: 'Monthly', price: '₦15,999 / month', paystackPurpose: 'QR_BUSINESS' },
  { id: 'com.scancode.enterprise.yearly', plan: 'ScanCode Enterprise', period: 'Yearly', price: '₦159,999 / year', paystackPurpose: 'QR_BUSINESS_SUB' },
] as const;
const PRODUCT_IDS: readonly string[] = PRODUCTS.map((product) => product.id);

/** One swipeable card on the plan picker. `plan` links a subscription tier to its PRODUCTS entries. */
type PlanCard = {
  key: string;
  kind: 'basic' | 'tier' | 'contact';
  kicker: string;
  title: string;
  plan?: string;
  features: string[];
};

/** In-app purchases use the platform store; Paystack checkout is also offered on the web. */
const STORE_SUPPORTED = Platform.OS === 'ios' || Platform.OS === 'android';
const STORE_NAME = Platform.OS === 'ios' ? 'App Store' : 'Google Play';

/**
 * Paystack checkout for ScanCode plans is not shown on iOS: App Store Guideline 3.1.1 requires
 * digital subscriptions in an iOS app to be sold only through In-App Purchase, with no buttons or
 * links to other ways of paying. iOS shows App Store prices and the App Store purchase only.
 */
const OFFER_WEB_CHECKOUT = Platform.OS !== 'ios';

/** Confirms a purchase with ScanCode, which checks it with Apple or Google before granting the plan. */
function verifyWithServer(purchase: Purchase, purchaseToken: string) {
  return Platform.OS === 'android'
    ? verifyGooglePlaySubscription(purchase.productId, purchaseToken)
    : verifyAppleSubscription(purchaseToken);
}

/** How long to wait for StoreKit's result after the purchase sheet closes before giving up. */
const PURCHASE_RESULT_GRACE_MS = 30_000;

interface Props {
  navigation: NavigationProp<'ActivateQR'>;
  route: RouteProps<'ActivateQR'>;
}

type Step = 'loading' | 'ready' | 'purchasing' | 'paystack' | 'verifying' | 'activating' | 'restoring' | 'success' | 'error';

const BUSY_LABELS: Partial<Record<Step, string>> = {
  loading: 'Loading subscription details…',
  restoring: 'Restoring subscription…',
  purchasing: `Waiting for ${STORE_NAME}…`,
  paystack: 'Opening secure Paystack checkout…',
  verifying: 'Confirming your subscription…',
  activating: 'Activating storefront…',
};

/**
 * Where a transaction came from. It decides what the user is told:
 * - purchase: the user just tapped Buy, so report every outcome.
 * - restore:  the user tapped Restore Purchases; the caller reports the combined outcome.
 * - replay:   StoreKit re-delivered an unfinished transaction when the store connected
 *             (Apple: "the listener receives them once, immediately after the app launches").
 *             Apply it if it grants access, otherwise handle it quietly.
 */
type Origin = 'purchase' | 'restore' | 'replay';

type Outcome =
  | { kind: 'activated' }
  | { kind: 'inactive'; message: string }
  | { kind: 'failed'; message: string }
  | { kind: 'skipped' };

/** Newest first, so the transaction most likely to be active is tried first. */
function byNewest(a: Purchase, b: Purchase): number {
  const expiry = (purchase: Purchase) =>
    ('expirationDateIOS' in purchase ? purchase.expirationDateIOS : null) ?? purchase.transactionDate ?? 0;
  return expiry(b) - expiry(a);
}

export default function ActivateQRScreen({ navigation, route }: Props) {
  const { storefrontId, slug, name } = route.params ?? {};
  const isUpgradeFlow = storefrontId === undefined;
  const { isDark } = useAppContext();
  const [step, setStep] = useState<Step>('loading');
  const [products, setProducts] = useState<ProductSubscription[]>([]);
  const [planSelected, setPlanSelected] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);
  const [pendingProduct, setPendingProduct] = useState<string | null>(null);
  const [storefrontPublished, setStorefrontPublished] = useState(false);
  const [billing, setBilling] = useState<'Monthly' | 'Yearly'>('Monthly');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const mounted = useRef(true);
  const stepRef = useRef<Step>('loading');
  stepRef.current = step;
  /** SKU of the purchase the user started on this screen, so its result is reported to them. */
  const purchasingSku = useRef<string | null>(null);
  const purchaseGraceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Transactions being verified right now (StoreKit can deliver the same one twice). */
  const inFlight = useRef(new Set<string>());
  /** Transactions already finished in this session; never process them again. */
  const finished = useRef(new Set<string>());

  const showError = useCallback((message: string) => {
    if (!mounted.current) return;
    setNoticeMessage(null);
    setErrorMessage(message);
    setStep('error');
  }, []);

  const clearPurchaseAttempt = useCallback(() => {
    purchasingSku.current = null;
    if (purchaseGraceTimer.current) {
      clearTimeout(purchaseGraceTimer.current);
      purchaseGraceTimer.current = null;
    }
    if (mounted.current) setPendingProduct(null);
  }, []);

  const finish = useCallback(async (purchase: Purchase, key: string) => {
    try {
      await finishTransaction({ purchase, isConsumable: false });
      finished.current.add(key);
    } catch (error: unknown) {
      // Harmless: the store will re-deliver it and the server treats re-verification as idempotent.
      console.warn(`Could not finish ${STORE_NAME} transaction.`, error);
    }
  }, []);

  /**
   * Verifies one transaction with ScanCode and finishes it when there is nothing more to do.
   *
   * iOS: finish a transaction once the service is delivered, or once there is nothing to deliver.
   * An unfinished transaction is re-sent every launch, which is how an old expired test purchase
   * kept showing "This App Store subscription is not active".
   *
   * Android: finishing *acknowledges* the purchase, and Google refunds unacknowledged purchases
   * after 3 days. So on Android a purchase is only acknowledged once ScanCode granted the plan;
   * a rejected one is left for Google to refund.
   *
   * Transient failures (network, server errors) never finish, so they can be retried.
   */
  const handleTransaction = useCallback(async (purchase: Purchase, origin: Origin): Promise<Outcome> => {
    if (!PRODUCT_IDS.includes(purchase.productId)) return { kind: 'skipped' };

    if (purchase.purchaseState === 'pending') {
      return origin === 'replay'
        ? { kind: 'skipped' }
        : { kind: 'failed', message: appStoreErrorMessage({ code: 'deferred-payment' }) };
    }

    const key = purchase.transactionId ?? purchase.id;
    if (!key || finished.current.has(key) || inFlight.current.has(key)) return { kind: 'skipped' };
    if (!purchase.purchaseToken) {
      return { kind: 'failed', message: `${STORE_NAME} did not return a purchase token. Tap Restore Purchases to try again.` };
    }

    // On Android, finishing acknowledges; never acknowledge something ScanCode didn't grant.
    const finishRejected = Platform.OS === 'android' ? async () => {} : () => finish(purchase, key);
    const expiredMessage = `This ${STORE_NAME} subscription isn't active. Choose a plan to subscribe again.`;

    inFlight.current.add(key);
    if (origin !== 'replay' && mounted.current) setStep('verifying');
    try {
      let entitlement: Awaited<ReturnType<typeof verifyAppleSubscription>>;
      try {
        entitlement = await verifyWithServer(purchase, purchase.purchaseToken);
      } catch (error: unknown) {
        if (error instanceof ApiError && (error.status === 402 || error.status === 400)) {
          // 402: expired or refunded. 400: not a valid ScanCode subscription. Nothing to deliver.
          await finishRejected();
          return { kind: 'inactive', message: expiredMessage };
        }
        if (error instanceof ApiError && error.status === 409) {
          // Linked to a different ScanCode account. Retrying will never succeed.
          await finishRejected();
          return { kind: 'failed', message: error.message };
        }
        const reason = error instanceof Error ? error.message : 'Unknown error';
        return {
          kind: 'failed',
          message: `Your payment went through, but ScanCode could not confirm it yet (${reason}). You will not be charged again; tap Restore Purchases in a moment.`,
        };
      }

      if (!entitlement.active) {
        await finishRejected();
        return { kind: 'inactive', message: expiredMessage };
      }
      await finish(purchase, key);

      if (!mounted.current) return { kind: 'activated' };
      setPlanSelected(entitlement.planSelected);
      setErrorMessage(null);
      if (storefrontId === undefined) {
        setStep('success');
        return { kind: 'activated' };
      }

      setStep('activating');
      try {
        const storefront = await publishStorefront(storefrontId);
        if (!mounted.current) return { kind: 'activated' };
        setStorefrontPublished(storefront.isPublished);
        setStep(storefront.isPublished ? 'success' : 'ready');
      } catch (error: unknown) {
        // The subscription is active; only publishing failed. The "Activate Storefront" button retries.
        const reason = error instanceof Error ? error.message : 'Unknown error';
        showError(`Your subscription is active, but the storefront could not be published (${reason}). Tap Activate Storefront to try again.`);
      }
      return { kind: 'activated' };
    } finally {
      inFlight.current.delete(key);
    }
  }, [finish, showError, storefrontId]);

  /** Purchases from the user's own Buy tap, plus anything StoreKit replays. */
  const onTransaction = useCallback(async (purchase: Purchase) => {
    const origin: Origin = purchasingSku.current === purchase.productId ? 'purchase' : 'replay';
    if (origin === 'purchase') clearPurchaseAttempt();

    const outcome = await handleTransaction(purchase, origin);
    if (!mounted.current || origin !== 'purchase') return;
    if (outcome.kind === 'inactive' || outcome.kind === 'failed') {
      if (purchase.purchaseState === 'pending') {
        setStep('ready');
        setNoticeMessage(outcome.message);
      } else {
        showError(outcome.message);
      }
    }
  }, [clearPurchaseAttempt, handleTransaction, showError]);

  useEffect(() => {
    mounted.current = true;
    const purchaseUpdates = purchaseUpdatedListener((purchase) => {
      void onTransaction(purchase);
    });
    const purchaseErrors = purchaseErrorListener((error) => {
      if (!purchasingSku.current) return; // Not from a purchase the user started here.
      clearPurchaseAttempt();
      if (isAppStoreCancellation(error)) {
        setStep('ready');
      } else {
        showError(appStoreErrorMessage(error));
      }
    });

    async function loadAccount() {
      try {
        const [user, storefronts] = await Promise.all([
          getMe(),
          storefrontId === undefined ? Promise.resolve([]) : getMyStorefronts(),
        ]);
        if (!mounted.current) return;
        const storefront = storefronts.find((item) => item.id === storefrontId);
        if (storefrontId !== undefined && !storefront) {
          throw new Error('This storefront could not be found in your account.');
        }
        // A replayed transaction may already have activated the plan; don't overwrite that.
        if (stepRef.current !== 'loading') return;
        const planIsActive = user.isPaid
          && (!user.planExpiresAt || Date.parse(user.planExpiresAt) > Date.now());
        setPlanSelected(planIsActive ? user.planSelected : null);
        setStorefrontPublished(storefront?.isPublished ?? false);
        setStep(storefront?.isPublished ? 'success' : 'ready');
      } catch (error: unknown) {
        if (!mounted.current) return;
        const reason = error instanceof Error ? error.message : 'Unknown error';
        showError(`Could not load your ScanCode account (${reason}).`);
      }
    }

    async function connectStore() {
      if (!STORE_SUPPORTED) return;
      try {
        // Opening the connection also delivers any unfinished transactions to the listener above.
        await initConnection();
        const available = await fetchProducts({ skus: [...PRODUCT_IDS], type: 'subs' });
        if (mounted.current) {
          setProducts((available ?? []).filter(
            (product): product is ProductSubscription => product.platform === Platform.OS,
          ));
        }
      } catch (error: unknown) {
        console.warn(`Could not load ${STORE_NAME} products.`, error);
        // The "products not available" note below the plans covers this case.
      }
    }

    void Promise.all([connectStore(), loadAccount()]);
    return () => {
      mounted.current = false;
      if (purchaseGraceTimer.current) clearTimeout(purchaseGraceTimer.current);
      purchaseUpdates.remove();
      purchaseErrors.remove();
      void endConnection().catch((error: unknown) => {
        console.warn(`Could not close the ${STORE_NAME} connection.`, error);
      });
    };
  }, [clearPurchaseAttempt, onTransaction, showError, storefrontId]);

  const isActiveSubscription = !!planSelected
    && ['PRO', 'ENTERPRISE', 'BUSINESS'].includes(planSelected.split('_')[0]);
  const activeTier = planSelected?.split('_')[0];
  const availableTiers = activeTier === 'ENTERPRISE' || activeTier === 'BUSINESS'
    ? []
    : activeTier === 'PRO' ? ['ENTERPRISE'] as const : ['PRO', 'ENTERPRISE'] as const;
  const isBusy = step === 'loading' || step === 'purchasing' || step === 'verifying'
    || step === 'paystack' || step === 'activating' || step === 'restoring';

  async function activateExistingSubscription() {
    if (storefrontId === undefined) return;
    setStep('activating');
    setErrorMessage(null);
    setNoticeMessage(null);
    try {
      const storefront = await publishStorefront(storefrontId);
      setStorefrontPublished(storefront.isPublished);
      setStep(storefront.isPublished ? 'success' : 'ready');
    } catch (error: unknown) {
      showError(error instanceof Error ? error.message : 'Could not activate this storefront.');
    }
  }

  async function beginWebPurchase(purpose: PaymentPurpose) {
    setErrorMessage(null);
    setNoticeMessage(null);
    setStep('paystack');
    await payWithPaystack({
      purpose,
      payload: {},
      requireAuth: true,
      title: 'Subscription payment',
      onSuccess: async () => {
        if (!mounted.current) return;
        setStep('verifying');
        const user = await getMe();
        if (!mounted.current) return;
        const planIsActive = user.isPaid
          && (!user.planExpiresAt || Date.parse(user.planExpiresAt) > Date.now());
        if (!planIsActive) {
          throw new Error('Payment was confirmed, but the subscription is not active yet. Please refresh your account shortly.');
        }
        setPlanSelected(user.planSelected);
        if (storefrontId === undefined) {
          setStep('success');
          return;
        }
        setStep('activating');
        const storefront = await publishStorefront(storefrontId);
        if (!mounted.current) return;
        if (!storefront.isPublished) {
          showError('Your subscription is active, but the storefront could not be activated. Please try again.');
          return;
        }
        setStorefrontPublished(storefront.isPublished);
        setStep('success');
      },
      onError: (message) => {
        if (mounted.current) showError(message);
      },
      onCancel: () => {
        if (mounted.current) setStep('ready');
      },
    });
  }

  async function beginPurchase(productId: string) {
    clearPurchaseAttempt();
    purchasingSku.current = productId;
    setPendingProduct(productId);
    setErrorMessage(null);
    setNoticeMessage(null);
    setStep('purchasing');
    try {
      if (Platform.OS === 'android') {
        // Google Play needs the offer token of the subscription's base plan.
        const product = products.find((item) => item.id === productId);
        const offerToken = product?.subscriptionOffers
          ?.find((offer) => !!offer.offerTokenAndroid)?.offerTokenAndroid;
        if (!offerToken) {
          clearPurchaseAttempt();
          showError('This plan is not available from Google Play right now. Please try again later.');
          return;
        }
        await requestPurchase({
          request: { google: { skus: [productId], subscriptionOffers: [{ sku: productId, offerToken }] } },
          type: 'subs',
        });
      } else {
        await requestPurchase({ request: { apple: { sku: productId } }, type: 'subs' });
      }
      // The sheet has closed. The result normally arrives through the listeners already; if
      // nothing has arrived after a grace period, stop the spinner instead of waiting forever.
      purchaseGraceTimer.current = setTimeout(() => {
        purchaseGraceTimer.current = null;
        if (!mounted.current || purchasingSku.current !== productId) return;
        clearPurchaseAttempt();
        setStep('ready');
        setNoticeMessage('If you completed the purchase, tap Restore Purchases to activate it.');
      }, PURCHASE_RESULT_GRACE_MS);
    } catch (error: unknown) {
      if (purchasingSku.current !== productId) return; // Already handled by the error listener.
      clearPurchaseAttempt();
      if (isAppStoreCancellation(error)) {
        setStep('ready');
      } else {
        showError(appStoreErrorMessage(error));
      }
    }
  }

  async function activeScanCodePurchases(): Promise<Purchase[]> {
    // Apple: StoreKit keeps transactions up to date automatically, so current entitlements are
    // normally all a restore needs. onlyIncludeActiveItemsIOS skips expired history.
    const purchases = await getAvailablePurchases({ onlyIncludeActiveItemsIOS: true });
    return purchases.filter((purchase) => PRODUCT_IDS.includes(purchase.productId)).sort(byNewest);
  }

  async function restoreSubscription() {
    clearPurchaseAttempt();
    setStep('restoring');
    setErrorMessage(null);
    setNoticeMessage(null);
    try {
      let purchases = await activeScanCodePurchases();

      // Only when StoreKit has nothing locally, force a sync with the App Store. Apple: this shows
      // a sign-in prompt and is rarely needed; it fails with "Unable to Complete Request" when the
      // device isn't signed in to the App Store, so it must not be the first or only step.
      if (purchases.length === 0) {
        try {
          await restorePurchases();
        } catch (error: unknown) {
          if (isAppStoreCancellation(error)) {
            setStep('ready');
            return;
          }
          showError(appStoreErrorMessage(error));
          return;
        }
        purchases = await activeScanCodePurchases();
      }

      if (purchases.length === 0) {
        setStep('ready');
        setNoticeMessage(
          Platform.OS === 'android'
            ? 'No active ScanCode subscription was found for this Google Play account.'
            : 'No active ScanCode subscription was found for this Apple ID.',
        );
        return;
      }

      let lastProblem: string | null = null;
      for (const purchase of purchases) {
        const outcome = await handleTransaction(purchase, 'restore');
        if (outcome.kind === 'activated') return;
        if (outcome.kind === 'inactive' || outcome.kind === 'failed') lastProblem = outcome.message;
      }
      if (!mounted.current) return;
      if (lastProblem) {
        showError(lastProblem);
      } else {
        setStep('ready'); // Every transaction was already handled elsewhere.
      }
    } catch (error: unknown) {
      showError(appStoreErrorMessage(error));
    }
  }

  async function refreshPublishedState() {
    if (storefrontId === undefined) return;
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
      if (state === 'active' && storefrontPublished && storefrontId !== undefined) void refreshPublishedState();
    });
    return () => subscription.remove();
  }, [storefrontPublished, storefrontId]);

  const productPrice = (productId: string) =>
    products.find((product) => product.id === productId)?.displayPrice ?? null;

  const busyLabel = BUSY_LABELS[step] ?? 'Working…';

  const showPlanPicker = STORE_SUPPORTED
    && !isBusy
    && !(step === 'success' && (storefrontPublished || isUpgradeFlow))
    && !(isActiveSubscription && !isUpgradeFlow);

  const planCards: PlanCard[] = [
    ...(storefrontId !== undefined && !isActiveSubscription
      ? [{
        key: 'basic',
        kind: 'basic' as const,
        kicker: 'BASIC',
        title: 'Basic',
        features: ['One published storefront', 'Up to 30 products'],
      }]
      : []),
    ...availableTiers.map((tier) => ({
      key: tier,
      kind: 'tier' as const,
      kicker: tier === 'PRO' ? 'PRO' : 'ENTERPRISE',
      title: tier === 'PRO' ? 'Pro' : 'Enterprise',
      plan: tier === 'PRO' ? 'ScanCode Pro' : 'ScanCode Enterprise',
      features: tier === 'PRO'
        ? ['Up to 150 products per storefront', 'Paystack online payments', 'Up to 5 storefronts']
        : ['Unlimited products per storefront', 'Paystack online payments', 'Up to 10 storefronts'],
    })),
    {
      key: 'ultimate',
      kind: 'contact' as const,
      kicker: 'ULTIMATE',
      title: 'Ultimate',
      features: ['Contact us for ScanCode Ultimate.'],
    },
  ];
  const activeIndex = Math.min(selectedIndex, planCards.length - 1);
  const selectedCard: PlanCard | undefined = planCards[activeIndex];
  const selectedProduct = selectedCard?.plan
    ? PRODUCTS.find((item) => item.plan === selectedCard.plan && item.period === billing)
    : undefined;
  const selectedPrice = selectedProduct ? productPrice(selectedProduct.id) : null;
  const ctaDisabled = selectedCard?.kind === 'tier' && (!selectedPrice || !!pendingProduct);
  const ctaLabel = selectedCard?.kind === 'basic'
    ? 'Activate Basic Storefront'
    : selectedCard?.kind === 'contact'
      ? 'Contact Us'
      : 'Subscribe';

  return (
    <ScrollView
      className="flex-1 bg-white dark:bg-[#09090B]"
      contentContainerClassName="p-5 pb-10"
    >
      <View className="mx-auto w-full max-w-xl">
        {showPlanPicker ? (
          <View className="mb-5">
            <TouchableOpacity
              className="self-end rounded-lg px-2 py-1"
              onPress={() => void restoreSubscription()}
              accessibilityRole="button"
              accessibilityLabel="Restore Purchases"
            >
              <Text className="text-[13px] font-semibold text-emerald-700 dark:text-emerald-400">Restore purchases</Text>
            </TouchableOpacity>
            <Text className="mt-3 text-center text-[26px] font-extrabold text-gray-900 dark:text-white">
              Plans that grow with you
            </Text>
            <Text className="mt-1 text-center text-[14px] leading-5 text-gray-500 dark:text-zinc-400">
              {isUpgradeFlow ? 'Choose the product capacity and event tools you need.' : `Choose a plan to activate ${name ?? 'your storefront'}.`}
            </Text>
          </View>
        ) : (
          <>
            <Text className="mb-1 text-center text-[11px] font-extrabold tracking-wide text-primary">
              {isUpgradeFlow ? 'SCAN CODE PLANS' : 'STOREFRONT ACTIVATION'}
            </Text>
            <Text className="mb-4 text-center text-[22px] font-extrabold text-gray-900 dark:text-white">
              {isUpgradeFlow ? 'Upgrade your plan' : name}
            </Text>

          </>
        )}

        {errorMessage ? (
          <View className="mb-4 rounded-lg border border-red-200 bg-red-100 p-3 dark:border-red-800 dark:bg-red-950/40">
            <Text className="text-[13px] text-red-600 dark:text-red-400">{errorMessage}</Text>
          </View>
        ) : null}

        {noticeMessage ? (
          <View className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/40">
            <Text className="text-[13px] text-amber-800 dark:text-amber-300">{noticeMessage}</Text>
          </View>
        ) : null}

        {step === 'success' && storefrontPublished ? (
          <View className="items-center rounded-xl bg-emerald-100 p-4 dark:bg-emerald-950/40">
            <View className="mb-1 flex-row items-center gap-2">
              <PartyPopper size={18} color={isDark ? '#34D399' : '#374151'} strokeWidth={2.2} />
              <Text className="text-lg font-extrabold text-emerald-800 dark:text-emerald-400">Storefront Activated</Text>
            </View>
            <Text className="mb-3 text-center text-[13px] text-emerald-700 dark:text-emerald-500">
              Your storefront is live and published.
            </Text>
            <TouchableOpacity
              className="w-full items-center rounded-xl bg-primary py-3.5"
              onPress={() => {
                if (slug && name) navigation.navigate('QR', { slug, name });
              }}
            >
              <Text className="text-base font-bold text-white">View QR Code</Text>
            </TouchableOpacity>
          </View>
        ) : step === 'success' && isUpgradeFlow ? (
          <View className="items-center rounded-xl bg-emerald-100 p-4 dark:bg-emerald-950/40">
            <View className="mb-1 flex-row items-center gap-2">
              <PartyPopper size={18} color={isDark ? '#34D399' : '#374151'} strokeWidth={2.2} />
              <Text className="text-lg font-extrabold text-emerald-800 dark:text-emerald-400">Plan upgraded</Text>
            </View>
            <Text className="mb-3 text-center text-[13px] text-emerald-700 dark:text-emerald-500">
              Your {planSelected?.split('_')[0].toLowerCase()} subscription is active.
            </Text>
            <TouchableOpacity
              className="w-full items-center rounded-xl bg-primary py-3.5"
              onPress={() => navigation.goBack()}
            >
              <Text className="text-base font-bold text-white">Done</Text>
            </TouchableOpacity>
          </View>
        ) : !STORE_SUPPORTED ? (
          <Text className="text-center text-sm text-gray-600 dark:text-zinc-300">
            ScanCode subscriptions are available in the iOS and Android apps.
          </Text>
        ) : isBusy ? (
          <View className="items-center py-4">
            <ActivityIndicator color="#059669" />
            <Text className="mt-2 text-sm text-gray-500 dark:text-zinc-400">{busyLabel}</Text>
          </View>
        ) : isActiveSubscription && !isUpgradeFlow ? (
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
            {isActiveSubscription ? (
              <Text className="rounded-xl bg-gray-50 px-4 py-3 text-[13px] text-gray-600 dark:bg-zinc-900 dark:text-zinc-300">
                Current plan: {activeTier === 'BUSINESS' ? 'Enterprise' : activeTier}. Choose the next tier to upgrade.
              </Text>
            ) : null}

            {planCards.some((card) => card.kind === 'tier') ? (
              <View className="self-center rounded-xl bg-gray-100 p-1 dark:bg-zinc-900">
                <View className="flex-row gap-1">
                {(['Monthly', 'Yearly'] as const).map((period) => (
                  <TouchableOpacity
                    key={period}
                    onPress={() => setBilling(period)}
                    accessibilityRole="button"
                    className={cn(
                      'rounded-lg px-4 py-2',
                      billing === period ? 'bg-white shadow-sm dark:bg-zinc-700' : '',
                    )}
                  >
                    <Text
                      className={cn(
                        'text-[14px] font-semibold',
                        billing === period ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-zinc-400',
                      )}
                    >
                      {period}
                    </Text>
                  </TouchableOpacity>
                ))}
                </View>
              </View>
            ) : null}

            <View className="gap-3">
              {planCards.map((card, index) => {
                const selected = index === activeIndex;
                const product = card.plan
                  ? PRODUCTS.find((item) => item.plan === card.plan && item.period === billing)
                  : undefined;
                const storePrice = product ? productPrice(product.id) : null;
                return (
                  <TouchableOpacity
                    key={card.key}
                    activeOpacity={0.9}
                    onPress={() => setSelectedIndex(index)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    className={cn(
                      'rounded-2xl p-5',
                      selected ? 'bg-emerald-50 dark:bg-emerald-950' : 'bg-gray-50 dark:bg-[#18181B]',
                    )}
                  >
                    <View className="flex-row items-start justify-between">
                      <View className="flex-1">
                        <Text className="text-[11px] font-bold uppercase tracking-widest text-gray-500 dark:text-zinc-400">
                          {card.kicker}
                        </Text>
                        <Text className="mt-1 text-[22px] font-extrabold text-gray-900 dark:text-white">{card.title}</Text>
                      </View>
                    </View>
                    {/* iOS headlines the App Store's own localized price; elsewhere the Paystack price. */}
                    {product && (OFFER_WEB_CHECKOUT || storePrice) ? (
                      <Text className="mt-2 text-[16px] font-bold text-gray-900 dark:text-white">
                        {OFFER_WEB_CHECKOUT ? product.price : storePrice}
                      </Text>
                    ) : null}
                    <View className="my-4 h-px bg-gray-100 dark:bg-zinc-700" />
                    <View className="gap-3">
                      {card.features.map((feature) => (
                        <View key={feature} className="flex-row gap-3">
                          <Text className="text-[14px] font-bold text-emerald-700 dark:text-emerald-400">✓</Text>
                          <Text className="flex-1 text-[14px] text-gray-700 dark:text-zinc-300">{feature}</Text>
                        </View>
                      ))}
                    </View>
                    {storePrice && OFFER_WEB_CHECKOUT ? (
                      <Text className="mt-3 text-xs text-gray-500 dark:text-zinc-400">
                        In-app store price: {storePrice}
                      </Text>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </View>

            {OFFER_WEB_CHECKOUT && selectedCard?.kind === 'tier' && selectedProduct ? (
              <TouchableOpacity
                className="w-full items-center rounded-xl bg-emerald-700 py-4"
                disabled={isBusy}
                onPress={() => void beginWebPurchase(selectedProduct.paystackPurpose)}
              >
                <Text className="text-base font-bold text-white">Pay on web with Paystack</Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              className={cn(
                'w-full items-center rounded-xl bg-black py-4 dark:bg-white',
                ctaDisabled && 'opacity-50',
              )}
              disabled={ctaDisabled}
              onPress={() => {
                if (!selectedCard) return;
                if (selectedCard.kind === 'basic') {
                  void activateExistingSubscription();
                } else if (selectedCard.kind === 'tier') {
                  if (selectedProduct) void beginPurchase(selectedProduct.id);
                } else {
                  void Linking.openURL('mailto:support@scancode.ng?subject=ScanCode%20Ultimate');
                }
              }}
            >
              <Text className="text-base font-bold text-white dark:text-black">{ctaLabel}</Text>
            </TouchableOpacity>

            {products.length === 0 ? (
              <Text className="text-center text-xs text-gray-500 dark:text-zinc-400">
                {OFFER_WEB_CHECKOUT
                  ? `${STORE_NAME} in-app purchases are unavailable right now. Pay on web with Paystack instead.`
                  : 'App Store subscriptions are not available right now. Please try again later.'}
              </Text>
            ) : null}

            <Text className="text-center text-[11px] leading-4 text-gray-500 dark:text-zinc-500">
              {OFFER_WEB_CHECKOUT
                ? 'Paystack web payments cover the selected period and do not renew automatically. In-app subscriptions renew through Google Play.'
                : 'Subscriptions renew automatically until cancelled in your Apple ID settings at least 24 hours before the end of the current period.'}
            </Text>
            <View className="flex-row items-center justify-center gap-3">
              <Text
                className="text-xs text-gray-600 underline dark:text-zinc-400"
                onPress={() => navigation.navigate('TermsOfService')}
              >
                Terms of Use
              </Text>
              <Text className="text-xs text-gray-400 dark:text-zinc-600">•</Text>
              <Text
                className="text-xs text-gray-600 underline dark:text-zinc-400"
                onPress={() => navigation.navigate('PrivacyPolicy')}
              >
                Privacy Policy
              </Text>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
