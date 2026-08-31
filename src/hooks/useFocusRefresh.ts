import { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';

/**
 * Re-runs `callback` every time the screen comes into focus (including the first mount).
 * Replaces the `useFocusEffect(useCallback(() => { load(); }, [load]))` boilerplate that
 * was duplicated identically across five screens.
 */
export function useFocusRefresh(callback: () => void): void {
  useFocusEffect(
    useCallback(() => {
      callback();
    }, [callback])
  );
}
