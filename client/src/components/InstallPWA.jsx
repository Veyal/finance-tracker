import { useState, useEffect } from 'react';

export default function InstallPWA() {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [isIOS, setIsIOS] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);

    useEffect(() => {
        // Check if already installed
        const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches
            || window.navigator.standalone
            || document.referrer.includes('android-app://');

        setIsStandalone(isStandaloneMode);

        // Check if iOS
        const userAgent = window.navigator.userAgent.toLowerCase();
        setIsIOS(/iphone|ipad|ipod/.test(userAgent));

        // Listen for install prompt (mostly Android/Desktop Chrome)
        const handler = (e) => {
            e.preventDefault();
            console.log("PWA Install Prompt fired");
            setDeferredPrompt(e);
        };

        window.addEventListener('beforeinstallprompt', handler);

        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;

        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User response to the install prompt: ${outcome}`);
        setDeferredPrompt(null);
    };

    // Don't show if already installed
    if (isStandalone) return null;

    // Show floating button for Android/Desktop if prompt available
    if (deferredPrompt) {
        return (
            <button
                onClick={handleInstallClick}
                style={styles.floatingButton}
                aria-label="Install App"
            >
                <div style={styles.iconContainer}>
                    <span>⬇️</span>
                    <span style={styles.text}>Install App</span>
                </div>
            </button>
        );
    }

    // Optional: Show iOS instructions only if truly needed
    // Typically iOS users expect "Add to Home Screen" from share menu
    // We can show a small hint if we want, but keeping it clean for now.

    return null;
}

const styles = {
    floatingButton: {
        position: 'fixed',
        bottom: '80px', // Above navigation bar
        right: '20px',
        background: 'var(--gradient-accent, linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%))',
        border: 'none',
        borderRadius: '30px',
        color: 'white',
        padding: '12px 20px',
        boxShadow: '0 4px 15px rgba(255, 107, 107, 0.4)',
        cursor: 'pointer',
        zIndex: 9999,
        fontFamily: 'var(--font-display, inherit)',
        fontWeight: 'bold',
        animation: 'bounce 2s infinite',
    },
    iconContainer: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
    },
    text: {
        fontSize: '14px',
    }
};
