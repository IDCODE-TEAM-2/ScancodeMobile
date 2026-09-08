import AsyncStorage from '@react-native-async-storage/async-storage';
import { getMyStorefronts } from '../api';

const INTENDED_MERCHANT_KEY = 'scancode_intended_merchant';

// The backend has no real merchant/customer role split — every registration gets the same
// base "USER" role (confirmed against UserService.register on the server) regardless of
// which option the Register screen's toggle sends, and login/me never returns a
// "ROLE_MERCHANT" string for anyone to check. So admin-vs-customer routing can't be decided
// from roles at all. Ownership of at least one storefront is the real, always-available
// signal for "this account is a merchant." A merchant who just registered and hasn't created
// their first storefront yet has no storefronts to check — that one case is covered by a
// locally-persisted flag set at registration time (see setIntendedMerchant).
export async function setIntendedMerchant(intended: boolean): Promise<void> {
  try {
    if (intended) {
      await AsyncStorage.setItem(INTENDED_MERCHANT_KEY, '1');
    } else {
      await AsyncStorage.removeItem(INTENDED_MERCHANT_KEY);
    }
  } catch {
    // Best-effort — worst case, resolveAppState() falls back to storefront ownership only.
  }
}

export async function clearIntendedMerchant(): Promise<void> {
  try {
    await AsyncStorage.removeItem(INTENDED_MERCHANT_KEY);
  } catch {
    // Non-fatal.
  }
}

export async function resolveAppState(): Promise<'admin' | 'customer'> {
  try {
    const storefronts = await getMyStorefronts();
    if (storefronts.length > 0) return 'admin';
  } catch {
    // Not authenticated yet, or a transient failure — fall through to the intent flag.
  }
  try {
    const intended = await AsyncStorage.getItem(INTENDED_MERCHANT_KEY);
    if (intended === '1') return 'admin';
  } catch {
    // Non-fatal.
  }
  return 'customer';
}
