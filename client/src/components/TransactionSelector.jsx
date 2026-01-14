import { useState, useEffect } from 'react';
import { Search, Calendar, ChevronDown, Check } from 'lucide-react';
import { transactions } from '../api/api';
import './TransactionSelector.css';

export default function TransactionSelector({ onSelect, onClose }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [txs, setTxs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [dateFilter, setDateFilter] = useState('');

    useEffect(() => {
        searchTransactions();
    }, [searchTerm, dateFilter]);

    async function searchTransactions() {
        setLoading(true);
        try {
            // Fetch transactions with filters
            // We might need a proper search endpoint, but 'list' with params works for now
            const params = {
                type: 'expense',
                limit: 20
            };
            if (dateFilter) params.date = dateFilter;

            // Note: Currently API might not support 'search' param efficiently without update, 
            // but let's assume client-side filtering or basic support for now if API doesn't.
            // Actually, let's just fetch recent expenses and filter client-side for simplicity 
            // unless we update backend searching.

            const result = await transactions.list(params);

            let filtered = result.transactions || [];
            if (searchTerm) {
                const lower = searchTerm.toLowerCase();
                filtered = filtered.filter(t =>
                    (t.merchant && t.merchant.toLowerCase().includes(lower)) ||
                    (t.note && t.note.toLowerCase().includes(lower)) ||
                    (t.amount && t.amount.toString().includes(lower))
                );
            }
            setTxs(filtered);
        } catch (error) {
            console.error('Failed to search transactions:', error);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="tx-selector">
            <div className="tx-selector-header">
                <div className="search-bar">
                    <Search size={18} className="search-icon" />
                    <input
                        type="text"
                        placeholder="Search expense (e.g. Lunch)"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="search-input"
                        autoFocus
                    />
                </div>
                <div className="date-filter">
                    <input
                        type="date"
                        value={dateFilter}
                        onChange={e => setDateFilter(e.target.value)}
                        className="date-input"
                    />
                </div>
            </div>

            <div className="tx-list">
                {loading ? (
                    <div className="tx-loading">Loading...</div>
                ) : txs.length === 0 ? (
                    <div className="tx-empty">No expenses found</div>
                ) : (
                    txs.map(tx => (
                        <div key={tx.id} className="tx-item" onClick={() => onSelect(tx)}>
                            <div className="tx-info">
                                <div className="tx-merchant">{tx.merchant || 'Unnamed Expense'}</div>
                                <div className="tx-date">{new Date(tx.date).toLocaleDateString()}</div>
                            </div>
                            <div className="tx-amount">
                                {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(tx.amount)}
                            </div>
                        </div>
                    ))
                )}
            </div>

            <button className="close-selector-btn" onClick={onClose}>
                Cancel
            </button>
        </div>
    );
}
