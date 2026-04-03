const CLIENT_ID = import.meta.env.VITE_GMAIL_CLIENT_ID;
const CLIENT_SECRET = import.meta.env.VITE_GMAIL_CLIENT_SECRET;
const REDIRECT_URI = `${window.location.origin}/settings`;
const SCOPES = 'https://www.googleapis.com/auth/gmail.readonly';

const KEYS = {
    ACCESS: 'gmail_access_token',
    REFRESH: 'gmail_refresh_token',
    EXPIRY: 'gmail_token_expiry',
    VERIFIER: 'gmail_pkce_verifier',
};

function randomString(length) {
    const arr = new Uint8Array(length);
    crypto.getRandomValues(arr);
    return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('').slice(0, length);
}

async function sha256(plain) {
    const data = new TextEncoder().encode(plain);
    return crypto.subtle.digest('SHA-256', data);
}

function base64url(buffer) {
    return btoa(String.fromCharCode(...new Uint8Array(buffer)))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function storeTokens(tokens, keepRefresh = false) {
    localStorage.setItem(KEYS.ACCESS, tokens.access_token);
    if (tokens.refresh_token) {
        localStorage.setItem(KEYS.REFRESH, tokens.refresh_token);
    } else if (!keepRefresh) {
        // No new refresh token and not instructed to keep — leave existing
    }
    localStorage.setItem(KEYS.EXPIRY, String(Date.now() + tokens.expires_in * 1000));
}

export function isConnected() {
    return !!localStorage.getItem(KEYS.REFRESH);
}

export async function getValidToken() {
    if (!isConnected()) throw new Error('Not connected to Gmail');
    const expiry = parseInt(localStorage.getItem(KEYS.EXPIRY) || '0', 10);
    if (Date.now() >= expiry - 60_000) {
        await refreshAccessToken();
    }
    return localStorage.getItem(KEYS.ACCESS);
}

export async function startOAuthFlow() {
    const verifier = randomString(43);
    localStorage.setItem(KEYS.VERIFIER, verifier);
    const challenge = base64url(await sha256(verifier));

    const params = new URLSearchParams({
        client_id: CLIENT_ID,
        redirect_uri: REDIRECT_URI,
        response_type: 'code',
        scope: SCOPES,
        code_challenge: challenge,
        code_challenge_method: 'S256',
        access_type: 'offline',
        prompt: 'consent',
    });

    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export async function handleOAuthCallback(code) {
    const verifier = localStorage.getItem(KEYS.VERIFIER);
    if (!verifier) throw new Error('No PKCE verifier — did the OAuth flow start correctly?');

    const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            code,
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            code_verifier: verifier,
            redirect_uri: REDIRECT_URI,
            grant_type: 'authorization_code',
        }),
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error_description || 'OAuth token exchange failed');
    }

    storeTokens(await res.json());
    localStorage.removeItem(KEYS.VERIFIER);

    // Clean code/scope params from URL without reloading
    const url = new URL(window.location.href);
    url.searchParams.delete('code');
    url.searchParams.delete('scope');
    window.history.replaceState({}, '', url.toString());
}

export async function refreshAccessToken() {
    const refreshToken = localStorage.getItem(KEYS.REFRESH);
    if (!refreshToken) throw new Error('No refresh token');

    const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            refresh_token: refreshToken,
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            grant_type: 'refresh_token',
        }),
    });

    if (!res.ok) throw new Error('Token refresh failed — please reconnect Gmail');

    const tokens = await res.json();
    storeTokens({ ...tokens, refresh_token: tokens.refresh_token || refreshToken }, true);
}

export function disconnect() {
    Object.values(KEYS).forEach(k => localStorage.removeItem(k));
}
