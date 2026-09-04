import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import type {
  WeeklyEvents,
  ProductInput,
  AccessPage,
  AccessPageType,
  AccessPageField,
  AccessPageGuestEntry,
} from './types';

export function resolveApiBase(): string {
  let base = process.env.EXPO_PUBLIC_API_BASE ?? 'http://localhost:8082';
  if (Platform.OS === 'android') {
    base = base.replace('://localhost', '://10.0.2.2').replace('://127.0.0.1', '://10.0.2.2');
  }
  return base;
}

export const API_BASE = resolveApiBase();
const TOKEN_KEY = 'scancode_token';

// ─── Cross-platform secure storage ──────────────────────────────────────────
// expo-secure-store has no web implementation, so web falls back to AsyncStorage.

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
  return getSecureItem(TOKEN_KEY);
}

export async function deleteToken(): Promise<void> {
  await deleteSecureItem(TOKEN_KEY);
}

// ─── Session expiry notification ────────────────────────────────────────────
// request() below calls this on any 401 when an active token was present so a
// single top-level subscriber (App.tsx) can log the user out everywhere.

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
  const token = await getToken();
  if (requireAuth && !token) {
    throw new Error('Authentication required');
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    if (res.status === 401 && requireAuth && token) {
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

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES — synchronized against api.scancode.ng Swagger (OAS 3.1)
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Shared ───────────────────────────────────────────────────────────────────

export type BusinessType =
  | 'RESTAURANT'
  | 'EVENT'
  | 'PRODUCT'
  | 'BUSINESSCARD'
  | 'HOTEL'
  | string;

// ─── Auth ─────────────────────────────────────────────────────────────────────

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

export interface RegisterResponse {
  message: string;
}

export type AccountRole = 'vendor' | 'customer';

// ─── Storefronts ──────────────────────────────────────────────────────────────

/** Matches BusinessStorefrontResponse from Swagger */
export interface StorefrontResponse {
  id: number;
  userId: number;
  businessType: BusinessType;
  slug: string;
  publicUrl: string;
  name: string;
  description: string;
  logoUrl: string | null;
  bannerUrl: string | null;
  data: any;
  active: boolean;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StorefrontRating {
  storefrontId: number;
  average: number;
  count: number;
}

// ─── Products ─────────────────────────────────────────────────────────────────

/** Matches ProductResponse from Swagger */
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

// ─── Store Config ─────────────────────────────────────────────────────────────

/**
 * Matches StoreConfigResponse from Swagger.
 * vatRate is a PERCENTAGE (e.g. 7.5 = 7.5%), NOT a fraction.
 * Always pass vatRate as percentage (0–100) to updateStoreConfig().
 */
export interface StoreConfigResponse {
  id: number | null;
  storefrontId: number;
  vatRate: number;
  deliveryFee: number;
  waiterPhone?: string | null;
  callEntities?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface UpdateStoreConfigBody {
  /** Percentage (0–100). E.g. pass 7.5 for 7.5% VAT. */
  vatRate?: number;
  deliveryFee?: number;
  deliveryEnabled?: boolean;
  waiterPhone?: string;
  callEntities?: string[];
}

// ─── Tables ───────────────────────────────────────────────────────────────────

/** Matches TableVerifyResponse from Swagger */
export interface TableVerifyResponse {
  valid: boolean;
  label: string | null;
  tableCode: string | null;
}

/** Matches StoreTableResponse from Swagger */
export interface StoreTableResponse {
  id: number;
  storefrontId: number;
  label: string;
  tableCode: string;
  createdAt: string;
}

// ─── Orders ───────────────────────────────────────────────────────────────────

/** Matches OrderResponse from Swagger */
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

// ─── Payments ─────────────────────────────────────────────────────────────────

/** Matches InitializePaymentResponse from Swagger */
export interface PaymentInitResponse {
  authorizationUrl: string;
  reference: string;
}

/** Matches VerifyPaymentResponse from Swagger */
export interface PaymentVerifyResponse {
  verified: boolean;
  createdSlug: string | null;
}

export type PaymentPurpose = 'STOREFRONT_CREATION' | 'EVENT_CREATION';

// ─── Waiter Calls ─────────────────────────────────────────────────────────────

export interface WaiterCallBody {
  tableNumber: string;
  callTarget: string;
  message?: string;
}

/**
 * Matches WaiterCallResponse from Swagger.
 * Supports both isRead (boolean) and legacy status.
 */
export interface WaiterCallRecord {
  id: number;
  storefrontId: number;
  tableNumber: string;
  callTarget: string;
  message: string;
  isRead: boolean;
  status: 'PENDING' | 'ACKNOWLEDGED';
  createdAt: string;
}

export interface WaiterNumberResponse {
  waiterPhone: string;
}

// ─── Interactions (Tips, Requests, Feedback) ──────────────────────────────────

export type StoreRequestType = 'SHOUTOUT' | 'SONG' | 'KARAOKE';

/** Matches StoreRequest from Swagger with status support for UI badges */
export interface StoreRequestRecord {
  id: number;
  storefrontId: number;
  requestType: StoreRequestType;
  details: string;
  amount: number;
  status: 'PENDING' | 'ACKNOWLEDGED';
  createdAt: string;
}

/** Matches StoreTip from Swagger with status support for UI badges */
export interface TipRecord {
  id: number;
  storefrontId: number;
  recipient: string;
  customRecipient: string | null;
  amount: number;
  status: 'PENDING' | 'ACKNOWLEDGED';
  createdAt: string;
}

/** Matches StoreFeedback from Swagger */
export interface FeedbackRecord {
  id: number;
  storefrontId: number;
  rating: number;
  description: string;
  createdAt: string;
}

// ─── Event Details & Registration Form ───────────────────────────────────────

export type EventType =
  | 'CONCERT'
  | 'CONFERENCE'
  | 'WEDDING'
  | 'BIRTHDAY'
  | 'CORPORATE'
  | 'SPORT'
  | 'OTHER';

/** Matches EventDetailsResponse from Swagger */
export interface EventDetailsResponse {
  id: number;
  storefrontId: number;
  eventType: EventType;
  eventDate: string;
  venue: string;
  checkInEnabled: boolean;
  contentUnlockEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EventDetailsRequest {
  eventType: EventType;
  eventDate: string;
  venue: string;
  checkInEnabled?: boolean;
  contentUnlockEnabled?: boolean;
}

/** A single field in a registration form — matches FormField from Swagger */
export interface FormField {
  key: string;
  label: string;
  type: 'TEXT' | 'EMAIL' | 'PHONE' | 'SELECT' | 'CHECKBOX' | 'TEXTAREA' | 'DATE';
  required: boolean;
  options?: string[];
  placeholder?: string;
}

/** Matches RegistrationFormResponse from Swagger */
export interface RegistrationFormResponse {
  storefrontId: number;
  eventType: EventType | null;
  title: string;
  description: string;
  fields: FormField[];
  ticketTiers: string[];
  isOpen: boolean;
  isSaved: boolean;
  updatedAt: string;
}

export interface RegistrationFormRequest {
  eventTypeOverride?: EventType;
  title: string;
  description?: string;
  fields: FormField[];
  ticketTiers: string[];
  isOpen?: boolean;
}

// ─── Guests & Check-in ────────────────────────────────────────────────────────

/** Matches GuestResponse from Swagger */
export interface GuestResponse {
  id: number;
  storefrontId: number;
  name: string;
  email: string;
  phone: string;
  ticketTier: string;
  guestCode: string;
  checkedIn: boolean;
  checkedInAt: string | null;
  responses: Record<string, string>;
  createdAt: string;
}

export interface GuestRsvpRequest {
  name: string;
  email: string;
  phone: string;
  ticketTier: string;
  responses?: Record<string, string>;
}

/** Matches GuestRsvpResponse from Swagger */
export interface GuestRsvpResponse {
  id: number;
  name: string;
  ticketTier: string;
  createdAt: string;
}

/** Matches CheckInResponse from Swagger */
export interface CheckInResponse {
  alreadyCheckedIn: boolean;
  guestName: string;
  ticketTier: string;
  checkedInAt: string;
}

// ─── Front Desk (Hotel / Venue Registration) ──────────────────────────────────

export type FrontDeskIdType = 'NIN' | 'PASSPORT' | 'DRIVERS_LICENSE' | 'VOTERS_CARD' | 'OTHER';
export type FrontDeskGuestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CHECKED_IN';
export type FrontDeskVerificationMethod = 'PHONE_OTP' | 'MANUAL';

/** Matches FrontDeskGuestRegistrationRequest from Swagger */
export interface FrontDeskGuestRegistrationRequest {
  fullName: string;
  email: string;
  phone: string;
  nationality: string;
  numberOfGuests: number;
  expectedCheckIn: string;
  expectedCheckOut: string;
  roomPreference?: string;
  specialRequests?: string;
  idType: FrontDeskIdType;
  idNumber: string;
  idDocumentUrl: string;
  selfieUrl?: string;
}

/** Matches FrontDeskGuestResponse from Swagger */
export interface FrontDeskGuestResponse {
  id: number;
  storefrontId: number;
  guestCode: string;
  fullName: string;
  email: string;
  phone: string;
  nationality: string;
  numberOfGuests: number;
  expectedCheckIn: string;
  expectedCheckOut: string;
  roomPreference: string | null;
  specialRequests: string | null;
  idType: FrontDeskIdType;
  idNumber: string;
  idDocumentUrl: string;
  selfieUrl: string | null;
  verificationMethod: FrontDeskVerificationMethod;
  status: FrontDeskGuestStatus;
  rejectionReason: string | null;
  createdAt: string;
  reviewedAt: string | null;
}

// ─── Access Content ───────────────────────────────────────────────────────────

/** Matches AccessContentResponse from Swagger (admin view) */
export interface AccessContentResponse {
  id: number;
  storefrontId: number;
  title: string;
  body: string;
  requiresCheckIn: boolean;
  createdAt: string;
}

/** Matches PublicAccessContentResponse from Swagger (customer view) */
export interface PublicAccessContentResponse {
  id: number;
  title: string;
  requiresCheckIn: boolean;
  unlocked: boolean;
  body: string;
}

export interface AccessContentRequest {
  title: string;
  body: string;
  requiresCheckIn?: boolean;
}

// ─── Event Type Catalog ───────────────────────────────────────────────────────

/** Matches EventTypeSummary from Swagger */
export interface EventTypeSummary {
  value: string;
  label: string;
  description: string;
  icon: string;
}

/** Matches EventTypeTemplate from Swagger */
export interface EventTypeTemplate {
  value: string;
  label: string;
  description: string;
  icon: string;
  suggestedFormTitle: string;
  fields: FormField[];
  ticketTiers: string[];
}

// ─── Business Profile (local-only) ───────────────────────────────────────────

export interface BusinessProfileData {
  name?: string;
  bankName?: string;
  accountName?: string;
  accountNumber?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// API FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Auth ─────────────────────────────────────────────────────────────────────

export async function login(email: string, password: string, rememberMe = false): Promise<AuthResponse> {
  const raw = await request<{
    token: string;
    user?: { id?: number; username?: string; email?: string; roles?: string[]; isPaid?: boolean };
    roles?: string[];
    username?: string;
    email?: string;
    isPaid?: boolean;
  }>('POST', '/api/auth/login', { email, password, rememberMe }, false);

  const u = raw.user;
  const roles = raw.roles ?? u?.roles ?? [];
  const username = raw.username ?? u?.username ?? '';
  const userEmail = raw.email ?? u?.email ?? email;
  const isPaid = raw.isPaid ?? u?.isPaid ?? false;

  return {
    token: raw.token,
    username,
    email: userEmail,
    roles,
    isPaid,
  };
}

export function register(username: string, email: string, password: string, role?: AccountRole) {
  return request<RegisterResponse>('POST', '/auth/register', { username, email, password }, false);
}

export function verifyOtp(email: string, otp: string) {
  return request<{ message: string }>('POST', '/auth/verify-otp', { email, otp }, false);
}

export function resendOtp(email: string) {
  return request<{ message: string }>('POST', '/auth/resend-otp', { email }, false);
}

export function forgotPassword(email: string) {
  return request<{ message: string }>('POST', '/auth/forgot-password', { email }, false);
}

/** Completes a password reset using the token emailed to the user. */
export function resetPassword(token: string, newPassword: string, confirmPassword: string) {
  return request<{ message: string }>('POST', '/auth/reset-password', { token, newPassword, confirmPassword }, false);
}

export function getMe() {
  return request<MeResponse>('GET', '/api/auth/me');
}

// Note: DELETE /api/auth/me is NOT present in the Swagger spec. The demo stub is
// retained for UI flow continuity; confirm the real endpoint before shipping.
export function deleteAccount(): Promise<void> {
  // TODO: Confirm the correct endpoint with the backend team before shipping.
  return request<void>('DELETE', '/api/auth/me');
}

// ─── Storefronts ─────────────────────────────────────────────────────────────

/** Matches BusinessCreateRequest from Swagger */
export interface CreateStorefrontBody {
  businessType: string;
  name: string;
  description: string;
  logoUrl?: string | null;
  bannerUrl?: string | null;
  data?: any;
}

export function createStorefront(body: CreateStorefrontBody) {
  return request<StorefrontResponse>('POST', '/api/business/storefronts', body);
}

/**
 * Updates storefront data fields.
 * Matches PATCH /api/business/storefronts/{id}/data (StorefrontDataUpdateRequest).
 */
export function updateStorefrontData(storefrontId: number, data: Record<string, unknown>) {
  return request<StorefrontResponse>('PATCH', `/api/business/storefronts/${storefrontId}/data`, { data });
}

/**
 * Updates storefront logo URL only.
 * Matches PATCH /api/business/storefronts/{id}/logo (BusinessLogoUpdateRequest).
 */
export function updateStorefrontLogo(storefrontId: number, logoUrl: string) {
  return request<StorefrontResponse>('PATCH', `/api/business/storefronts/${storefrontId}/logo`, { logoUrl });
}

/**
 * Unified storefront update for screen backwards compatibility.
 * Automatically triggers /logo and /data patch endpoints if needed on backend.
 */
export async function updateStorefront(storefrontId: number, body: Partial<CreateStorefrontBody>): Promise<StorefrontResponse> {
  if (body.logoUrl) {
    await updateStorefrontLogo(storefrontId, body.logoUrl);
  }
  if (body.data) {
    return updateStorefrontData(storefrontId, body.data);
  }
  return getStorefrontBySlug(String(storefrontId));
}

export function getMyStorefronts() {
  return request<StorefrontResponse[]>('GET', '/api/business/storefronts/my');
}

export function getStorefrontBySlug(slug: string) {
  return request<StorefrontResponse>('GET', `/api/business/storefronts/${encodeURIComponent(slug)}`, undefined, false);
}

// All published storefronts across every vendor — the customer/vendor discovery directory.
// Distinct from getMyStorefronts(), which is scoped to the signed-in vendor's own stores.
export function getAllStorefronts() {
  return request<StorefrontResponse[]>('GET', '/api/business/storefronts', undefined, false);
}

export function getStorefrontRatings(): Promise<StorefrontRating[]> {
  return request<StorefrontRating[]>('GET', '/api/business/storefronts/ratings', undefined, false);
}

/** Returns the URL for a storefront QR code image. Open in browser or share directly. */
export function getStorefrontQrCodeUrl(storefrontId: number): string {
  return `${API_BASE}/api/business/storefronts/${storefrontId}/qr-code`;
}

/** Returns the URL to trigger a QR code file download. */
export function getStorefrontQrCodeDownloadUrl(storefrontId: number): string {
  return `${API_BASE}/api/business/storefronts/${storefrontId}/qr-code/download`;
}

// ─── Products ─────────────────────────────────────────────────────────────────

export function getProducts(storefrontId: number) {
  return request<ProductResponse[]>('GET', `/api/storefronts/${storefrontId}/products`, undefined, false);
}

/** Returns all products including delisted ones — for admin/vendor views. */
export function getAllProducts(storefrontId: number) {
  return request<ProductResponse[]>('GET', `/api/storefronts/${storefrontId}/products/all`);
}

export function getPopularProducts(storefrontId: number) {
  return request<ProductResponse[]>('GET', `/api/storefronts/${storefrontId}/products/popular`, undefined, false);
}

export function trackProductView(storefrontId: number, productId: number) {
  return request<void>('POST', `/api/storefronts/${storefrontId}/products/${productId}/view`, undefined, false);
}

export function createProduct(storefrontId: number, body: ProductInput) {
  return request<ProductResponse>('POST', `/api/storefronts/${storefrontId}/products`, body);
}

export function updateProduct(storefrontId: number, productId: number, body: Partial<ProductInput> & { isDelisted?: boolean }) {
  return request<ProductResponse>('PUT', `/api/storefronts/${storefrontId}/products/${productId}`, body);
}

export function deleteProduct(storefrontId: number, productId: number) {
  return request<void>('DELETE', `/api/storefronts/${storefrontId}/products/${productId}`);
}

/**
 * Toggles a product's delist status without a full PUT.
 * Matches PATCH /api/storefronts/{id}/products/{id}/toggle-delist.
 */
export function toggleDelistProduct(storefrontId: number, productId: number) {
  return request<ProductResponse>('PATCH', `/api/storefronts/${storefrontId}/products/${productId}/toggle-delist`);
}

/**
 * Creates up to 100 products in a single request.
 * Matches POST /api/storefronts/{id}/products/bulk (BulkProductCreateRequest).
 */
export function bulkCreateProducts(storefrontId: number, products: ProductInput[]) {
  return request<ProductResponse[]>('POST', `/api/storefronts/${storefrontId}/products/bulk`, { products });
}

// ─── Store Config ─────────────────────────────────────────────────────────────

export function getStoreConfig(storefrontId: number) {
  return request<StoreConfigResponse>('GET', `/api/storefronts/${storefrontId}/config`, undefined, false);
}

/**
 * Updates store config.
 * IMPORTANT: vatRate must be sent as a percentage (e.g. 7.5 for 7.5%),
 * NOT as a fraction. The backend StoreConfigRequest validates range [0, 100].
 */
export function updateStoreConfig(storefrontId: number, body: UpdateStoreConfigBody) {
  return request<StoreConfigResponse>('PUT', `/api/storefronts/${storefrontId}/config`, body);
}

// ─── Waiter Number ────────────────────────────────────────────────────────────

/** Gets the waiter phone number for a storefront. */
export function getWaiterNumber(storefrontId: number): Promise<WaiterNumberResponse> {
  return request<WaiterNumberResponse>('GET', `/waiter-number/${storefrontId}`);
}

/** Updates the waiter phone number for a storefront. */
export function updateWaiterNumber(storefrontId: number, waiterPhone: string): Promise<WaiterNumberResponse> {
  return request<WaiterNumberResponse>('PUT', `/waiter-number/${storefrontId}`, { waiterPhone });
}

// ─── Tables ───────────────────────────────────────────────────────────────────

/** Verifies a QR table code is valid for a storefront. */
export function verifyStoreTable(storefrontId: number, code: string) {
  return request<TableVerifyResponse>(
    'GET',
    `/api/storefronts/${storefrontId}/tables/verify?code=${encodeURIComponent(code)}`,
    undefined,
    false,
  );
}

/** Lists all tables/QR codes configured for a storefront. */
export function listStoreTables(storefrontId: number): Promise<StoreTableResponse[]> {
  return request<StoreTableResponse[]>('GET', `/api/storefronts/${storefrontId}/tables`);
}

/** Creates a new table/QR code entry for a storefront. */
export function createStoreTable(storefrontId: number, label: string): Promise<StoreTableResponse> {
  return request<StoreTableResponse>('POST', `/api/storefronts/${storefrontId}/tables`, { label });
}

/** Deletes a table/QR code entry from a storefront. */
export function deleteStoreTable(storefrontId: number, tableId: number): Promise<void> {
  return request<void>('DELETE', `/api/storefronts/${storefrontId}/tables/${tableId}`);
}

// ─── Orders ───────────────────────────────────────────────────────────────────

export function createOrder(storefrontId: number, body: CreateOrderBody) {
  return request<OrderResponse>('POST', `/api/storefronts/${storefrontId}/orders`, body, false);
}

export function getOrders(storefrontId?: number) {
  return request<OrderResponse[]>('GET', storefrontId ? `/api/storefronts/${storefrontId}/orders` : '/api/orders');
}

/** Vendor-authenticated order status update. */
export function updateOrderStatus(storefrontId: number, orderId: number, status: string) {
  return request<OrderResponse>('PATCH', `/api/storefronts/${storefrontId}/orders/${orderId}/status`, { status });
}

/**
 * Public order status update — no auth required.
 * Matches PATCH /api/orders/{orderId}/status.
 */
export function updateOrderStatusPublic(orderId: number, status: string) {
  return request<OrderResponse>('PATCH', `/api/orders/${orderId}/status`, { status }, false);
}

/**
 * Order lookup by ID. Supports both getOrderById(orderId) and legacy getOrderById(storefrontId, orderId).
 */
export function getOrderById(storefrontIdOrOrderId: number, maybeOrderId?: number) {
  const actualOrderId = maybeOrderId ?? storefrontIdOrOrderId;
  return request<OrderResponse>('GET', `/api/orders/${actualOrderId}`, undefined, false);
}

// ─── Weekly Events (per-storefront, legacy schedule) ──────────────────────────

export function getStorefrontEvents(storefrontId: number) {
  return request<WeeklyEvents>('GET', `/api/storefronts/${storefrontId}/events`, undefined, false);
}

export function updateStorefrontEvents(storefrontId: number, weeklyEvents: WeeklyEvents) {
  return request<WeeklyEvents>('PUT', `/api/storefronts/${storefrontId}/events`, { weeklyEvents });
}

// ─── Event Details ────────────────────────────────────────────────────────────

/** Gets structured event details (date, venue, check-in enabled, etc.). */
export function getEventDetails(storefrontId: number): Promise<EventDetailsResponse> {
  return request<EventDetailsResponse>('GET', `/api/storefronts/${storefrontId}/event-details`, undefined, false);
}

/** Creates or replaces event details for a storefront. */
export function saveEventDetails(storefrontId: number, body: EventDetailsRequest): Promise<EventDetailsResponse> {
  return request<EventDetailsResponse>('PUT', `/api/storefronts/${storefrontId}/event-details`, body);
}

// ─── Registration Form ────────────────────────────────────────────────────────

/** Gets the guest registration/RSVP form for an event storefront. */
export function getRegistrationForm(storefrontId: number): Promise<RegistrationFormResponse> {
  return request<RegistrationFormResponse>('GET', `/api/storefronts/${storefrontId}/registration-form`);
}

/** Saves / overwrites the guest registration form for an event storefront. */
export function saveRegistrationForm(storefrontId: number, body: RegistrationFormRequest): Promise<RegistrationFormResponse> {
  return request<RegistrationFormResponse>('PUT', `/api/storefronts/${storefrontId}/registration-form`, body);
}

// ─── Event Guests / RSVP / Check-in ──────────────────────────────────────────

/** Lists all RSVPed guests for an event storefront (vendor view). */
export function listGuests(storefrontId: number): Promise<GuestResponse[]> {
  return request<GuestResponse[]>('GET', `/api/storefronts/${storefrontId}/guests`);
}

/** Submits a guest RSVP for a public event (no auth required). */
export function rsvpGuest(storefrontId: number, body: GuestRsvpRequest): Promise<GuestRsvpResponse> {
  return request<GuestRsvpResponse>('POST', `/api/storefronts/${storefrontId}/guests`, body, false);
}

/** Checks in a guest by their guest code at an event. */
export function checkInGuest(storefrontId: number, guestCode: string): Promise<CheckInResponse> {
  return request<CheckInResponse>('POST', `/api/storefronts/${storefrontId}/checkin`, { guestCode }, false);
}

// ─── Waiter Calls ─────────────────────────────────────────────────────────────

export function createWaiterCall(storefrontId: number, body: WaiterCallBody) {
  return request<{ id: number }>('POST', `/api/storefronts/${storefrontId}/waiter-calls`, body, false);
}

export async function getStorefrontWaiterCalls(storefrontId: number): Promise<WaiterCallRecord[]> {
  const raw = await request<any[]>('GET', `/api/storefronts/${storefrontId}/waiter-calls`);
  return raw.map((item) => ({
    ...item,
    isRead: Boolean(item.isRead),
    status: item.isRead ? 'ACKNOWLEDGED' : 'PENDING',
  }));
}

/**
 * Marks a single waiter call as read.
 * Matches PATCH /api/storefronts/{id}/waiter-calls/{callId}/read.
 */
export function markWaiterCallRead(storefrontId: number, callId: number): Promise<void> {
  return request<void>('PATCH', `/api/storefronts/${storefrontId}/waiter-calls/${callId}/read`);
}

export function acknowledgeWaiterCall(storefrontId: number, callId: number): Promise<void> {
  return markWaiterCallRead(storefrontId, callId);
}

/**
 * Marks all waiter calls as read in one request.
 * Matches POST /api/storefronts/{id}/waiter-calls/mark-all-read.
 */
export function markAllWaiterCallsRead(storefrontId: number): Promise<void> {
  return request<void>('POST', `/api/storefronts/${storefrontId}/waiter-calls/mark-all-read`);
}

// ─── Requests (Shoutout / Song / Karaoke) ─────────────────────────────────────

export function createStoreRequest(storefrontId: number, body: {
  requestType: StoreRequestType;
  details: string;
  amount: number;
}) {
  return request<{ id: number }>('POST', `/api/storefronts/${storefrontId}/requests`, body, false);
}

export async function getStorefrontRequests(storefrontId: number): Promise<StoreRequestRecord[]> {
  const raw = await request<any[]>('GET', `/api/storefronts/${storefrontId}/requests`);
  return raw.map((item) => ({
    ...item,
    status: 'PENDING',
  }));
}

export function acknowledgeStoreRequest(storefrontId: number, requestId: number): Promise<void> {
  return Promise.resolve();
}

// ─── Tips ─────────────────────────────────────────────────────────────────────

export function createStoreTip(storefrontId: number, body: {
  recipient: string;
  customRecipient?: string | null;
  amount: number;
}) {
  return request<{ id: number }>('POST', `/api/storefronts/${storefrontId}/tips`, body, false);
}

export async function getStorefrontTips(storefrontId: number): Promise<TipRecord[]> {
  const raw = await request<any[]>('GET', `/api/storefronts/${storefrontId}/tips`);
  return raw.map((item) => ({
    ...item,
    status: 'PENDING',
  }));
}

export function acknowledgeTip(storefrontId: number, tipId: number): Promise<void> {
  return Promise.resolve();
}

// ─── Feedback ─────────────────────────────────────────────────────────────────

export function createStoreFeedback(storefrontId: number, body: {
  rating: number;
  description: string;
}) {
  return request<{ id: number }>('POST', `/api/storefronts/${storefrontId}/feedbacks`, body, false);
}

export function getStorefrontFeedbacks(storefrontId: number): Promise<FeedbackRecord[]> {
  return request<FeedbackRecord[]>('GET', `/api/storefronts/${storefrontId}/feedbacks`);
}

// ─── Front Desk (Hotel / Venue Registration) ──────────────────────────────────

/** Sends a phone OTP for front desk guest verification (no auth required). */
export function sendFrontDeskOtp(storefrontId: number, phone: string): Promise<void> {
  return request<void>('POST', `/api/storefronts/${storefrontId}/frontdesk/otp/send`, { phone }, false);
}

/** Verifies the phone OTP for front desk guest registration (no auth required). */
export function verifyFrontDeskOtp(storefrontId: number, phone: string, otp: string): Promise<void> {
  return request<void>('POST', `/api/storefronts/${storefrontId}/frontdesk/otp/verify`, { phone, otp }, false);
}

/** Lists all front desk registered guests for a storefront (vendor view). */
export function listFrontDeskGuests(storefrontId: number): Promise<FrontDeskGuestResponse[]> {
  return request<FrontDeskGuestResponse[]>('GET', `/api/storefronts/${storefrontId}/frontdesk/guests`);
}

/** Registers a new front desk guest (hotel check-in, venue entry, etc.). */
export function registerFrontDeskGuest(storefrontId: number, body: FrontDeskGuestRegistrationRequest): Promise<FrontDeskGuestResponse> {
  return request<FrontDeskGuestResponse>('POST', `/api/storefronts/${storefrontId}/frontdesk/guests`, body, false);
}

/** Gets a single front desk guest record by ID. */
export function getFrontDeskGuest(storefrontId: number, guestId: number): Promise<FrontDeskGuestResponse> {
  return request<FrontDeskGuestResponse>('GET', `/api/storefronts/${storefrontId}/frontdesk/guests/${guestId}`);
}

/** Approves a front desk guest application. */
export function approveFrontDeskGuest(storefrontId: number, guestId: number): Promise<void> {
  return request<void>('POST', `/api/storefronts/${storefrontId}/frontdesk/guests/${guestId}/approve`);
}

/** Rejects a front desk guest application with a reason. */
export function rejectFrontDeskGuest(storefrontId: number, guestId: number, reason: string): Promise<void> {
  return request<void>('POST', `/api/storefronts/${storefrontId}/frontdesk/guests/${guestId}/reject`, { reason });
}

/** Checks in an approved front desk guest by their guest code. */
export function frontDeskCheckIn(storefrontId: number, guestCode: string): Promise<CheckInResponse> {
  return request<CheckInResponse>('POST', `/api/storefronts/${storefrontId}/frontdesk/checkin`, { guestCode });
}

// ─── Access Content ───────────────────────────────────────────────────────────

/** Gets public/unlocked access content for a storefront (customer view). */
export function getPublicAccessContent(storefrontId: number): Promise<PublicAccessContentResponse[]> {
  return request<PublicAccessContentResponse[]>('GET', `/api/storefronts/${storefrontId}/access-content`, undefined, false);
}

/** Gets all access content for a storefront (vendor/admin view, includes locked items). */
export function listAllAccessContent(storefrontId: number): Promise<AccessContentResponse[]> {
  return request<AccessContentResponse[]>('GET', `/api/storefronts/${storefrontId}/access-content/all`);
}

/** Creates a new access content item for a storefront. */
export function createAccessContent(storefrontId: number, body: AccessContentRequest): Promise<AccessContentResponse> {
  return request<AccessContentResponse>('POST', `/api/storefronts/${storefrontId}/access-content`, body);
}

// ─── Access Pages (UI Compatibility Bridge) ──────────────────────────────────

export interface CreateAccessPageBody {
  type: AccessPageType;
  title: string;
  description?: string;
  fields: AccessPageField[];
  exclusiveContent?: string;
}

export function getAccessPages(storefrontId: number): Promise<AccessPage[]> {
  return request<AccessPage[]>('GET', `/api/storefronts/${storefrontId}/access-pages`);
}

export function createAccessPage(storefrontId: number, body: CreateAccessPageBody): Promise<AccessPage> {
  return request<AccessPage>('POST', `/api/storefronts/${storefrontId}/access-pages`, body);
}

export function updateAccessPage(accessPageId: number, body: Partial<CreateAccessPageBody> & { isActive?: boolean }): Promise<AccessPage> {
  return request<AccessPage>('PUT', `/api/access-pages/${accessPageId}`, body);
}

export function deleteAccessPage(accessPageId: number): Promise<void> {
  return request<void>('DELETE', `/api/access-pages/${accessPageId}`);
}

export function getAccessPageBySlug(slug: string): Promise<AccessPage> {
  return request<AccessPage>('GET', `/api/access-pages/slug/${encodeURIComponent(slug)}`, undefined, false);
}

export function submitAccessPageGuestEntry(accessPageId: number, responses: Record<string, string>): Promise<AccessPageGuestEntry> {
  return request<AccessPageGuestEntry>('POST', `/api/access-pages/${accessPageId}/guests`, { responses }, false);
}

export function getAccessPageGuests(accessPageId: number): Promise<AccessPageGuestEntry[]> {
  return request<AccessPageGuestEntry[]>('GET', `/api/access-pages/${accessPageId}/guests`);
}

// ─── Payments ─────────────────────────────────────────────────────────────────

export function initializePayment(purpose: PaymentPurpose, slug: string) {
  return request<PaymentInitResponse>('POST', '/api/payments/initialize', {
    purpose,
    payload: JSON.stringify({ slug }),
  });
}

export function verifyPayment(reference: string) {
  return request<PaymentVerifyResponse>('POST', '/api/payments/verify', { reference });
}

// ─── Event Type Catalog ────────────────────────────────────────────────────────

/** Lists all available event types (CONCERT, WEDDING, etc.) with labels and icons. */
export function listEventTypes(): Promise<EventTypeSummary[]> {
  return request<EventTypeSummary[]>('GET', '/api/event-types', undefined, false);
}

/** Gets the recommended form template for a specific event type. */
export function getEventTypeTemplate(type: string): Promise<EventTypeTemplate> {
  return request<EventTypeTemplate>('GET', `/api/event-types/${encodeURIComponent(type)}/template`, undefined, false);
}

// ─── Business Profile (local-only, not synced to backend) ─────────────────────

export async function saveBusinessProfileData(data: BusinessProfileData): Promise<void> {
  const existing = await AsyncStorage.getItem('global_business_profile');
  const parsed = existing ? JSON.parse(existing) : {};
  const updated = { ...parsed, ...data };
  await AsyncStorage.setItem('global_business_profile', JSON.stringify(updated));
}

export async function getBusinessProfileData(): Promise<BusinessProfileData> {
  const existing = await AsyncStorage.getItem('global_business_profile');
  return existing ? JSON.parse(existing) : {};
}

// ─── Push notifications ──────────────────────────────────────────────────────
// Registers this device's Expo push token so a real backend can send order alerts
// even when the app is backgrounded/closed. In demo mode this is a no-op — there's
// no server to receive it — but the client-side permission/token flow still runs
// (see src/utils/pushNotifications.ts), so the plumbing is proven and ready.

export function registerPushToken(token: string) {
  return request<void>('POST', '/api/notifications/register', { token });
}

