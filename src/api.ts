import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { demoEngine } from './demo/demoEngine';
import type { WeeklyEvents, ProductInput, AccessPage, AccessPageType, AccessPageField, AccessPageGuestEntry } from './types';

// Real deployments must set EXPO_PUBLIC_API_BASE (see .env.example). Falls back to a
// local LAN IP suited for on-device development against a backend on the same network.
export const API_BASE = process.env.EXPO_PUBLIC_API_BASE ?? 'http://192.168.1.155:8082';
const TOKEN_KEY = 'scancode_token';

// Demo mode defaults on for local development convenience and off for production builds.
// A previously-persisted user choice (see setGlobalDemoMode) still overrides this once
// demoEngine finishes loading — see the init() call below.
export let ENABLE_DEMO_MODE = __DEV__;

export function setGlobalDemoMode(enabled: boolean) {
  ENABLE_DEMO_MODE = enabled;
  demoEngine.setDemoModeEnabled(enabled);
}

// Ensure demo engine initializes asynchronously
demoEngine.init().then(() => {
  ENABLE_DEMO_MODE = demoEngine.isDemoModeEnabled();
});

// ─── Cross-platform secure storage ──────────────────────────────────────────
// expo-secure-store has no web implementation, so web falls back to AsyncStorage.
// (Not a substitute for real secure storage on web — there isn't one available here —
// just parity so auth doesn't silently break on web builds.)

async function setSecureItem(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    await AsyncStorage.setItem(key, value);
  } else {
    await SecureStore.setItemAsync(key, value);
  }
}

async function getSecureItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return AsyncStorage.getItem(key);
  }
  return SecureStore.getItemAsync(key);
}

async function deleteSecureItem(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    await AsyncStorage.removeItem(key);
  } else {
    await SecureStore.deleteItemAsync(key);
  }
}

// ─── Token helpers ───────────────────────────────────────────────────────────

export async function saveToken(token: string): Promise<void> {
  await setSecureItem(TOKEN_KEY, token);
}

export async function getToken(): Promise<string | null> {
  if (ENABLE_DEMO_MODE) {
    const role = demoEngine.getActiveRole();
    if (role === 'logged_out') return null;
    return role === 'admin' ? 'demo-jwt-token-admin-999' : 'demo-jwt-token-customer-111';
  }
  return getSecureItem(TOKEN_KEY);
}

export async function deleteToken(): Promise<void> {
  if (ENABLE_DEMO_MODE) {
    await demoEngine.setActiveRole('logged_out');
    return;
  }
  await deleteSecureItem(TOKEN_KEY);
}

// ─── Session expiry notification ────────────────────────────────────────────
// request() below calls this on any 401 so a single top-level subscriber (App.tsx) can
// log the user out everywhere, instead of every screen needing its own 401 handling.

type UnauthorizedListener = () => void;
const unauthorizedListeners = new Set<UnauthorizedListener>();

export function onUnauthorized(listener: UnauthorizedListener): () => void {
  unauthorizedListeners.add(listener);
  return () => unauthorizedListeners.delete(listener);
}

// ─── HTTP helper ─────────────────────────────────────────────────────────────

async function parseJsonBody<T>(res: Response): Promise<T> {
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  requireAuth = true,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // `requireAuth` only ever meant "this endpoint also works logged-out" — it was
  // incorrectly gating whether a token got attached at all. That meant a *logged-in* user
  // hitting a requireAuth:false endpoint (e.g. the storefront directory) sent no
  // Authorization header and got a 401 from any backend that treats "public GET" as
  // "public, but personalize if you happen to be authenticated." Confirmed live against
  // the real backend (api.scancode.ng) 2026-08-31 — always attach the token when one
  // exists, regardless of requireAuth; only skip attaching it when there isn't one.
  const token = await getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    if (res.status === 401) {
      unauthorizedListeners.forEach((listener) => listener());
    }
    let message = `HTTP ${res.status}`;
    try {
      const err = await parseJsonBody<{ message?: string; error?: string }>(res);
      message = err?.message ?? err?.error ?? message;
    } catch {
      // ignore parse errors
    }
    throw new Error(message);
  }

  return parseJsonBody<T>(res);
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AuthResponse {
  token: string;
  username: string;
  email: string;
  roles: string[];
  isPaid: boolean;
}

export interface MeResponse {
  id: number;
  username: string;
  email: string;
  roles: string[];
  isPaid: boolean;
}

export interface StorefrontResponse {
  id: number;
  userId: number;
  businessType: string;
  slug: string;
  publicUrl: string;
  name: string;
  description: string;
  logoUrl: string | null;
  bannerUrl: string | null;
  data: unknown;
  active: boolean;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductResponse {
  id: number;
  storefrontId: number;
  name: string;
  description: string;
  price: number;
  stock: number;
  isDelisted: boolean;
  mediaUrls: string[];
  category: string;
  isPopular: boolean;
  viewCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface StoreConfigResponse {
  id: number | null;
  storefrontId: number;
  // Canonical representation is a fraction (0.075 = 7.5%), not a percent.
  // Consumers should still defensively normalize (`rate > 1 ? rate / 100 : rate`)
  // since this value can come from a real, less-trusted backend.
  vatRate: number;
  deliveryFee: number;
  waiterPhone?: string | null;
  callEntities?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface TableVerifyResponse {
  valid: boolean;
  label: string | null;
  tableCode: string | null;
}

export interface OrderResponse {
  id: number;
  storefrontId: number;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  orderItems: string;
  subtotal: number;
  vat: number;
  delivery: number;
  total: number;
  tableCode: string | null;
  tableLabel: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentInitResponse {
  authorizationUrl: string;
  reference: string;
}

export interface PaymentVerifyResponse {
  verified: boolean;
  createdSlug: string | null;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export function login(email: string, password: string, rememberMe = false) {
  if (ENABLE_DEMO_MODE) {
    return demoEngine.login(email);
  }
  return request<AuthResponse>('POST', '/api/auth/login', { email, password, rememberMe }, false);
}

export interface RegisterResponse {
  message: string;
}

export type AccountRole = 'vendor' | 'customer';

export function register(username: string, email: string, password: string, role: AccountRole) {
  if (ENABLE_DEMO_MODE) {
    return Promise.resolve({ message: 'Registration successful! (Demo Mode)' });
  }
  return request<RegisterResponse>('POST', '/auth/register', { username, email, password, role }, false);
}

export function verifyOtp(email: string, otp: string) {
  if (ENABLE_DEMO_MODE) {
    return Promise.resolve({ message: 'OTP verified! (Demo Mode)' });
  }
  return request<{ message: string }>('POST', '/auth/verify-otp', { email, otp }, false);
}

export function resendOtp(email: string) {
  if (ENABLE_DEMO_MODE) {
    return Promise.resolve({ message: 'OTP resent! (Demo Mode)' });
  }
  return request<{ message: string }>('POST', '/auth/resend-otp', { email }, false);
}

export function forgotPassword(email: string) {
  if (ENABLE_DEMO_MODE) {
    return Promise.resolve({ message: 'Password reset link sent! (Demo Mode)' });
  }
  return request<{ message: string }>('POST', '/auth/forgot-password', { email }, false);
}

export function getMe() {
  if (ENABLE_DEMO_MODE) {
    return demoEngine.getMe();
  }
  return request<MeResponse>('GET', '/api/auth/me');
}

// Permanently deletes the signed-in user's account and all associated data (App Store
// Guideline 5.1.1(v) requires this for any app that supports account creation). Endpoint
// path is a best-guess following this backend's existing `/api/auth/me` convention for
// "the current user" — NOT confirmed against real API docs (none were available). Verify
// against the actual backend before shipping; if the path differs, this is the one line
// to change.
export function deleteAccount(): Promise<void> {
  if (ENABLE_DEMO_MODE) {
    return demoEngine.deleteAccount();
  }
  return request<void>('DELETE', '/api/auth/me');
}

// ─── Storefronts ─────────────────────────────────────────────────────────────

export interface CreateStorefrontBody {
  businessType: string;
  name: string;
  description: string;
  logoUrl?: string;
  bannerUrl?: string;
  data?: unknown;
}

export function createStorefront(body: CreateStorefrontBody) {
  if (ENABLE_DEMO_MODE) {
    return demoEngine.createStorefront(body);
  }
  return request<StorefrontResponse>('POST', '/api/business/storefronts', body);
}

export function updateStorefront(storefrontId: number, body: Partial<CreateStorefrontBody>) {
  if (ENABLE_DEMO_MODE) {
    return demoEngine.updateStorefront(storefrontId, body);
  }
  return request<StorefrontResponse>('PUT', `/api/business/storefronts/${storefrontId}`, body);
}

export function getMyStorefronts() {
  if (ENABLE_DEMO_MODE) {
    return demoEngine.getMyStorefronts();
  }
  return request<StorefrontResponse[]>('GET', '/api/business/storefronts/my');
}

export function getStorefrontBySlug(slug: string) {
  if (ENABLE_DEMO_MODE) {
    return demoEngine.getStorefrontBySlug(slug);
  }
  return request<StorefrontResponse>('GET', `/api/business/storefronts/${encodeURIComponent(slug)}`, undefined, false);
}

// All published storefronts across every vendor — the customer/vendor discovery directory.
// Distinct from getMyStorefronts(), which is scoped to the signed-in vendor's own stores.
export function getAllStorefronts() {
  if (ENABLE_DEMO_MODE) {
    return demoEngine.getAllStorefronts();
  }
  return request<StorefrontResponse[]>('GET', '/api/business/storefronts', undefined, false);
}

export interface StorefrontRating {
  storefrontId: number;
  average: number;
  count: number;
}

export function getStorefrontRatings(): Promise<StorefrontRating[]> {
  if (ENABLE_DEMO_MODE) {
    return demoEngine.getStorefrontRatings();
  }
  return request<StorefrontRating[]>('GET', '/api/business/storefronts/ratings', undefined, false);
}

export function getProducts(storefrontId: number) {
  if (ENABLE_DEMO_MODE) {
    return demoEngine.getProducts(storefrontId);
  }
  return request<ProductResponse[]>('GET', `/api/storefronts/${storefrontId}/products`, undefined, false);
}

export function getPopularProducts(storefrontId: number) {
  if (ENABLE_DEMO_MODE) {
    return demoEngine.getPopularProducts(storefrontId);
  }
  return request<ProductResponse[]>('GET', `/api/storefronts/${storefrontId}/products/popular`, undefined, false);
}

export function trackProductView(storefrontId: number, productId: number) {
  if (ENABLE_DEMO_MODE) {
    return Promise.resolve();
  }
  return request<void>('POST', `/api/storefronts/${storefrontId}/products/${productId}/view`, undefined, false);
}

export function createProduct(storefrontId: number, body: ProductInput) {
  if (ENABLE_DEMO_MODE) {
    return demoEngine.createProduct(storefrontId, body);
  }
  return request<ProductResponse>('POST', `/api/storefronts/${storefrontId}/products`, body);
}

export function updateProduct(storefrontId: number, productId: number, body: Partial<ProductInput> & { isDelisted?: boolean }) {
  if (ENABLE_DEMO_MODE) {
    return demoEngine.updateProduct(storefrontId, productId, body);
  }
  return request<ProductResponse>('PUT', `/api/storefronts/${storefrontId}/products/${productId}`, body);
}

export function deleteProduct(storefrontId: number, productId: number) {
  if (ENABLE_DEMO_MODE) {
    return demoEngine.deleteProduct(storefrontId, productId);
  }
  return request<void>('DELETE', `/api/storefronts/${storefrontId}/products/${productId}`);
}

export function getStoreConfig(storefrontId: number) {
  if (ENABLE_DEMO_MODE) {
    return demoEngine.getStoreConfig(storefrontId);
  }
  return request<StoreConfigResponse>('GET', `/api/storefronts/${storefrontId}/config`, undefined, false);
}

export function verifyStoreTable(storefrontId: number, code: string) {
  if (ENABLE_DEMO_MODE) {
    return demoEngine.verifyStoreTable(storefrontId, code);
  }
  return request<TableVerifyResponse>(
    'GET',
    `/api/storefronts/${storefrontId}/tables/verify?code=${encodeURIComponent(code)}`,
    undefined,
    false,
  );
}

export interface CreateOrderBody {
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  items: { id: string; name: string; qty: number; price: number }[];
  subtotal: number;
  vat: number;
  delivery: number;
  total: number;
  tableCode?: string;
}

export function createOrder(storefrontId: number, body: CreateOrderBody) {
  if (ENABLE_DEMO_MODE) {
    return demoEngine.createOrder(storefrontId, body);
  }
  return request<OrderResponse>('POST', `/api/storefronts/${storefrontId}/orders`, body, false);
}

export function getOrders(storefrontId?: number) {
  if (ENABLE_DEMO_MODE) {
    return demoEngine.getOrders(storefrontId);
  }
  return request<OrderResponse[]>('GET', storefrontId ? `/api/storefronts/${storefrontId}/orders` : '/api/orders');
}

export function updateOrderStatus(storefrontId: number, orderId: number, status: string) {
  if (ENABLE_DEMO_MODE) {
    return demoEngine.updateOrderStatus(orderId, status);
  }
  return request<OrderResponse>('PATCH', `/api/storefronts/${storefrontId}/orders/${orderId}/status`, { status });
}

export function getOrderById(storefrontId: number, orderId: number) {
  if (ENABLE_DEMO_MODE) {
    return demoEngine.getOrderById(orderId);
  }
  return request<OrderResponse>('GET', `/api/storefronts/${storefrontId}/orders/${orderId}`, undefined, false);
}

// ─── Weekly Events (per-storefront) ────────────────────────────────────────

export function getStorefrontEvents(storefrontId: number) {
  if (ENABLE_DEMO_MODE) {
    return demoEngine.getStorefrontEvents(storefrontId);
  }
  return request<WeeklyEvents>('GET', `/api/storefronts/${storefrontId}/events`, undefined, false);
}

export function updateStorefrontEvents(storefrontId: number, weeklyEvents: WeeklyEvents) {
  if (ENABLE_DEMO_MODE) {
    return demoEngine.updateStorefrontEvents(storefrontId, weeklyEvents);
  }
  return request<WeeklyEvents>('PUT', `/api/storefronts/${storefrontId}/events`, { weeklyEvents });
}

export interface WaiterCallBody {
  tableNumber: string;
  callTarget: string;
  message?: string;
}

export function createWaiterCall(storefrontId: number, body: WaiterCallBody) {
  if (ENABLE_DEMO_MODE) {
    return Promise.resolve({ id: Date.now() });
  }
  return request<{ id: number }>('POST', `/api/storefronts/${storefrontId}/waiter-calls`, body, false);
}

export type StoreRequestType = 'SHOUTOUT' | 'SONG' | 'KARAOKE';

export function createStoreRequest(storefrontId: number, body: {
  requestType: StoreRequestType;
  details: string;
  amount: number;
}) {
  if (ENABLE_DEMO_MODE) {
    return Promise.resolve({ id: Date.now() });
  }
  return request<{ id: number }>('POST', `/api/storefronts/${storefrontId}/requests`, body, false);
}

export function createStoreTip(storefrontId: number, body: {
  recipient: string;
  customRecipient?: string | null;
  amount: number;
}) {
  if (ENABLE_DEMO_MODE) {
    return Promise.resolve({ id: Date.now() });
  }
  return request<{ id: number }>('POST', `/api/storefronts/${storefrontId}/tips`, body, false);
}

export function createStoreFeedback(storefrontId: number, body: {
  rating: number;
  description: string;
}) {
  if (ENABLE_DEMO_MODE) {
    return demoEngine.createStoreFeedback(storefrontId, body.rating, body.description);
  }
  return request<{ id: number }>('POST', `/api/storefronts/${storefrontId}/feedbacks`, body, false);
}

// ─── Payments ────────────────────────────────────────────────────────────────

export type PaymentPurpose = 'STOREFRONT_CREATION' | 'EVENT_CREATION';

export function initializePayment(purpose: PaymentPurpose, slug: string) {
  if (ENABLE_DEMO_MODE) {
    return Promise.resolve({
      authorizationUrl: 'https://demo.paystack.co/pay/demo-ref-123',
      reference: `demo-ref-${Date.now()}`,
    });
  }
  return request<PaymentInitResponse>('POST', '/api/payments/initialize', {
    purpose,
    payload: JSON.stringify({ slug }),
  });
}

export function verifyPayment(reference: string) {
  if (ENABLE_DEMO_MODE) {
    return Promise.resolve({
      verified: true,
      createdSlug: 'lagos-grill',
    });
  }
  return request<PaymentVerifyResponse>('POST', '/api/payments/verify', { reference });
}

export interface UpdateStoreConfigBody {
  // Expected as a fraction (0.075 = 7.5%) — see StoreConfigResponse.vatRate.
  vatRate?: number;
  deliveryFee?: number;
  deliveryEnabled?: boolean;
}

export function updateStoreConfig(storefrontId: number, body: UpdateStoreConfigBody) {
  if (ENABLE_DEMO_MODE) {
    return demoEngine.updateStoreConfig(storefrontId, body);
  }
  return request<StoreConfigResponse>('PUT', `/api/storefronts/${storefrontId}/config`, body);
}

export interface BusinessProfileData {
  name?: string;
  bankName?: string;
  accountName?: string;
  accountNumber?: string;
}

export async function saveBusinessProfileData(data: BusinessProfileData): Promise<void> {
  if (ENABLE_DEMO_MODE) {
    return demoEngine.saveBusinessProfileData(data);
  }
  const existing = await AsyncStorage.getItem('global_business_profile');
  const parsed = existing ? JSON.parse(existing) : {};
  const updated = { ...parsed, ...data };
  await AsyncStorage.setItem('global_business_profile', JSON.stringify(updated));
}

export async function getBusinessProfileData(): Promise<BusinessProfileData> {
  if (ENABLE_DEMO_MODE) {
    return demoEngine.getBusinessProfileData();
  }
  const existing = await AsyncStorage.getItem('global_business_profile');
  return existing ? JSON.parse(existing) : {};
}

// ─── Toolbar Activity (Admin) ──────────────────────────────────────────

export interface WaiterCallRecord {
  id: number;
  storefrontId: number;
  tableNumber: string;
  callTarget: string;
  message: string;
  status: 'PENDING' | 'ACKNOWLEDGED';
  createdAt: string;
}

export interface StoreRequestRecord {
  id: number;
  storefrontId: number;
  requestType: 'SHOUTOUT' | 'SONG' | 'KARAOKE';
  details: string;
  amount: number;
  status: 'PENDING' | 'ACKNOWLEDGED';
  createdAt: string;
}

export interface TipRecord {
  id: number;
  storefrontId: number;
  recipient: string;
  customRecipient: string | null;
  amount: number;
  status: 'PENDING' | 'ACKNOWLEDGED';
  createdAt: string;
}

export function getStorefrontWaiterCalls(storefrontId: number): Promise<WaiterCallRecord[]> {
  if (ENABLE_DEMO_MODE) {
    return demoEngine.getWaiterCalls(storefrontId) as Promise<WaiterCallRecord[]>;
  }
  return request<WaiterCallRecord[]>('GET', `/api/storefronts/${storefrontId}/waiter-calls`);
}

export function getStorefrontRequests(storefrontId: number): Promise<StoreRequestRecord[]> {
  if (ENABLE_DEMO_MODE) {
    return demoEngine.getStoreRequests(storefrontId) as Promise<StoreRequestRecord[]>;
  }
  return request<StoreRequestRecord[]>('GET', `/api/storefronts/${storefrontId}/requests`);
}

export function getStorefrontTips(storefrontId: number): Promise<TipRecord[]> {
  if (ENABLE_DEMO_MODE) {
    return demoEngine.getTips(storefrontId) as Promise<TipRecord[]>;
  }
  return request<TipRecord[]>('GET', `/api/storefronts/${storefrontId}/tips`);
}

export function acknowledgeWaiterCall(storefrontId: number, callId: number): Promise<void> {
  if (ENABLE_DEMO_MODE) {
    return demoEngine.acknowledgeWaiterCall(callId);
  }
  return request<void>('PATCH', `/api/storefronts/${storefrontId}/waiter-calls/${callId}/acknowledge`);
}

export function acknowledgeStoreRequest(storefrontId: number, requestId: number): Promise<void> {
  if (ENABLE_DEMO_MODE) {
    return demoEngine.acknowledgeStoreRequest(requestId);
  }
  return request<void>('PATCH', `/api/storefronts/${storefrontId}/requests/${requestId}/acknowledge`);
}

export function acknowledgeTip(storefrontId: number, tipId: number): Promise<void> {
  if (ENABLE_DEMO_MODE) {
    return demoEngine.acknowledgeTip(tipId);
  }
  return request<void>('PATCH', `/api/storefronts/${storefrontId}/tips/${tipId}/acknowledge`);
}

// ─── Access Pages (event pages / guest check-in / exclusive content) ───────

export interface CreateAccessPageBody {
  type: AccessPageType;
  title: string;
  description?: string;
  fields: AccessPageField[];
  exclusiveContent?: string;
}

export function getAccessPages(storefrontId: number): Promise<AccessPage[]> {
  if (ENABLE_DEMO_MODE) {
    return demoEngine.getAccessPages(storefrontId);
  }
  return request<AccessPage[]>('GET', `/api/storefronts/${storefrontId}/access-pages`);
}

export function createAccessPage(storefrontId: number, body: CreateAccessPageBody): Promise<AccessPage> {
  if (ENABLE_DEMO_MODE) {
    return demoEngine.createAccessPage(storefrontId, body);
  }
  return request<AccessPage>('POST', `/api/storefronts/${storefrontId}/access-pages`, body);
}

export function updateAccessPage(accessPageId: number, body: Partial<CreateAccessPageBody> & { isActive?: boolean }): Promise<AccessPage> {
  if (ENABLE_DEMO_MODE) {
    return demoEngine.updateAccessPage(accessPageId, body);
  }
  return request<AccessPage>('PUT', `/api/access-pages/${accessPageId}`, body);
}

export function deleteAccessPage(accessPageId: number): Promise<void> {
  if (ENABLE_DEMO_MODE) {
    return demoEngine.deleteAccessPage(accessPageId);
  }
  return request<void>('DELETE', `/api/access-pages/${accessPageId}`);
}

export function getAccessPageBySlug(slug: string): Promise<AccessPage> {
  if (ENABLE_DEMO_MODE) {
    return demoEngine.getAccessPageBySlug(slug);
  }
  return request<AccessPage>('GET', `/api/access-pages/slug/${encodeURIComponent(slug)}`, undefined, false);
}

export function submitAccessPageGuestEntry(accessPageId: number, responses: Record<string, string>): Promise<AccessPageGuestEntry> {
  if (ENABLE_DEMO_MODE) {
    return demoEngine.submitAccessPageGuestEntry(accessPageId, responses);
  }
  return request<AccessPageGuestEntry>('POST', `/api/access-pages/${accessPageId}/guests`, { responses }, false);
}

export function getAccessPageGuests(accessPageId: number): Promise<AccessPageGuestEntry[]> {
  if (ENABLE_DEMO_MODE) {
    return demoEngine.getAccessPageGuests(accessPageId);
  }
  return request<AccessPageGuestEntry[]>('GET', `/api/access-pages/${accessPageId}/guests`);
}

// ─── Push notifications ──────────────────────────────────────────────────────
// Registers this device's Expo push token so a real backend can send order alerts
// even when the app is backgrounded/closed. In demo mode this is a no-op — there's
// no server to receive it — but the client-side permission/token flow still runs
// (see src/utils/pushNotifications.ts), so the plumbing is proven and ready.

export function registerPushToken(token: string) {
  if (ENABLE_DEMO_MODE) {
    return Promise.resolve();
  }
  return request<void>('POST', '/api/notifications/register', { token });
}
