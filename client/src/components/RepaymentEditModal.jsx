import { useState, useEffect } from 'react';
import { X, Loader2, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { transactions } from '../api/api';
import { useHaptics } from '../hooks/useHaptics';

export default function RepaymentEditModal({ repayment, onClose, onUpdate, sources, paymentMethods }) {
    const { triggerImpact, triggerSuccess, triggerError } = useHaptics();

    const [amount, setAmount] = useState('');
    const [date, setDate] = useState('');
    const [sourceId, setSourceId] = useState('');
    const [pmId, setPmId] = useState('');
    const [note, setNote] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (repayment) {
            setAmount(repayment.amount.toString());
            setDate(new Date(repayment.date).toISOString().split('T')[0]);
            setSourceId(repayment.lending_source_id || '');
            setPmId(repayment.payment_method_id || '');
            setNote(repayment.note || '');
        }
    }, [repayment]);

    async function handleSubmit(e) {
        e.preventDefault();
        if (!amount || !sourceId) return;

        setSubmitting(true);
        triggerImpact('medium');

        try {
            await transactions.update(repayment.id, {
                amount: parseFloat(amount),
                date: new Date(date).toISOString(),
                lending_source_id: sourceId,
                payment_method_id: pmId || null,
                note: note
            });

            triggerSuccess();
            onUpdate();
            onClose();
        } catch (error) {
            console.error('Failed to update repayment:', error);
            triggerError();
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <motion.div
            className="modal-overlay full-screen-mobile"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => e.target === e.currentTarget && onClose()}
            style={{ zIndex: 1100 }} // Ensure it's above other modals
        >
            <motion.div
                className="edit-modal"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
            >
                <div className="modal-header">
                    <h3>Edit Repayment</h3>
                    <button className="modal-close" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="edit-form">
                    <div className="form-group">
                        <label>Amount</label>
                        <div className="amount-input-v2 small">
                            <span className="prefix">Rp</span>
                            <input
                                type="number"
                                value={amount}
                                onChange={e => setAmount(e.target.value)}
                                autoFocus
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Date</label>
                        <input
                            type="date"
                            value={date}
                            onChange={e => setDate(e.target.value)}
                            className="input"
                        />
                    </div>

                    <div className="form-group">
                        <label>From Person</label>
                        <select
                            value={sourceId}
                            onChange={e => setSourceId(e.target.value)}
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
                            value={pmId}
                            onChange={e => setPmId(e.target.value)}
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
                            value={note}
                            onChange={e => setNote(e.target.value)}
                            className="input"
                            placeholder="Add a note"
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
    );
}
