import { getValidToken, refreshAccessToken, isConnected } from './gmailAuth.js';
import { parseMessage } from './gmailParser.js';

const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1/users/me';

const SENDERS = [
    'Maybank_Notification_Trx@maybank.co.id',
    'CREDITCARD.NOTIFICATION@cimbniaga.co.id',
    'notifikasi.kartukredit@bankmega.com',
    'bca@bca.co.id',
    'alerts@seabank.co.id',
];

export class GmailAuthError extends Error {
    constructor(msg = 'Gmail session expired. Please reconnect.') {
        super(msg);
        this.name = 'GmailAuthError';
    }
}

async function gmailGet(path, token) {
    const res = await fetch(`${GMAIL_API}${path}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 401) {
        const e = new Error('401');
        e.status = 401;
        throw e;
    }
    if (!res.ok) throw new Error(`Gmail API error ${res.status}`);
    return res.json();
}

export async function syncFromGmail({ since, categories = [], groups = [], paymentMethods = [] }) {
    if (!isConnected()) throw new GmailAuthError();

    let token = await getValidToken();

    const sinceStr = [
        since.getFullYear(),
        String(since.getMonth() + 1).padStart(2, '0'),
        String(since.getDate()).padStart(2, '0'),
    ].join('/');

    const fromQuery = SENDERS.map(s => `from:${s}`).join(' OR ');
    const query = `(${fromQuery}) after:${sinceStr}`;

    async function fetchRetry(path) {
        try {
            return await gmailGet(path, token);
        } catch (err) {
            if (err.status === 401) {
                try {
                    await refreshAccessToken();
                    token = await getValidToken();
                    return await gmailGet(path, token);
                } catch {
                    throw new GmailAuthError();
                }
            }
            throw err;
        }
    }

    const listRes = await fetchRetry(`/messages?q=${encodeURIComponent(query)}`);
    const messageIds = listRes.messages || [];

    const transactions = [];
    let parseErrors = 0;

    for (const { id } of messageIds) {
        try {
            const msg = await fetchRetry(`/messages/${id}?format=full`);
            const parsed = parseMessage(msg, { categories, groups, paymentMethods });
            if (parsed) transactions.push(parsed);
            else parseErrors++;
        } catch (err) {
            if (err instanceof GmailAuthError) throw err;
            parseErrors++;
        }
    }

    transactions.sort((a, b) => b.date.localeCompare(a.date));

    return { transactions, parseErrors };
}
