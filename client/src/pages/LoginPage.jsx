import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';
import './LoginPage.css';

export default function LoginPage() {
    const { login, register } = useAuth();
    const [isLogin, setIsLogin] = useState(true);
    const [username, setUsername] = useState('');
    const [pin, setPin] = useState('');
    const [pinFocused, setPinFocused] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [retryAfter, setRetryAfter] = useState(0);
    const pinInputRef = useRef(null);

    // Countdown timer for rate limit
    useEffect(() => {
        if (retryAfter > 0) {
            const timer = setTimeout(() => setRetryAfter(retryAfter - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [retryAfter]);

    // Auto-submit when PIN is complete
    useEffect(() => {
        if (pin.length === 6 && username.length >= 3 && !loading && retryAfter === 0) {
            handleAuth();
        }
    }, [pin, username, loading, retryAfter]);

    async function handleAuth() {
        if (loading || retryAfter > 0) return;

        setError('');
        setLoading(true);

        try {
            if (isLogin) {
                await login(username, pin);
            } else {
                await register(username, pin);
            }
        } catch (err) {
            setPin(''); // Clear PIN on error to prevent auto-retry loop
            if (err.error === 'too_many_attempts') {
                setRetryAfter(err.retry_after_seconds);
                setError('Too many attempts. Please wait.');
            } else if (err.error === 'invalid_credentials') {
                setError('Invalid username or PIN');
            } else if (err.error === 'username_taken') {
                setError('Username already taken');
            } else if (err.error === 'invalid_username') {
                setError(err.message || 'Invalid username format');
            } else if (err.error === 'invalid_pin') {
                setError(err.message || 'PIN must be 6 digits');
            } else {
                setError('Something went wrong. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    }

    function handlePinChange(e) {
        const value = e.target.value.replace(/\D/g, '').slice(0, 6);
        setPin(value);
    }

    function handleDotsClick() {
        pinInputRef.current?.focus();
    }

    return (
        <div className="login-page">
            <div className="login-container animate-slide-up">
                <div className="login-header">
                    <span className="login-icon">💰</span>
                    <h1>Finance Tracker</h1>
                    <p>Track your money with style ✨</p>
                </div>

                <form className="login-form" onSubmit={(e) => e.preventDefault()}>
                    <div className="form-group">
                        <label className="input-label">Username</label>
                        <input
                            type="text"
                            className="input"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Enter username"
                            autoComplete="username"
                            disabled={loading || retryAfter > 0}
                        />
                    </div>

                    <div className="form-group">
                        <label className="input-label" style={{ textAlign: 'center' }}>PIN</label>
                        <div className="pin-input-container">
                            {/* Hidden input for actual PIN entry */}
                            <input
                                ref={pinInputRef}
                                type="password"
                                className="pin-hidden-input"
                                value={pin}
                                onChange={handlePinChange}
                                onFocus={() => setPinFocused(true)}
                                onBlur={() => setPinFocused(false)}
                                maxLength={6}
                                inputMode="numeric"
                                autoComplete={isLogin ? 'current-password' : 'new-password'}
                                disabled={loading || retryAfter > 0}
                            />
                            {/* Visual PIN dots */}
                            <div
                                className={`pin-dots ${pinFocused ? 'focused' : ''}`}
                                onClick={handleDotsClick}
                            >
                                {[...Array(6)].map((_, i) => (
                                    <span
                                        key={i}
                                        className={`pin-dot ${pin.length > i ? 'filled' : ''} ${pin.length === i && pinFocused ? 'current' : ''}`}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>

                    {error && <div className="login-error">{error}</div>}

                    <div className="login-status">
                        {loading && (
                            <div className="status-loading">
                                <Loader2 size={24} className="spin" />
                                <span>{isLogin ? 'Signing in...' : 'Creating account...'}</span>
                            </div>
                        )}
                        {retryAfter > 0 && (
                            <div className="status-retry">
                                Try again in {retryAfter}s
                            </div>
                        )}
                        {!loading && retryAfter === 0 && (
                            <div className="status-hint">
                                {username.length < 3
                                    ? 'Enter username'
                                    : pin.length < 6
                                        ? 'Enter 6-digit PIN'
                                        : 'Verifying...'}
                            </div>
                        )}
                    </div>
                </form>

                <div className="login-switch">
                    {isLogin ? (
                        <>
                            Don't have an account?{' '}
                            <button onClick={() => { setIsLogin(false); setError(''); }}>
                                Sign up
                            </button>
                        </>
                    ) : (
                        <>
                            Already have an account?{' '}
                            <button onClick={() => { setIsLogin(true); setError(''); }}>
                                Sign in
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
