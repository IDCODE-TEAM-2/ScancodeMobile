import * as WebBrowser from 'expo-web-browser';
import { Alert } from 'react-native';
import { initializePayment, verifyPayment, type PaymentPurpose } from '../api';

export interface PaystackPaymentOptions {
  purpose: PaymentPurpose;
  payload: string | Record<string, unknown>;
  title?: string;
  onSuccess: (reference: string) => void | Promise<void>;
  onError?: (errorMessage: string) => void;
  onCancel?: () => void;
}

/**
 * Initiates and verifies a Paystack payment session using Expo WebBrowser.
 * Uses the native app redirect scheme 'scancode://payment-complete'.
 */
export async function payWithPaystack({
  purpose,
  payload,
  title = 'Payment',
  onSuccess,
  onError,
  onCancel,
}: PaystackPaymentOptions): Promise<void> {
  let initRes: { authorizationUrl: string; reference: string };

  try {
    initRes = await initializePayment(purpose, payload, false);
    if (!initRes?.authorizationUrl) {
      throw new Error('No authorization URL returned from payment gateway.');
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Could not initialize payment.';
    if (onError) {
      onError(msg);
    } else {
      Alert.alert(`${title} Error`, msg);
    }
    return;
  }

  try {
    const result = await WebBrowser.openAuthSessionAsync(
      initRes.authorizationUrl,
      'scancode://payment-complete',
    );

    if (result.type === 'cancel' || result.type === 'dismiss') {
      Alert.alert(
        'Payment Incomplete',
        'Did you complete the payment in the browser?',
        [
          {
            text: 'No, cancel',
            style: 'cancel',
            onPress: () => onCancel?.(),
          },
          {
            text: 'Yes, verify',
            onPress: () => verifyPaystackReference(initRes.reference, title, onSuccess, onError),
          },
        ],
      );
      return;
    }

    await verifyPaystackReference(initRes.reference, title, onSuccess, onError);
  } catch (err: unknown) {
    // If browser session threw, attempt verification as fallback
    await verifyPaystackReference(initRes.reference, title, onSuccess, onError);
  }
}

async function verifyPaystackReference(
  reference: string,
  title: string,
  onSuccess: (reference: string) => void | Promise<void>,
  onError?: (errorMessage: string) => void,
): Promise<void> {
  try {
    const res = await verifyPayment(reference, false);
    if (res.verified) {
      await onSuccess(reference);
    } else {
      const msg = 'Payment verification incomplete. If you paid, it will confirm shortly.';
      if (onError) {
        onError(msg);
      } else {
        Alert.alert(`${title} Incomplete`, msg);
      }
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to verify payment.';
    if (onError) {
      onError(msg);
    } else {
      Alert.alert('Verification Error', msg);
    }
  }
}
