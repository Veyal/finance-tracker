import { useState } from 'react';
import { Mail, Loader2, AlertCircle, CheckCircle, Unlink } from 'lucide-react';
import { isConnected, startOAuthFlow, disconnect } from '../services/gmailAuth';
import { syncFromGmail, GmailAuthError } from '../services/gmailSync';
import { transactions as transactionsApi, categories, groups, paymentMethods } from '../api/api';
import DatePicker from './DatePicker';
import './GmailSyncButton.css';

export default function GmailSyncButton({ onSyncComplete }) {
    const [connected, setConnected] = useState(() => isConnected());
    const [since, setSince] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        return d.toISOString().split('T')[0];
    });
    const [syncing, setSyncing] = useState(false);
    const [error, setError] = useState(null);
    const [lastResult, setLastResult] = useState(null);

    function handleConnect() {
        startOAuthFlow();
    }

    function handleDisconnect() {
        disconnect();
        setConnected(false);
        setLastResult(null);
        setError(null);
    }

    async function handleSync() {
        setError(null);
        setLastResult(null);
        setSyncing(true);
        try {
            const [cats, grps, pms] = await Promise.all([
                categories.list('true'),
                groups.list('true'),
                paymentMethods.list('true'),
            ]);

            const { transactions: parsed, parseErrors } = await syncFromGmail({
                since: new Date(since + 'T00:00:00'),
                categories: cats,
                groups: grps,
                paymentMethods: pms,
            });

            if (parsed.length === 0) {
                setLastResult({ count: 0, parseErrors });
                return;
            }

            const result = await transactionsApi.bulk(parsed, { dryRun: true });
            setLastResult({ count: parsed.length, parseErrors });
            onSyncComplete(result);
        } catch (err) {
            if (err instanceof GmailAuthError) {
                setConnected(false);
                setError(err.message);
            } else {
                setError(err.message || 'Sync failed. Please try again.');
            }
        } finally {
            setSyncing(false);
        }
    }

    if (!connected) {
        return (
            <div className="gmail-sync-widget">
                <div className="gmail-sync-header">
                    <div className="gmail-icon"><Mail size={18} /></div>
                    <div className="item-text-v2">
                        <span>Gmail Sync</span>
                        <small>Connect Gmail to import bank transactions</small>
                    </div>
                </div>
                {error && (
                    <div className="gmail-feedback error">
                        <AlertCircle size={13} />
                        <span>{error}</span>
                    </div>
                )}
                <button className="btn btn-secondary gmail-connect-btn" onClick={handleConnect}>
                    Connect Gmail →
                </button>
            </div>
        );
    }

    return (
        <div className="gmail-sync-widget">
            <div className="gmail-sync-header">
                <div className="gmail-icon connected"><Mail size={18} /></div>
                <div className="item-text-v2">
                    <span>Gmail Sync <span className="gmail-connected-badge">● Connected</span></span>
                    <small>Fetch bank emails and import as transactions</small>
                </div>
            </div>

            <div className="gmail-sync-controls">
                <div className="gmail-date-row">
                    <DatePicker
                        label="Sync since"
                        value={since}
                        onChange={setSince}
                        disabled={syncing}
                    />
                </div>
                <div className="gmail-action-row">
                    <button className="btn btn-primary" onClick={handleSync} disabled={syncing}>
                        {syncing
                            ? <><Loader2 size={15} className="spin" /> Fetching emails…</>
                            : 'Sync from Gmail'}
                    </button>
                    <button
                        className="btn btn-ghost gmail-disconnect-btn"
                        onClick={handleDisconnect}
                        disabled={syncing}
                    >
                        <Unlink size={13} /> Disconnect
                    </button>
                </div>
            </div>

            {error && (
                <div className="gmail-feedback error">
                    <AlertCircle size={13} />
                    <span>{error}</span>
                </div>
            )}

            {lastResult && !error && (
                <div className="gmail-feedback success">
                    <CheckCircle size={13} />
                    <span>
                        {lastResult.count === 0
                            ? `No new bank emails found since ${since}`
                            : `Found ${lastResult.count} transaction${lastResult.count !== 1 ? 's' : ''}${lastResult.parseErrors > 0 ? ` (${lastResult.parseErrors} skipped)` : ''}`
                        }
                    </span>
                </div>
            )}
        </div>
    );
}
