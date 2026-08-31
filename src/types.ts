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
  CreateStorefront: undefined;
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
  StorefrontDirectory: undefined;
  AccessPageManager: { storefrontId: number; slug?: string; name?: string };
  AccessPageGuest: { accessPageSlug: string };
  TermsOfService: undefined;
  PrivacyPolicy: undefined;
};

export type NavigationProp<T extends keyof RootStackParamList> =
  NativeStackNavigationProp<RootStackParamList, T>;

export type RouteProps<T extends keyof RootStackParamList> = RouteProp<RootStackParamList, T>;
