import type {
  StorefrontResponse,
  ProductResponse,
  StoreConfigResponse,
  OrderResponse,
  BusinessProfileData,
} from '../api';

export interface DemoAccount {
  email: string;
  username: string;
  token: string;
  roles: string[];
  isPaid: boolean;
}

export const DEMO_ACCOUNTS: Record<string, DemoAccount> = {
  admin: {
    email: 'admin@scancode.com',
    username: 'Demo Merchant Admin',
    token: 'demo-jwt-token-admin-999',
    roles: ['ROLE_USER', 'ROLE_MERCHANT'],
    isPaid: true,
  },
  customer: {
    email: 'customer@scancode.com',
    username: 'Sample Customer',
    token: 'demo-jwt-token-customer-111',
    roles: ['ROLE_USER'],
    isPaid: false,
  },
};

export const DEMO_BUSINESS_PROFILE: BusinessProfileData = {
  name: 'Lagos Gourmet Group Ltd',
  bankName: 'Access Bank',
  accountName: 'Lagos Gourmet Group Operations',
  accountNumber: '0123456789',
};

export const DEMO_STOREFRONTS: StorefrontResponse[] = [
  {
    id: 1,
    userId: 99,
    businessType: 'Restaurant & Lounge',
    slug: 'lagos-grill',
    publicUrl: 'https://scancode.live/s/lagos-grill',
    name: 'The Lagos Grill & Lounge',
    description: 'Authentic West African grills, signature cocktails, and premium dining atmosphere.',
    logoUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200&h=200&fit=crop',
    bannerUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&h=400&fit=crop',
    data: {
      theme: 'dark',
      currency: 'NGN',
      location: 'Lagos',
      weeklyEvents: {
        Friday: [
          { id: 'lg-ev-1', time: '8:00 PM', name: 'Afrobeats & DJ Night', description: 'Live DJ set by DJ Spin & cocktail specials.' },
          { id: 'lg-ev-2', time: '10:00 PM', name: 'Late Night Grill', description: 'Open-air grilling session with live music.' },
        ],
        Saturday: [
          { id: 'lg-ev-3', time: '7:00 PM', name: 'Caribbean Vibes Night', description: 'Reggae, rum punch, and jerk chicken specials.' },
        ],
        Sunday: [
          { id: 'lg-ev-4', time: '1:00 PM', name: 'Sunday BBQ Brunch', description: 'Unlimited grilled meats & acoustic live session.' },
        ],
      },
    },
    active: true,
    isPublished: true,
    createdAt: '2026-01-15T10:00:00Z',
    updatedAt: '2026-08-10T14:30:00Z',
  },
  {
    id: 2,
    userId: 99,
    businessType: 'Café & Bakery',
    slug: 'metro-bistro',
    publicUrl: 'https://scancode.live/s/metro-bistro',
    name: 'Metropolitan Bistro',
    description: 'Fresh artisanal pastries, specialty roasted coffees, and gourmet brunch options.',
    logoUrl: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=200&h=200&fit=crop',
    bannerUrl: 'https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=800&h=400&fit=crop',
    data: {
      theme: 'light',
      currency: 'NGN',
      location: 'Abuja',
      weeklyEvents: {
        Wednesday: [
          { id: 'mb-ev-1', time: '11:00 AM', name: 'Latte Art Workshop', description: 'Learn latte art from our master barista.' },
        ],
        Saturday: [
          { id: 'mb-ev-2', time: '9:00 AM', name: 'Weekend Brunch Special', description: 'Complimentary croissant with every brunch order.' },
        ],
      },
    },
    active: true,
    isPublished: true,
    createdAt: '2026-03-01T09:00:00Z',
    updatedAt: '2026-07-20T11:15:00Z',
  },
  {
    id: 3,
    userId: 99,
    businessType: 'Entertainment & Nightlife',
    slug: 'neon-karaoke',
    publicUrl: 'https://scancode.live/s/neon-karaoke',
    name: 'Neon Karaoke Club',
    description: 'Private karaoke VIP suites, live DJ sets, and craft shots.',
    logoUrl: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=200&h=200&fit=crop',
    bannerUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&h=400&fit=crop',
    data: {
      theme: 'neon',
      currency: 'NGN',
      location: 'Port Harcourt',
      weeklyEvents: {
        Thursday: [
          { id: 'nk-ev-1', time: '7:00 PM', name: 'Karaoke Battle Night', description: 'Compete for prizes — best voice wins a free booth session!' },
        ],
        Friday: [
          { id: 'nk-ev-2', time: '9:00 PM', name: 'VIP DJ Experience', description: 'Exclusive DJ sets in VIP karaoke suites.' },
        ],
        Saturday: [
          { id: 'nk-ev-3', time: '8:00 PM', name: 'Open Mic & Cocktails', description: 'Open stage for performers — signature cocktails at half price.' },
        ],
      },
    },
    active: true,
    isPublished: false,
    createdAt: '2026-06-10T16:00:00Z',
    updatedAt: '2026-08-01T18:00:00Z',
  },
];

export const DEMO_STORE_CONFIGS: Record<number, StoreConfigResponse> = {
  1: {
    id: 101,
    storefrontId: 1,
    vatRate: 0.075,
    deliveryFee: 1500,
    waiterPhone: '+2348012345678',
    callEntities: ['Waiter / Service', 'Manager On Duty', 'Bill / Check Request', 'Security'],
    createdAt: '2026-01-15T10:05:00Z',
    updatedAt: '2026-08-05T12:00:00Z',
  },
  2: {
    id: 102,
    storefrontId: 2,
    vatRate: 0.075,
    deliveryFee: 1000,
    waiterPhone: '+2348098765432',
    callEntities: ['Barista', 'Server', 'Bill Request'],
    createdAt: '2026-03-01T09:05:00Z',
    updatedAt: '2026-07-20T11:20:00Z',
  },
  3: {
    id: 103,
    storefrontId: 3,
    vatRate: 0.075,
    deliveryFee: 2000,
    waiterPhone: '+2348055556666',
    callEntities: ['VIP Host', 'DJ Shoutout', 'Bouncer'],
    createdAt: '2026-06-10T16:05:00Z',
    updatedAt: '2026-08-01T18:05:00Z',
  },
};

export const DEMO_PRODUCTS: Record<number, ProductResponse[]> = {
  1: [
    {
      id: 1001,
      storefrontId: 1,
      name: 'Smokey Suya Platter',
      description: 'Tender grilled beef suya marinated in Yaji spice, served with sliced onions and fresh tomatoes.',
      price: 8500,
      stock: 45,
      isDelisted: false,
      mediaUrls: ['https://images.unsplash.com/photo-1544025162-d76694265947?w=500&fit=crop'],
      category: 'Starters & Grills',
      isPopular: true,
      viewCount: 342,
      createdAt: '2026-01-16T10:00:00Z',
      updatedAt: '2026-08-12T09:00:00Z',
    },
    {
      id: 1002,
      storefrontId: 1,
      name: 'Jollof Rice Special with Jumbo Prawns',
      description: 'Smoky firewood Jollof rice served with grilled jumbo prawns, fried plantain, and coleslaw.',
      price: 12500,
      stock: 30,
      isDelisted: false,
      mediaUrls: ['https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?w=500&fit=crop'],
      category: 'Mains & Specialties',
      isPopular: true,
      viewCount: 512,
      createdAt: '2026-01-16T10:30:00Z',
      updatedAt: '2026-08-14T11:00:00Z',
    },
    {
      id: 1003,
      storefrontId: 1,
      name: 'Peppered Goat Meat (Asun)',
      description: 'Spicy slow-roasted goat meat tossed in scotch bonnet and bell pepper reduction.',
      price: 9000,
      stock: 20,
      isDelisted: false,
      mediaUrls: ['https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=500&fit=crop'],
      category: 'Starters & Grills',
      isPopular: true,
      viewCount: 298,
      createdAt: '2026-01-16T11:00:00Z',
      updatedAt: '2026-08-10T15:00:00Z',
    },
    {
      id: 1004,
      storefrontId: 1,
      name: 'Signature Zobo Hibiscus Mocktail',
      description: 'Refreshing chilled organic zobo infused with clove, ginger, and fresh mint leaves.',
      price: 3500,
      stock: 100,
      isDelisted: false,
      mediaUrls: ['https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&fit=crop'],
      category: 'Drinks & Cocktails',
      isPopular: false,
      viewCount: 180,
      createdAt: '2026-01-16T11:30:00Z',
      updatedAt: '2026-08-08T14:00:00Z',
    },
    {
      id: 1005,
      storefrontId: 1,
      name: 'Chapman Cocktail Pitcher',
      description: 'Classic Nigerian Chapman with Angostura bitters, citrus slices, and grenadine.',
      price: 6000,
      stock: 50,
      isDelisted: false,
      mediaUrls: ['https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=500&fit=crop'],
      category: 'Drinks & Cocktails',
      isPopular: true,
      viewCount: 420,
      createdAt: '2026-01-16T12:00:00Z',
      updatedAt: '2026-08-15T16:00:00Z',
    },
  ],
  2: [
    {
      id: 2001,
      storefrontId: 2,
      name: 'Double Espresso Dark Roast',
      description: 'Rich, full-bodied double espresso shot from single-origin Arabica beans.',
      price: 2500,
      stock: 200,
      isDelisted: false,
      mediaUrls: ['https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500&fit=crop'],
      category: 'Coffee & Espresso',
      isPopular: true,
      viewCount: 210,
      createdAt: '2026-03-02T08:00:00Z',
      updatedAt: '2026-07-22T10:00:00Z',
    },
    {
      id: 2002,
      storefrontId: 2,
      name: 'Butter Croissant & Almond Cream',
      description: 'Flaky French butter croissant filled with sweet almond frangipane.',
      price: 3200,
      stock: 15,
      isDelisted: false,
      mediaUrls: ['https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=500&fit=crop'],
      category: 'Bakery & Pastry',
      isPopular: true,
      viewCount: 380,
      createdAt: '2026-03-02T08:30:00Z',
      updatedAt: '2026-07-22T10:30:00Z',
    },
  ],
  3: [],
};

export const DEMO_INITIAL_ORDERS: OrderResponse[] = [
  {
    id: 5001,
    storefrontId: 1,
    customerName: 'Chidi Okafor',
    customerPhone: '+2348021112233',
    customerEmail: 'chidi@example.com',
    orderItems: JSON.stringify([
      { id: '1001', name: 'Smokey Suya Platter', qty: 2, price: 8500 },
      { id: '1005', name: 'Chapman Cocktail Pitcher', qty: 1, price: 6000 },
    ]),
    subtotal: 23000,
    vat: 1725,
    delivery: 0,
    total: 24725,
    tableCode: 'T-04',
    tableLabel: 'Table 4 (Patio)',
    status: 'PENDING',
    createdAt: new Date(Date.now() - 5 * 60000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 60000).toISOString(),
  },
  {
    id: 5002,
    storefrontId: 1,
    customerName: 'Amina Bello',
    customerPhone: '+2348034445566',
    customerEmail: 'amina@example.com',
    orderItems: JSON.stringify([
      { id: '1002', name: 'Jollof Rice Special with Jumbo Prawns', qty: 1, price: 12500 },
      { id: '1004', name: 'Signature Zobo Hibiscus Mocktail', qty: 2, price: 3500 },
    ]),
    subtotal: 19500,
    vat: 1462.5,
    delivery: 0,
    total: 20962.5,
    tableCode: 'VIP-01',
    tableLabel: 'VIP Lounge Table 1',
    status: 'CONFIRMED',
    createdAt: new Date(Date.now() - 25 * 60000).toISOString(),
    updatedAt: new Date(Date.now() - 15 * 60000).toISOString(),
  },
  {
    id: 5003,
    storefrontId: 1,
    customerName: 'David Wright',
    customerPhone: '+2348097778899',
    customerEmail: 'david@example.com',
    orderItems: JSON.stringify([
      { id: '1003', name: 'Peppered Goat Meat (Asun)', qty: 1, price: 9000 },
    ]),
    subtotal: 9000,
    vat: 675,
    delivery: 1500,
    total: 11175,
    tableCode: null,
    tableLabel: null,
    status: 'COMPLETED',
    createdAt: new Date(Date.now() - 120 * 60000).toISOString(),
    updatedAt: new Date(Date.now() - 90 * 60000).toISOString(),
  },
];

// ─── Demo Toolbar Activity Data ─────────────────────────────────────────────

export type DemoWaiterCallStatus = 'PENDING' | 'ACKNOWLEDGED';
export type DemoRequestStatus = 'PENDING' | 'ACKNOWLEDGED';
export type DemoTipStatus = 'PENDING' | 'ACKNOWLEDGED';

export interface DemoWaiterCall {
  id: number;
  storefrontId: number;
  tableNumber: string;
  callTarget: string;
  message: string;
  status: DemoWaiterCallStatus;
  createdAt: string;
}

export interface DemoStoreRequest {
  id: number;
  storefrontId: number;
  requestType: 'SHOUTOUT' | 'SONG' | 'KARAOKE';
  details: string;
  amount: number;
  status: DemoRequestStatus;
  createdAt: string;
}

export interface DemoTip {
  id: number;
  storefrontId: number;
  recipient: string;
  customRecipient: string | null;
  amount: number;
  status: DemoTipStatus;
  createdAt: string;
}

export const DEMO_WAITER_CALLS: DemoWaiterCall[] = [
  {
    id: 9001,
    storefrontId: 1,
    tableNumber: 'Table 4',
    callTarget: 'Waiter / Service',
    message: 'Bring the bill',
    status: 'PENDING',
    createdAt: new Date(Date.now() - 3 * 60000).toISOString(),
  },
  {
    id: 9002,
    storefrontId: 1,
    tableNumber: 'VIP-01',
    callTarget: 'Manager On Duty',
    message: 'Custom message: Please check on VIP table setup.',
    status: 'PENDING',
    createdAt: new Date(Date.now() - 8 * 60000).toISOString(),
  },
  {
    id: 9003,
    storefrontId: 1,
    tableNumber: 'Table 7',
    callTarget: 'Waiter / Service',
    message: 'Extra cutlery',
    status: 'ACKNOWLEDGED',
    createdAt: new Date(Date.now() - 22 * 60000).toISOString(),
  },
  {
    id: 9004,
    storefrontId: 2,
    tableNumber: 'Table 2',
    callTarget: 'Barista',
    message: 'Water',
    status: 'PENDING',
    createdAt: new Date(Date.now() - 5 * 60000).toISOString(),
  },
];

export const DEMO_STORE_REQUESTS: DemoStoreRequest[] = [
  {
    id: 8001,
    storefrontId: 1,
    requestType: 'SHOUTOUT',
    details: 'Happy birthday to Tunde Balogun on Table 9!',
    amount: 7500,
    status: 'PENDING',
    createdAt: new Date(Date.now() - 6 * 60000).toISOString(),
  },
  {
    id: 8002,
    storefrontId: 1,
    requestType: 'SONG',
    details: 'Play "Essence" by Wizkid ft Tems',
    amount: 5000,
    status: 'ACKNOWLEDGED',
    createdAt: new Date(Date.now() - 35 * 60000).toISOString(),
  },
  {
    id: 8003,
    storefrontId: 1,
    requestType: 'KARAOKE',
    details: 'Book Booth 3 for 30 mins',
    amount: 0,
    status: 'PENDING',
    createdAt: new Date(Date.now() - 12 * 60000).toISOString(),
  },
  {
    id: 8004,
    storefrontId: 3,
    requestType: 'KARAOKE',
    details: 'Open mic session please',
    amount: 0,
    status: 'PENDING',
    createdAt: new Date(Date.now() - 2 * 60000).toISOString(),
  },
];

export const DEMO_TIPS: DemoTip[] = [
  {
    id: 7001,
    storefrontId: 1,
    recipient: 'WAITER',
    customRecipient: null,
    amount: 1000,
    status: 'PENDING',
    createdAt: new Date(Date.now() - 4 * 60000).toISOString(),
  },
  {
    id: 7002,
    storefrontId: 1,
    recipient: 'OTHER',
    customRecipient: 'DJ Spin',
    amount: 5000,
    status: 'PENDING',
    createdAt: new Date(Date.now() - 10 * 60000).toISOString(),
  },
  {
    id: 7003,
    storefrontId: 1,
    recipient: 'BOUNCER',
    customRecipient: null,
    amount: 500,
    status: 'ACKNOWLEDGED',
    createdAt: new Date(Date.now() - 45 * 60000).toISOString(),
  },
  {
    id: 7004,
    storefrontId: 2,
    recipient: 'WAITER',
    customRecipient: null,
    amount: 200,
    status: 'PENDING',
    createdAt: new Date(Date.now() - 7 * 60000).toISOString(),
  },
];
