import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

// ─── Shared storefront/cart domain types ────────────────────────────────────
// Lives here (rather than in a screen file) so both screens and CartContext
// can import it without risking a circular dependency.

export interface Vendor {
  name: string;
  description: string;
  phone: string;
  email: string;
  bankName: string;
  accountNumber: string;
  images: string[];
  logoUrl?: string;
  bannerUrl?: string;
  estimatedDeliveryTime?: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  isDelisted: boolean;
  media: string[];
  category: string;
  isPopular?: boolean;
}

export interface CartItem {
  id: string;
  name: string;
  price: number;
  qty: number;
  // Snapshotted at add-to-cart time so quantity can be capped from screens
  // (e.g. CartDrawerScreen) that don't have the full product catalog loaded.
  stock?: number;
}

export type DayOfWeek = 'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';

export const DAYS_OF_WEEK: DayOfWeek[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export interface DayEvent {
  id: string;
  time: string;
  name: string;
  description?: string;
}

// Keyed per storefront (each storefront's `data.weeklyEvents` holds its own
// object) — never shared or merged across storefronts.
export type WeeklyEvents = Partial<Record<DayOfWeek, DayEvent[]>>;

// ─── Nigeria states (for the storefront location picker) ───────────────────

export const NIGERIA_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno',
  'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT (Abuja)', 'Gombe',
  'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos',
  'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto',
  'Taraba', 'Yobe', 'Zamfara',
] as const;

export type NigeriaState = (typeof NIGERIA_STATES)[number];

// Approximate state-capital coordinates, used as a stand-in for real venue coordinates —
// storefronts only capture a state name (see CreateStorefrontScreen's location picker), not
// precise lat/lng, so "nearby" detection is necessarily state-level, not meters-level
// geofencing. See src/utils/geoProximity.ts.
export const NIGERIA_STATE_CENTROIDS: Record<NigeriaState, { lat: number; lng: number }> = {
  'Abia': { lat: 5.4527, lng: 7.5248 },
  'Adamawa': { lat: 9.3265, lng: 12.3984 },
  'Akwa Ibom': { lat: 5.0377, lng: 7.9128 },
  'Anambra': { lat: 6.2209, lng: 7.0721 },
  'Bauchi': { lat: 10.3158, lng: 9.8442 },
  'Bayelsa': { lat: 4.9267, lng: 6.2676 },
  'Benue': { lat: 7.7322, lng: 8.5391 },
  'Borno': { lat: 11.8333, lng: 13.1500 },
  'Cross River': { lat: 4.9517, lng: 8.3220 },
  'Delta': { lat: 6.2000, lng: 6.7333 },
  'Ebonyi': { lat: 6.3248, lng: 8.1137 },
  'Edo': { lat: 6.3350, lng: 5.6037 },
  'Ekiti': { lat: 7.6210, lng: 5.2200 },
  'Enugu': { lat: 6.4413, lng: 7.4988 },
  'FCT (Abuja)': { lat: 9.0765, lng: 7.3986 },
  'Gombe': { lat: 10.2897, lng: 11.1673 },
  'Imo': { lat: 5.4836, lng: 7.0333 },
  'Jigawa': { lat: 12.2280, lng: 9.5616 },
  'Kaduna': { lat: 10.5222, lng: 7.4383 },
  'Kano': { lat: 12.0022, lng: 8.5920 },
  'Katsina': { lat: 12.9908, lng: 7.6018 },
  'Kebbi': { lat: 12.4539, lng: 4.1975 },
  'Kogi': { lat: 7.7337, lng: 6.6906 },
  'Kwara': { lat: 8.4966, lng: 4.5426 },
  'Lagos': { lat: 6.5244, lng: 3.3792 },
  'Nasarawa': { lat: 8.5378, lng: 8.3206 },
  'Niger': { lat: 9.6139, lng: 6.5569 },
  'Ogun': { lat: 7.1608, lng: 3.3487 },
  'Ondo': { lat: 7.2508, lng: 5.2000 },
  'Osun': { lat: 7.7719, lng: 4.5560 },
  'Oyo': { lat: 7.3775, lng: 3.9470 },
  'Plateau': { lat: 9.8965, lng: 8.8583 },
  'Rivers': { lat: 4.8156, lng: 7.0498 },
  'Sokoto': { lat: 13.0059, lng: 5.2476 },
  'Taraba': { lat: 8.8833, lng: 11.3667 },
  'Yobe': { lat: 11.7470, lng: 11.9660 },
  'Zamfara': { lat: 12.1704, lng: 6.2650 },
};

// ─── Product catalog ─────────────────────────────────────────────────────────

export interface ProductInput {
  name: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  mediaUrls: string[];
  isPopular?: boolean;
}

// ─── Access Page (event pages / guest check-in / exclusive content) ────────

export type AccessPageType = 'CUSTOM' | 'WEDDING' | 'CONFERENCE' | 'CONCERT';

export type AccessPageFieldType = 'text' | 'number' | 'date' | 'yesno' | 'dropdown';

export interface AccessPageField {
  id: string;
  label: string;
  type: AccessPageFieldType;
  required?: boolean;
  options?: string[]; // only for 'dropdown'
}

export interface AccessPage {
  id: number;
  storefrontId: number;
  slug: string;
  type: AccessPageType;
  title: string;
  description?: string;
  fields: AccessPageField[];
  exclusiveContent?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AccessPageGuestEntry {
  id: number;
  accessPageId: number;
  responses: Record<string, string>;
  checkedInAt: string;
}

export type RootStackParamList = {
  Splash: undefined;
  Login: undefined;
  ForgotPassword: undefined;
  Register: undefined;
  VerifyOtp: { email: string };
  Dashboard: undefined;
  CreateStorefront: { editStorefrontId: number } | undefined;
  Storefront: { slug: string; name?: string; tableCode?: string };
  Wishlist: { slug: string; storefrontId: number; name?: string };
  CartDrawer: { slug: string; storefrontId: number; name?: string; table?: string };
  Checkout: { slug: string; storefrontId: number; cart: CartItem[]; table?: string };
  OrderReceiptTracker: { orderId: number; slug: string; storefrontId: number };
  ActivateQR: { storefrontId: number; slug: string; name: string };
  QR: { slug: string; name: string };
  MerchantProfileBank: { storefrontId?: number; name?: string; slug?: string } | undefined;
  StoreChargesConfig: { storefrontId: number; name?: string; slug?: string };
  CameraQRScanner: { storefrontId?: number; slug?: string } | undefined;
  LiveOrdersManager: { storefrontId?: number; slug?: string; name?: string } | undefined;
  ToolbarRequestsAdmin: { storefrontId: number; name?: string; slug?: string };
  EventsManager: { storefrontId: number; slug?: string; name?: string };
  ProductCatalogEditor: { storefrontId: number; slug?: string; name?: string };
  Services: undefined;
  CreateEvent: undefined;
  StorefrontDirectory: undefined;
  AccessPageManager: { storefrontId: number; slug?: string; name?: string };
  AccessPageGuest: { accessPageSlug: string };
  TermsOfService: undefined;
  PrivacyPolicy: undefined;
  Settings: undefined;
};

export type NavigationProp<T extends keyof RootStackParamList> =
  NativeStackNavigationProp<RootStackParamList, T>;

export type RouteProps<T extends keyof RootStackParamList> = RouteProp<RootStackParamList, T>;
