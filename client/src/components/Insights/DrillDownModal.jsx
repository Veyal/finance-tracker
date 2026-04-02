import { useState, useEffect, useCallback } from 'react';
import { X, Loader2, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { transactions as transactionsApi } from '../../api/api';
import TransactionCard from '../TransactionCard';
import useLockBodyScroll from '../../hooks/useLockBodyScroll';
import { usePrivacy } from '../../context/PrivacyContext';
import { formatCurrency } from '../../utils/format';
import './DrillDownModal.css';

/**
 * DrillDownModal component for displaying transactions related to a specific category or point in time.
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the modal is open
 * @param {Function} props.onClose - Callback to close the modal
 * @param {string} props.title - Title of the modal (e.g., Category Name)
 * @param {Object} props.filters - Filters to pass to the transactions.list API
 * @param {Function} [props.onTransactionClick] - Optional callback when a transaction is clicked
 */
export default function DrillDownModal({ isOpen, onClose, title, filters, onTransactionClick }) {
    const { isPrivacyMode } = usePrivacy();
    useLockBodyScroll(isOpen);
    const [loading, setLoading] = useState(false);
    const [transactions, setTransactions] = useState([]);
    const [error, setError] = useState(null);

    const filtersKey = filters ? Object.keys(filters).sort().map(k => `${k}=${filters[k]}`).join('&') : '';

    useEffect(() => {
        if (isOpen && filters) {
            loadTransactions();
        }
    }, [isOpen, filtersKey, loadTransactions]);

    const loadTransactions = useCallback(async function loadTransactions() {
        try {
            setLoading(true);
            setError(null);
            const result = await transactionsApi.list(filters);
            // result is { transactions: [], totals: {}, next_cursor: ... }
            const txList = result?.transactions;
            setTransactions(Array.isArray(txList) ? txList : []);
        } catch (err) {
            console.error('Failed to load drill-down transactions:', err);
            setError('Failed to load transactions');
        } finally {
            setLoading(false);
        }
    }, [filters]);

    if (!isOpen) return null;

    const totalCount = transactions.length;
    const totalAmount = transactions.reduce((sum, t) => {
        // Use net_amount if available (has repayments), otherwise amount
        const val = (t.repayment_total > 0 && t.net_amount !== undefined) ? t.net_amount : t.amount;
        return sum + val;
    }, 0);

    // Determine primary type for color coding
    const primaryType = transactions.length > 0 ? transactions[0].type : (filters?.type || 'expense');

    return (
        <div className="modal-overlay drill-down-modal" onClick={onClose}>
            <motion.div
                className="modal"
                onClick={e => e.stopPropagation()}
                initial={{ opacity: 0, translateY: 40 }}
                animate={{ opacity: 1, translateY: 0 }}
                exit={{ opacity: 0, translateY: 40 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
                <div className="modal-header">
                    <h2>{title}</h2>
                    <button className="btn-close" onClick={onClose} aria-label="Close">
                        <X size={20} />
                    </button>
                </div>

                <div className="modal-body">
                    {loading ? (
                        <div className="drill-down-loading">
                            <Loader2 className="spinner" size={40} />
                            <span>Loading transactions...</span>
                        </div>
                    ) : error ? (
                        <div className="drill-down-empty">
                            <AlertCircle size={40} />
                            <span>{error}</span>
                            <button 
                                className="btn btn-secondary" 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    loadTransactions();
                                }}
                            >
                                Try Again
                            </button>
                        </div>
                    ) : transactions.length === 0 ? (
                        <div className="drill-down-empty">
                            <span>No transactions found for this period.</span>
                        </div>
                    ) : (
                        <>
                            <div className="drill-down-summary">
                                <div className="summary-item">
                                    <span className="summary-label">Transactions</span>
                                    <span className="summary-value">{totalCount}</span>
                                </div>
                                <div className="summary-item">
                                    <span className="summary-label">Total Amount</span>
                                    <span className={`summary-value amount-${primaryType}`}>
                                        {isPrivacyMode ? '••••' : `${primaryType === 'expense' ? '-' : '+'} ${formatCurrency(totalAmount)}`}
                                    </span>
                                </div>
                            </div>

                            <div className="drill-down-list">
                                {transactions.map(transaction => (
                                    <TransactionCard
                                        key={transaction.id}
                                        transaction={transaction}
                                        onClick={onTransactionClick}
                                    />
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
