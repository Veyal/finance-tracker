import { useState, useEffect } from 'react';
import { X, ArrowDownLeft, ChevronRight, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { lendingSources, transactions } from '../api/api';
import { useHaptics } from '../hooks/useHaptics';
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

export default function PersonRepaymentModal({ person, onClose, sources, paymentMethods, onUpdate }) {
    const { triggerImpact, triggerSuccess, triggerError } = useHaptics();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);

    // Edit State
    const [editingRepayment, setEditingRepayment] = useState(null);
    const [editAmount, setEditAmount] = useState('');
    const [editDate, setEditDate] = useState('');
    const [editSourceId, setEditSourceId] = useState('');
    const [editPmId, setEditPmId] = useState('');
    const [editNote, setEditNote] = useState('');
    const [submitting, setSubmitting] = useState(false);

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

    function startEditing(repayment) {
        setEditingRepayment(repayment);
        setEditAmount(repayment.amount.toString());
        setEditDate(new Date(repayment.date).toISOString().split('T')[0]);
        setEditSourceId(person.id); // Default to current person, but can change
        setEditPmId(repayment.payment_method_id || '');
        setEditNote(repayment.note || '');
        triggerImpact('medium');
    }

    async function handleUpdate(e) {
        e.preventDefault();
        if (!editingRepayment || !editAmount || !editSourceId) return;

        setSubmitting(true);
        triggerImpact('medium');

        try {
            await transactions.update(editingRepayment.id, {
                amount: parseFloat(editAmount),
                date: new Date(editDate).toISOString(),
                lending_source_id: editSourceId,
                payment_method_id: editPmId || null,
                note: editNote
            });

            setEditingRepayment(null);
            triggerSuccess();

            // If moved to another person, close modal or refresh
            if (editSourceId !== person.id) {
                onClose();
                if (onUpdate) onUpdate(); // Refresh parent
            } else {
                loadRepayments(); // Refresh list
                if (onUpdate) onUpdate(); // Refresh parent stats
            }

        } catch (error) {
            console.error('Failed to update repayment:', error);
            triggerError();
        } finally {
            setSubmitting(false);
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
                                    onClick={() => startEditing(repayment)}
                                    whileTap={{ scale: 0.98 }}
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
                                        {repayment.note && (
                                            <div className="repayment-note">
                                                "{repayment.note}"
                                            </div>
                                        )}
                                    </div>
                                    <div className="repayment-action">
                                        <div className="edit-icon">✎</div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Edit Modal (Nested) */}
                <AnimatePresence>
                    {editingRepayment && (
                        <motion.div
                            className="edit-modal-overlay"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={(e) => e.target === e.currentTarget && setEditingRepayment(null)}
                        >
                            <motion.div
                                className="edit-modal"
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                            >
                                <div className="modal-header">
                                    <h3>Edit Repayment</h3>
                                    <button className="modal-close" onClick={() => setEditingRepayment(null)}>
                                        <X size={20} />
                                    </button>
                                </div>

                                <form onSubmit={handleUpdate} className="edit-form">
                                    <div className="form-group">
                                        <label>Amount</label>
                                        <input
                                            type="number"
                                            value={editAmount}
                                            onChange={e => setEditAmount(e.target.value)}
                                            className="input"
                                            autoFocus
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>Date</label>
                                        <input
                                            type="date"
                                            value={editDate}
                                            onChange={e => setEditDate(e.target.value)}
                                            className="input"
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>From Person</label>
                                        <select
                                            value={editSourceId}
                                            onChange={e => setEditSourceId(e.target.value)}
                                            className="input select"
                                        >
                                            {sources?.map(s => (
                                                <option key={s.id} value={s.id}>{s.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="form-group">
                                        <label>To Account</label>
                                        <select
                                            value={editPmId}
                                            onChange={e => setEditPmId(e.target.value)}
                                            className="input select"
                                        >
                                            <option value="">None</option>
                                            {paymentMethods?.map(pm => (
                                                <option key={pm.id} value={pm.id}>{pm.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="form-group">
                                        <label>Note</label>
                                        <input
                                            type="text"
                                            value={editNote}
                                            onChange={e => setEditNote(e.target.value)}
                                            className="input"
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        className="submit-btn"
                                        disabled={submitting}
                                    >
                                        {submitting ? <Loader2 size={18} className="spin" /> : 'Save Changes'}
                                    </button>
                                </form>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </motion.div>
    );
}
