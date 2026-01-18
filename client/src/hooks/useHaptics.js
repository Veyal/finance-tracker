
// Custom hook for haptic feedback - iOS compatible
import { useCallback, useRef } from 'react';

/**
 * useHaptics hook
 * Provides simple methods to trigger haptic feedback on devices that support it.
 * Uses navigator.vibrate for Android and AudioContext trick for iOS.
 */
export function useHaptics() {
    const audioContextRef = useRef(null);

    // Detect if we're on iOS
    const isIOS = typeof navigator !== 'undefined' &&
        /iPad|iPhone|iPod/.test(navigator.userAgent) &&
        !window.MSStream;

    // Check if navigator.vibrate is available (Android/some browsers)
    const canVibrate = typeof navigator !== 'undefined' && !!navigator.vibrate;

    // iOS Taptic Engine activation via AudioContext
    // This creates a tiny silent audio pulse that can trigger haptic feedback
    const triggerIOSHaptic = useCallback(() => {
        try {
            // Create or reuse AudioContext
            if (!audioContextRef.current) {
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                if (AudioContext) {
                    audioContextRef.current = new AudioContext();
                }
            }

            const ctx = audioContextRef.current;
            if (!ctx) return;

            // Resume context if suspended (required after user gesture)
            if (ctx.state === 'suspended') {
                ctx.resume();
            }

            // Create a very short, silent oscillation
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();

            // Set gain to 0 (silent) but the audio processing still triggers haptics
            gainNode.gain.setValueAtTime(0, ctx.currentTime);

            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);

            // Very short duration
            oscillator.start(ctx.currentTime);
            oscillator.stop(ctx.currentTime + 0.001);
        } catch (e) {
            // Silently fail - haptics are nice-to-have
            console.debug('Haptic feedback unavailable:', e);
        }
    }, []);

    /**
     * Trigger a light impact vibration
     * Good for keys, toggles, generic interactions
     */
    const triggerImpact = useCallback((style = 'light') => {
        // Try iOS approach first if on iOS
        if (isIOS) {
            triggerIOSHaptic();
            return;
        }

        // Fallback to navigator.vibrate for Android
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
    }, [canVibrate, isIOS, triggerIOSHaptic]);

    /**
     * Trigger a success vibration pattern
     */
    const triggerSuccess = useCallback(() => {
        if (isIOS) {
            // Double pulse for iOS
            triggerIOSHaptic();
            setTimeout(triggerIOSHaptic, 100);
            return;
        }

        if (!canVibrate) return;
        // Two quick pulses
        navigator.vibrate([10, 50, 20]);
    }, [canVibrate, isIOS, triggerIOSHaptic]);

    /**
     * Trigger an error vibration pattern
     */
    const triggerError = useCallback(() => {
        if (isIOS) {
            // Triple pulse for iOS
            triggerIOSHaptic();
            setTimeout(triggerIOSHaptic, 80);
            setTimeout(triggerIOSHaptic, 160);
            return;
        }

        if (!canVibrate) return;
        // Three pulses
        navigator.vibrate([50, 50, 50, 50, 50]);
    }, [canVibrate, isIOS, triggerIOSHaptic]);

    return {
        triggerImpact,
        triggerSuccess,
        triggerError
    };
}
