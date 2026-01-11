
// Custom hook for haptic feedback
import { useCallback } from 'react';

/**
 * useHaptics hook
 * Provides simple methods to trigger haptic feedback on devices that support it.
 */
export function useHaptics() {
    // Check if navigator.vibrate is available
    const canVibrate = typeof navigator !== 'undefined' && !!navigator.vibrate;

    /**
     * Trigger a light impact vibration
     * Good for keys, toggles, generic interactions
     */
    const triggerImpact = useCallback((style = 'light') => {
        if (!canVibrate) return;

        switch (style) {
            case 'light':
                navigator.vibrate(10); // Very short, crisp
                break;
            case 'medium':
                navigator.vibrate(20);
                break;
            case 'heavy':
                navigator.vibrate(40);
                break;
            default:
                navigator.vibrate(10);
        }
    }, [canVibrate]);

    /**
     * Trigger a success vibration pattern
     */
    const triggerSuccess = useCallback(() => {
        if (!canVibrate) return;
        // Two quick pulses
        navigator.vibrate([10, 50, 20]);
    }, [canVibrate]);

    /**
     * Trigger an error vibration pattern
     */
    const triggerError = useCallback(() => {
        if (!canVibrate) return;
        // Three pulses
        navigator.vibrate([50, 50, 50, 50, 50]);
    }, [canVibrate]);

    return {
        triggerImpact,
        triggerSuccess,
        triggerError
    };
}
