import { useLayoutEffect } from 'react';

/**
 * Hook to lock body scroll
 * @param {boolean} isLocked - Whether scroll should be locked (default: true)
 */
export default function useLockBodyScroll(isLocked = true) {
    useLayoutEffect(() => {
        if (!isLocked) return;

        // Get original value
        const originalStyle = window.getComputedStyle(document.body).overflow;

        // Prevent scrolling on mount
        document.body.style.overflow = 'hidden';

        // Re-enable scrolling when component unmounts
        return () => {
            document.body.style.overflow = originalStyle;
        };
    }, [isLocked]);
}
