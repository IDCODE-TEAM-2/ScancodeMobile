import type { WeeklyEvents } from '../types';

// StorefrontResponse.data is an intentionally free-form `unknown` JSON blob — this is the
// single, shared, type-safe way to read the fields any screen cares about out of it,
// instead of scattering `as any` casts across the codebase.
export interface StorefrontData {
  phone?: string;
  email?: string;
  bankName?: string;
  accountNumber?: string;
  images?: string[];
  estimatedDeliveryTime?: string;
  weeklyEvents?: WeeklyEvents;
  location?: string;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseStorefrontData(data: unknown): StorefrontData {
  if (!isRecord(data)) return {};
  return {
    phone: typeof data.phone === 'string' ? data.phone : undefined,
    email: typeof data.email === 'string' ? data.email : undefined,
    bankName: typeof data.bankName === 'string' ? data.bankName : undefined,
    accountNumber: typeof data.accountNumber === 'string' ? data.accountNumber : undefined,
    images: Array.isArray(data.images) ? data.images.filter((item): item is string => typeof item === 'string') : undefined,
    estimatedDeliveryTime: typeof data.estimatedDeliveryTime === 'string' ? data.estimatedDeliveryTime : undefined,
    weeklyEvents: isRecord(data.weeklyEvents) ? (data.weeklyEvents as WeeklyEvents) : undefined,
    location: typeof data.location === 'string' ? data.location : undefined,
  };
}
