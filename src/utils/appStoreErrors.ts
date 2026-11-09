import { ErrorCode } from 'expo-iap';

const ENVELOPE_PREFIX = 'OPENIAP_ERROR_JSON:';

/**
 * Reads the StoreKit error code from anything expo-iap throws or emits. Rejected native calls
 * arrive as a FunctionCallException whose message embeds `OPENIAP_ERROR_JSON:{...}`; listener
 * errors arrive as a plain `{ code, message }` object.
 */
export function appStoreErrorCode(error: unknown): string | null {
  const raw = rawErrorCode(error);
  return raw === null ? null : normalizeCode(raw);
}

/** 'E_USER_CANCELLED', 'userCancelled', 'UserCancelled' and 'user-cancelled' all become 'user-cancelled'. */
function normalizeCode(code: string): string {
  return code
    .replace(/^E_/i, '')
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/_/g, '-')
    .toLowerCase();
}

function rawErrorCode(error: unknown): string | null {
  if (error && typeof error === 'object' && 'code' in error && typeof error.code === 'string') {
    return error.code;
  }
  const message = error instanceof Error ? error.message : typeof error === 'string' ? error : '';
  const start = message.indexOf(ENVELOPE_PREFIX);
  if (start === -1) return null;
  const json = message.slice(start + ENVELOPE_PREFIX.length);
  const end = json.lastIndexOf('}');
  try {
    const parsed: unknown = JSON.parse(json.slice(0, end + 1));
    if (parsed && typeof parsed === 'object' && 'code' in parsed && typeof parsed.code === 'string') {
      return parsed.code;
    }
  } catch {
    // Not a well-formed envelope; fall through.
  }
  return null;
}

/**
 * True when the user backed out (closed the payment sheet, cancelled the Apple ID password prompt).
 * That is not an error and must never show an error banner.
 */
export function isAppStoreCancellation(error: unknown): boolean {
  if (appStoreErrorCode(error) === ErrorCode.UserCancelled) return true;
  const message = error instanceof Error ? error.message
    : error && typeof error === 'object' && 'message' in error && typeof error.message === 'string' ? error.message
      : '';
  return /\bcancel(l)?ed\b/i.test(message);
}

/** A message safe to show the user. Never exposes raw native exception text. */
export function appStoreErrorMessage(error: unknown): string {
  switch (appStoreErrorCode(error)) {
    case ErrorCode.NetworkError:
    case ErrorCode.ServiceTimeout:
    case ErrorCode.RemoteError:
      return 'Could not reach the App Store. Check your internet connection and try again.';
    case ErrorCode.ItemUnavailable:
    case ErrorCode.SkuNotFound:
    case ErrorCode.QueryProduct:
      return 'This plan is not available from the App Store right now. Please try again later.';
    case ErrorCode.AlreadyOwned:
      return 'You already have this subscription. Tap Restore Purchases to link it to your account.';
    case ErrorCode.DeferredPayment:
    case ErrorCode.Pending:
      return 'Your purchase is waiting for approval. ScanCode will activate it once the App Store confirms it.';
    case ErrorCode.IapNotAvailable:
    case ErrorCode.FeatureNotSupported:
      return 'Purchases are turned off on this device. Check Screen Time restrictions in Settings.';
    case ErrorCode.TransactionValidationFailed:
    case ErrorCode.PurchaseVerificationFailed:
      return 'The App Store could not confirm this purchase. You have not been charged twice; tap Restore Purchases to try again.';
    default:
      // StoreKit's "Unable to Complete Request" (code unknown/sync-error) lands here. It usually
      // means the device is not signed in to the App Store or the App Store is temporarily down.
      return 'The App Store could not complete the request. Make sure you are signed in to the App Store (Settings > your name > Media & Purchases), then try again.';
  }
}
