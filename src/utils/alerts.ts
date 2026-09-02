import { Alert, Platform } from 'react-native';

interface ConfirmOptions {
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
}

export function confirmAction(
  title: string,
  message: string,
  onConfirm: () => void | Promise<void>,
  options?: ConfirmOptions
) {
  const confirmText = options?.confirmText ?? 'Confirm';
  const cancelText = options?.cancelText ?? 'Cancel';

  if (Platform.OS === 'web') {
    const fullMessage = message ? `${title}\n\n${message}` : title;
    if (typeof window !== 'undefined' && window.confirm(fullMessage)) {
      onConfirm();
    }
  } else {
    Alert.alert(title, message, [
      { text: cancelText, style: 'cancel' },
      {
        text: confirmText,
        style: options?.destructive ? 'destructive' : 'default',
        onPress: () => {
          onConfirm();
        },
      },
    ]);
  }
}
