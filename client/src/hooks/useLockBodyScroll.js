import { useLayoutEffect } from 'react';

let lockCount = 0;
let originalStyle = '';

/**
 * Hook to lock body scroll
 * @param {boolean} isLocked - Whether scroll should be locked (default: true)
 */
export default function useLockBodyScroll(isLocked = true) {
    useLayoutEffect(() => {
        if (!isLocked) return;

        // On the first lock, capture the original style
        if (lockCount === 0) {
            originalStyle = window.getComputedStyle(document.body).overflow;
            document.body.style.overflow = 'hidden';
        }
        
        lockCount++;

        // Re-enable scrolling when component unmounts or isLocked becomes false
        return () => {
            lockCount--;
            if (lockCount === 0) {
                document.body.style.overflow = originalStyle || 'visible';
            }
        };
    }, [isLocked]);
}
