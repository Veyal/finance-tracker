import { useState, useEffect } from 'react';
import { X, ArrowDownLeft, Plus, Loader2, Receipt, Users, Check, Edit2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { transactions, lendingSources, paymentMethods } from '../api/api';
import { usePrivacy } from '../context/PrivacyContext';
import useLockBodyScroll from '../hooks/useLockBodyScroll';
import RepaymentEditModal from './RepaymentEditModal';
import ConfirmDialog from './ConfirmDialog';
import CustomSelect from './CustomSelect';
import './TransactionDetailModal.css';

function formatAmount(amount) {
    return new Intl.NumberFormat('id-ID').format(amount);
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
}

export default function TransactionDetailModal({ transaction, onClose, onEdit, onDelete, onRepaymentAdded }) {
    useLockBodyScroll();
    const [loading, setLoading] = useState(true);
    const [details, setDetails] = useState(null);
    const { isPrivacyMode } = usePrivacy();

    // Inline repayment form state
    const [showRepayForm, setShowRepayForm] = useState(false);
    const [people, setPeople] = useState([]);
    const [methods, setMethods] = useState([]);
    const [repayAmount, setRepayAmount] = useState('');
    const [repayPersonId, setRepayPersonId] = useState('');
    const [repayMethodId, setRepayMethodId] = useState('');

    // New entity creation state
    const [showNewPerson, setShowNewPerson] = useState(false);
    const [newPersonName, setNewPersonName] = useState('');
    const [showNewMethod, setShowNewMethod] = useState(false);
    const [newMethodName, setNewMethodName] = useState('');

    const [submitting, setSubmitting] = useState(false);

    // Edit Repayment State
    const [editingRepayment, setEditingRepayment] = useState(null);

    // Delete confirmation state
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    useEffect(() => {
        loadDetails();
        // Load options proactively in case user wants to edit immediately
        loadRepayOptions();
    }, [transaction.id]);

    async function loadDetails() {
        try {
            setLoading(true);
            const result = await transactions.getDetails(transaction.id);
            setDetails(result);
        } catch (error) {
            console.error('Failed to load transaction details:', error);
            setDetails(transaction);
        } finally {
            setLoading(false);
        }
    }

    async function loadRepayOptions() {
        try {
            const [peopleResult, methodsResult] = await Promise.all([
                lendingSources.list(),
                paymentMethods.list()
            ]);
            setPeople(peopleResult);
            setMethods(methodsResult);
        } catch (error) {
            console.error('Failed to load repayment options:', error);
        }
    }

    async function handleSubmitRepayment(e) {
        e.preventDefault();

        // Validation
        if (!repayAmount) return;
        if (!repayPersonId && !newPersonName) return;

        try {
            setSubmitting(true);

            let finalPersonId = repayPersonId;
            let finalMethodId = repayMethodId;

            // Create new person if needed
            if (showNewPerson) {
                const newPerson = await lendingSources.create({ name: newPersonName });
                finalPersonId = newPerson.id;
                // Update local list
                setPeople(prev => [...prev, newPerson]);
            }

            // Create new method if needed
            if (showNewMethod && newMethodName) {
                const newMethod = await paymentMethods.create({ name: newMethodName });
                finalMethodId = newMethod.id;
                // Update local list
                setMethods(prev => [...prev, newMethod]);
            }

            await transactions.create({
                type: 'repayment',
                amount: parseFloat(repayAmount),
                date: new Date().toISOString(),
                lending_source_id: finalPersonId,
                payment_method_id: finalMethodId || undefined,
                related_transaction_id: details.id,
            });

            // Reset form and reload details
            setRepayAmount('');
            setRepayPersonId('');
            setNewPersonName('');
            setShowNewPerson(false);
            setRepayMethodId('');
            setNewMethodName('');
            setShowNewMethod(false);
            setShowRepayForm(false);
            await loadDetails();

            if (onRepaymentAdded) {
                onRepaymentAdded();
            }
        } catch (error) {
            console.error('Failed to add repayment:', error);
            alert('Failed to add repayment');
        } finally {
            setSubmitting(false);
        }
    }

    const hasRepayments = details?.repayments?.length > 0;
    const netAmount = details?.net_amount ?? details?.amount;

    // Handle drag end - close if dragged down enough
    function handleDragEnd(event, info) {
        if (info.offset.y > 100) {
            onClose();
        }
    }

    return (
        <motion.div
            className="tx-detail-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <motion.div
                className="tx-detail-modal"
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 400 }}
                drag="y"
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={{ top: 0, bottom: 0.5 }}
                onDragEnd={handleDragEnd}
            >
                {/* Drag handle indicator */}
                <div className="modal-drag-handle">
                    <div className="drag-indicator" />
                </div>

                {/* Close button */}
                <button className="tx-detail-close" onClick={onClose}>
                    <X size={24} />
                </button>

                {loading ? (
                    <div className="tx-detail-loading">
                        <Loader2 size={32} className="spin" />
                    </div>
                ) : (
                    <div className="tx-detail-content">
                        {/* Hero section with amount */}
                        <div className={`tx-detail-hero ${details.type}`}>
                            <div className="tx-detail-icon">
                                <Receipt size={28} />
                            </div>
                            <div className="tx-detail-merchant">
                                {details.merchant || details.category_name || 'Transaction'}
                            </div>
                            <div className="tx-detail-amount">
                                {isPrivacyMode ? '****' : (
                                    <>
                                        <span className="amount-prefix">{details.type === 'expense' ? '-' : '+'}Rp</span>
                                        <span className="amount-value">
                                            {hasRepayments ? formatAmount(netAmount) : formatAmount(details.amount)}
                                        </span>
                                    </>
                                )}
                            </div>
                            {hasRepayments && !isPrivacyMode && (
                                <div className="tx-detail-original">
                                    Original: Rp {formatAmount(details.amount)}
                                </div>
                            )}
                            <div className="tx-detail-date">
                                {formatDate(details.date)}
                            </div>
                        </div>

                        {/* Details section */}
                        <div className="tx-detail-info">
                            {details.category_name && (
                                <div className="tx-info-row">
                                    <span className="info-label">Category</span>
                                    <span className="info-value">{details.category_name}</span>
                                </div>
                            )}
                            {details.group_name && (
                                <div className="tx-info-row">
                                    <span className="info-label">Group</span>
                                    <span className="info-value">{details.group_name}</span>
                                </div>
                            )}
                            {details.payment_method_name && (
                                <div className="tx-info-row">
                                    <span className="info-label">Paid with</span>
                                    <span className="info-value">{details.payment_method_name}</span>
                                </div>
                            )}
                            {details.note && (
                                <div className="tx-info-row">
                                    <span className="info-label">Note</span>
                                    <span className="info-value">{details.note}</span>
                                </div>
                            )}
                        </div>

                        {/* Repayments section */}
                        {details.type === 'expense' && (
                            <div className="tx-repayments-section">
                                <div className="section-header">
                                    <h3>
                                        <Users size={16} />
                                        Repayments
                                    </h3>
                                    {!showRepayForm && (
                                        <button
                                            className="add-repayment-btn"
                                            onClick={() => setShowRepayForm(true)}
                                        >
                                            <Plus size={16} />
                                            Add
                                        </button>
                                    )}
                                </div>

                                {/* Inline Repayment Form */}
                                <AnimatePresence>
                                    {showRepayForm && (
                                        <motion.form
                                            className="inline-repay-form"
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            onSubmit={handleSubmitRepayment}
                                        >
                                            <div className="repay-form-row">
                                                {!showNewPerson ? (
                                                    <div className="select-with-action">
                                                        <CustomSelect
                                                            value={repayPersonId}
                                                            onChange={setRepayPersonId}
                                                            options={people}
                                                            placeholder="Who paid you?"
                                                            onAddNew={() => setShowNewPerson(true)}
                                                            addNewLabel="Add Person"
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="input-with-action">
                                                        <input
                                                            type="text"
                                                            className="repay-input"
                                                            placeholder="Enter name..."
                                                            value={newPersonName}
                                                            onChange={(e) => setNewPersonName(e.target.value)}
                                                            autoFocus
                                                        />
                                                        <button
                                                            type="button"
                                                            className="cancel-new-mini-btn"
                                                            onClick={() => setShowNewPerson(false)}
                                                            title="Cancel"
                                                        >
                                                            <X size={16} />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="repay-form-row">
                                                <div className="repay-amount-input">
                                                    <span className="currency">Rp</span>
                                                    <input
                                                        type="number"
                                                        placeholder="Amount"
                                                        value={repayAmount}
                                                        onChange={(e) => setRepayAmount(e.target.value)}
                                                        required
                                                    />
                                                </div>
                                            </div>

                                            <div className="repay-form-row">
                                                {!showNewMethod ? (
                                                    <div className="select-with-action">
                                                        <CustomSelect
                                                            value={repayMethodId}
                                                            onChange={setRepayMethodId}
                                                            options={methods}
                                                            placeholder="Paid via (optional)"
                                                            onAddNew={() => setShowNewMethod(true)}
                                                            addNewLabel="Add Method"
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="input-with-action">
                                                        <input
                                                            type="text"
                                                            className="repay-input"
                                                            placeholder="Method name..."
                                                            value={newMethodName}
                                                            onChange={(e) => setNewMethodName(e.target.value)}
                                                            autoFocus
                                                        />
                                                        <button
                                                            type="button"
                                                            className="cancel-new-mini-btn"
                                                            onClick={() => setShowNewMethod(false)}
                                                            title="Cancel"
                                                        >
                                                            <X size={16} />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="repay-form-actions">
                                                <button
                                                    type="button"
                                                    className="repay-cancel"
                                                    onClick={() => setShowRepayForm(false)}
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    type="submit"
                                                    className="repay-submit"
                                                    disabled={submitting || !repayAmount || (!repayPersonId && !newPersonName)}
                                                >
                                                    {submitting ? <Loader2 size={16} className="spin" /> : <Check size={16} />}
                                                    {submitting ? 'Saving...' : 'Save'}
                                                </button>
                                            </div>
                                        </motion.form>
                                    )}
                                </AnimatePresence>

                                {hasRepayments && (
                                    <div className="repayments-list">
                                        {details.repayments.map((repayment, index) => (
                                            <motion.div
                                                key={repayment.id}
                                                className="repayment-card"
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: index * 0.05 }}
                                                onClick={() => setEditingRepayment(repayment)}
                                                style={{ cursor: 'pointer' }}
                                            >
                                                <div className="repayment-card-icon">
                                                    <ArrowDownLeft size={16} />
                                                </div>
                                                <div className="repayment-card-info">
                                                    <span className="repayment-from">
                                                        {repayment.lending_source_name || 'Someone'}
                                                    </span>
                                                    <span className="repayment-when">
                                                        {formatDate(repayment.date)}
                                                    </span>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <div className="repayment-card-amount">
                                                        {isPrivacyMode ? '****' : `Rp ${formatAmount(repayment.amount)}`}
                                                    </div>
                                                    <Edit2 size={14} color="rgba(255,255,255,0.3)" />
                                                </div>
                                            </motion.div>
                                        ))}

                                        {/* Summary */}
                                        {!isPrivacyMode && (
                                            <div className="repayment-summary">
                                                <div className="summary-row">
                                                    <span>Original amount</span>
                                                    <span>Rp {formatAmount(details.amount)}</span>
                                                </div>
                                                <div className="summary-row">
                                                    <span>Total repaid</span>
                                                    <span className="repaid">- Rp {formatAmount(details.repayment_total)}</span>
                                                </div>
                                                <div className="summary-row total">
                                                    <span>You paid</span>
                                                    <span>Rp {formatAmount(netAmount)}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {!hasRepayments && !showRepayForm && (
                                    <div className="no-repayments">
                                        <p>No repayments logged yet</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Actions */}
                        <div className="tx-detail-actions">
                            {onEdit && (
                                <button className="action-btn edit" onClick={() => onEdit(details)}>
                                    Edit
                                </button>
                            )}
                            {onDelete && (
                                <button className="action-btn delete" onClick={() => setShowDeleteConfirm(true)}>
                                    Delete
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* Edit Repayment Modal */}
                <AnimatePresence>
                    {editingRepayment && (
                        <RepaymentEditModal
                            repayment={editingRepayment}
                            onClose={() => setEditingRepayment(null)}
                            onUpdate={() => {
                                loadDetails(); // Reload details to update totals
                                if (onRepaymentAdded) onRepaymentAdded(); // Notify parent
                            }}
                            sources={people}
                            paymentMethods={methods}
                        />
                    )}
                </AnimatePresence>

                {/* Delete Confirmation Dialog */}
                <ConfirmDialog
                    isOpen={showDeleteConfirm}
                    title="Delete Transaction"
                    message="Are you sure you want to delete this transaction? This action cannot be undone."
                    confirmText="Delete"
                    cancelText="Cancel"
                    variant="destructive"
                    onConfirm={() => {
                        setShowDeleteConfirm(false);
                        onDelete(details.id);
                        onClose();
                    }}
                    onCancel={() => setShowDeleteConfirm(false)}
                />

            </motion.div>
        </motion.div>
    );
}
