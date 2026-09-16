import type { WeeklyEvents, BankAccount } from '../types';

export interface StorefrontCategory {
  id: string;
  name: string;
  icon: string;
  imageUrl?: string;
}

// StorefrontResponse.data is an intentionally free-form `unknown` JSON blob — this is the
// single, shared, type-safe way to read the fields any screen cares about out of it,
// instead of scattering `as any` casts across the codebase.
export interface StorefrontData {
  phone?: string;
  email?: string;
  bankName?: string;
  accountNumber?: string;
  bankAccounts?: BankAccount[];
  images?: string[];
  estimatedDeliveryTime?: string;
  weeklyEvents?: WeeklyEvents;
  location?: string;
  categories?: StorefrontCategory[];
  venue?: string;
  eventDate?: string;
  eventType?: string;
  ticketTiers?: string[];
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseStorefrontData(data: unknown): StorefrontData {
  if (!isRecord(data)) return {};

  let bankAccounts: BankAccount[] | undefined;
  if (Array.isArray(data.bankAccounts)) {
    bankAccounts = data.bankAccounts.filter(isRecord).map((b) => ({
      bankName: typeof b.bankName === 'string' ? b.bankName : '',
      accountNumber: typeof b.accountNumber === 'string' ? b.accountNumber : '',
      accountName: typeof b.accountName === 'string' ? b.accountName : undefined,
      isPrimary: typeof b.isPrimary === 'boolean' ? b.isPrimary : undefined,
    })).filter((b) => b.bankName && b.accountNumber);
  }

  let categories: StorefrontCategory[] | undefined;
  if (Array.isArray(data.categories)) {
    categories = data.categories.filter(isRecord).map((c) => ({
      id: typeof c.id === 'string' ? c.id : (typeof c.name === 'string' ? c.name.toLowerCase().replace(/\s+/g, '-') : String(Math.random())),
      name: typeof c.name === 'string' ? c.name : '',
      icon: typeof c.icon === 'string' ? c.icon : '',
      imageUrl: typeof c.imageUrl === 'string' ? c.imageUrl : undefined,
    })).filter((c) => c.name);
  }

  const ticketTiers = Array.isArray(data.ticketTiers)
    ? data.ticketTiers.filter((item): item is string => typeof item === 'string')
    : undefined;

  return {
    phone: typeof data.phone === 'string' ? data.phone : undefined,
    email: typeof data.email === 'string' ? data.email : undefined,
    bankName: typeof data.bankName === 'string' ? data.bankName : undefined,
    accountNumber: typeof data.accountNumber === 'string' ? data.accountNumber : undefined,
    bankAccounts: bankAccounts && bankAccounts.length > 0 ? bankAccounts : undefined,
    images: Array.isArray(data.images) ? data.images.filter((item): item is string => typeof item === 'string') : undefined,
    estimatedDeliveryTime: typeof data.estimatedDeliveryTime === 'string' ? data.estimatedDeliveryTime : undefined,
    weeklyEvents: isRecord(data.weeklyEvents) ? (data.weeklyEvents as WeeklyEvents) : undefined,
    location: typeof data.location === 'string' ? data.location : undefined,
    categories: categories && categories.length > 0 ? categories : undefined,
    venue: typeof data.venue === 'string' ? data.venue : undefined,
    eventDate: typeof data.eventDate === 'string' ? data.eventDate : undefined,
    eventType: typeof data.eventType === 'string' ? data.eventType : undefined,
    ticketTiers: ticketTiers && ticketTiers.length > 0 ? ticketTiers : undefined,
  };
}
