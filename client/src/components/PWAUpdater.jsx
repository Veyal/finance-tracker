import { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

export default function PWAUpdater() {
    const {
        needRefresh: [needRefresh, setNeedRefresh],
        updateServiceWorker,
    } = useRegisterSW({
        onRegistered(r) {
            console.log('SW Registered:', r);
        },
        onRegisterError(error) {
            console.log('SW registration error', error);
        },
    });

    // Check for updates periodically (every 5 minutes) and on mount
    useEffect(() => {
        const check = () => {
            console.log("Checking for PWA updates...");
            updateServiceWorker(true);
        };

        check(); // Check immediately on mount

        const interval = setInterval(check, 5 * 60 * 1000);

        return () => clearInterval(interval);
    }, [updateServiceWorker]);

    if (!needRefresh) return null;

    return (
        <div style={styles.banner}>
            <div style={styles.text}>
                New version available! 🚀
            </div>
            <button
                style={styles.button}
                onClick={() => updateServiceWorker(true)}
            >
                Refresh
            </button>
            <button
                style={styles.close}
                onClick={() => setNeedRefresh(false)}
            >
                ×
            </button>
        </div>
    );
}

const styles = {
    banner: {
        position: 'fixed',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: 'var(--bg-surface, #14142b)',
        border: '1px solid var(--accent-primary, #ff7eb3)',
        color: 'var(--text-primary, white)',
        padding: '12px 20px',
        borderRadius: '30px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        zIndex: 10000,
        animation: 'slideUp 0.5s ease-out',
        minWidth: '300px',
        justifyContent: 'space-between',
    },
    text: {
        fontSize: '14px',
        fontWeight: '500',
    },
    button: {
        backgroundColor: 'var(--accent-primary, #ff7eb3)',
        color: 'var(--text-on-pink, #1a0a14)',
        border: 'none',
        borderRadius: '20px',
        padding: '6px 12px',
        fontSize: '12px',
        fontWeight: 'bold',
        cursor: 'pointer',
    },
    close: {
        background: 'none',
        border: 'none',
        color: 'var(--text-muted, #888)',
        fontSize: '20px',
        cursor: 'pointer',
        padding: '0 4px',
    }
};
