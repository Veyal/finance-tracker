import { useState, useEffect } from 'react';
import { X, ArrowDownLeft, ChevronRight, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { lendingSources } from '../api/api';
import './PersonRepaymentModal.css';

function formatAmount(amount) {
    return new Intl.NumberFormat('id-ID').format(amount);
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
}

export default function PersonRepaymentModal({ person, onClose }) {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);

    useEffect(() => {
        loadRepayments();
    }, [person.id]);

    async function loadRepayments() {
        try {
            setLoading(true);
            const result = await lendingSources.getRepayments(person.id);
            setData(result);
        } catch (error) {
            console.error('Failed to load repayments:', error);
        } finally {
            setLoading(false);
        }
    }

    return (
        <motion.div
            className="person-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <motion.div
                className="person-modal"
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 400 }}
            >
                {/* Header with person info */}
                <div className="person-modal-header">
                    <div
                        className="person-avatar-large"
                        style={{ backgroundColor: person.color || '#4ECDC4' }}
                    >
                        {person.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="person-info">
                        <h2>{person.name}</h2>
                        {data && (
                            <div className="person-total">
                                <span className="total-label">Total Repaid</span>
                                <span className="total-amount">Rp {formatAmount(data.total)}</span>
                            </div>
                        )}
                    </div>
                    <button className="close-btn" onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>

                {/* Repayments list */}
                <div className="person-modal-content">
                    {loading ? (
                        <div className="loading-state">
                            <Loader2 size={32} className="spin" />
                        </div>
                    ) : data?.repayments?.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-icon">💸</div>
                            <p>No repayments yet</p>
                        </div>
                    ) : (
                        <div className="repayments-list">
                            {data?.repayments?.map((repayment, index) => (
                                <motion.div
                                    key={repayment.id}
                                    className="repayment-item"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                >
                                    <div className="repayment-icon">
                                        <ArrowDownLeft size={18} />
                                    </div>
                                    <div className="repayment-details">
                                        <div className="repayment-primary">
                                            <span className="repayment-amount">
                                                Rp {formatAmount(repayment.amount)}
                                            </span>
                                            <span className="repayment-date">
                                                {formatDate(repayment.date)}
                                            </span>
                                        </div>
                                        {repayment.original_merchant && (
                                            <div className="repayment-ref">
                                                For: {repayment.original_merchant}
                                            </div>
                                        )}
                                        {repayment.payment_method_name && (
                                            <div className="repayment-method">
                                                → {repayment.payment_method_name}
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
}
