import { useState, useEffect } from 'react';
import { X, ArrowDownLeft, Edit2, Loader2, Check, Palette } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { lendingSources } from '../api/api';
import { useHaptics } from '../hooks/useHaptics';
import useLockBodyScroll from '../hooks/useLockBodyScroll';
import RepaymentEditModal from './RepaymentEditModal';
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
    useLockBodyScroll();
    const { triggerImpact, triggerSuccess, triggerError } = useHaptics();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);

    // Edit Repayment State
    const [editingRepayment, setEditingRepayment] = useState(null);

    // Edit Person State
    const [isEditingPerson, setIsEditingPerson] = useState(false);

    // Local display state for immediate feedback
    const [displayName, setDisplayName] = useState(person.name);
    const [displayColor, setDisplayColor] = useState(person.color || '#4ECDC4');

    // Form state
    const [editName, setEditName] = useState(person.name);
    const [editColor, setEditColor] = useState(person.color || '#4ECDC4');
    const [savingPerson, setSavingPerson] = useState(false);

    useEffect(() => {
        loadRepayments();
        // Sync local state if prop changes (e.g. re-opened with different person)
        setDisplayName(person.name);
        setDisplayColor(person.color || '#4ECDC4');
        setEditName(person.name);
        setEditColor(person.color || '#4ECDC4');
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
        triggerImpact('medium');
    }

    async function handleSavePerson(e) {
        e.preventDefault();
        if (!editName.trim()) return;

        setSavingPerson(true);
        triggerImpact('medium');

        try {
            await lendingSources.update(person.id, {
                name: editName.trim(),
                color: editColor
            });

            // Immediate UI update
            setDisplayName(editName.trim());
            setDisplayColor(editColor);

            triggerSuccess();
            setIsEditingPerson(false);

            if (onUpdate) onUpdate(); // Refresh parent list in background
        } catch (error) {
            console.error('Failed to update person:', error);
            triggerError();
            alert(error.error || 'Failed to update person');
        } finally {
            setSavingPerson(false);
        }
    }

    const colors = [
        '#4ECDC4', '#FF6B8A', '#FFE66D', '#A78BFA', '#34D399',
        '#F472B6', '#60A5FA', '#FBBF24', '#ff8e72'
    ];

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
                    <motion.div
                        className="person-avatar-large"
                        layout
                        style={{ backgroundColor: isEditingPerson ? editColor : displayColor }}
                    >
                        {isEditingPerson ? editName.charAt(0).toUpperCase() : displayName.charAt(0).toUpperCase()}
                    </motion.div>

                    <div className="person-header-content">
                        <AnimatePresence mode="wait" initial={false}>
                            {!isEditingPerson ? (
                                <motion.div
                                    key="view-mode"
                                    className="person-info-view"
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 10 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <div className="person-name-row">
                                        <h2>{displayName}</h2>
                                        <button
                                            className="edit-person-btn"
                                            onClick={() => {
                                                setEditName(displayName);
                                                setEditColor(displayColor);
                                                setIsEditingPerson(true);
                                                triggerImpact('light');
                                            }}
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                    </div>
                                    {data && (
                                        <div className="person-total">
                                            <span className="total-label">Total Repaid</span>
                                            <span className="total-amount">Rp {formatAmount(data.total)}</span>
                                        </div>
                                    )}
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="edit-mode"
                                    className="person-info-edit"
                                    initial={{ opacity: 0, x: 10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -10 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <form className="person-edit-form" onSubmit={handleSavePerson}>
                                        <div className="edit-input-wrapper">
                                            <input
                                                type="text"
                                                value={editName}
                                                onChange={e => setEditName(e.target.value)}
                                                className="edit-name-input-modern"
                                                placeholder="Enter name..."
                                                autoFocus
                                            />
                                        </div>

                                        <div className="edit-colors-scroll">
                                            <div className="colors-track">
                                                {colors.map(c => (
                                                    <button
                                                        key={c}
                                                        type="button"
                                                        className={`color-dot-modern ${editColor === c ? 'active' : ''}`}
                                                        style={{ backgroundColor: c }}
                                                        onClick={() => {
                                                            setEditColor(c);
                                                            triggerImpact('light');
                                                        }}
                                                    >
                                                        {editColor === c && <Check size={12} color="rgba(0,0,0,0.4)" strokeWidth={3} />}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="edit-actions-modern">
                                            <button
                                                type="button"
                                                className="cancel-btn-modern"
                                                onClick={() => setIsEditingPerson(false)}
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                className="save-btn-modern"
                                                disabled={savingPerson || !editName.trim()}
                                            >
                                                {savingPerson ? <Loader2 size={16} className="spin" /> : 'Save Changes'}
                                            </button>
                                        </div>
                                    </form>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {!isEditingPerson && (
                        <button className="close-btn" onClick={onClose}>
                            <X size={24} />
                        </button>
                    )}
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
                                        <div className="edit-icon">
                                            <Edit2 size={14} />
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Edit Repayment Modal */}
                <AnimatePresence>
                    {editingRepayment && (
                        <RepaymentEditModal
                            repayment={editingRepayment}
                            onClose={() => setEditingRepayment(null)}
                            onUpdate={() => {
                                loadRepayments();
                                if (onUpdate) onUpdate();
                            }}
                            sources={sources}
                            paymentMethods={paymentMethods}
                        />
                    )}
                </AnimatePresence>
            </motion.div>
        </motion.div>
    );
}
