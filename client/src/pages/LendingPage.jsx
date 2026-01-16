import { useState, useEffect } from 'react';
import { Plus, Users, ChevronRight, Check, X, ArrowDownLeft, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { lendingSources, paymentMethods, transactions } from '../api/api';
import TransactionSelector from '../components/TransactionSelector';
import CustomSelect from '../components/CustomSelect';
import PersonRepaymentModal from '../components/PersonRepaymentModal';
import { useHaptics } from '../hooks/useHaptics';
import './LendingPage.css';

function formatAmount(amount) {
    return new Intl.NumberFormat('id-ID').format(amount);
}

export default function LendingPage() {
    const { triggerImpact, triggerSuccess, triggerError } = useHaptics();
    const [sources, setSources] = useState([]);
    const [pms, setPms] = useState([]);
    const [loading, setLoading] = useState(true);

    // Person detail modal
    const [selectedPerson, setSelectedPerson] = useState(null);

    // Repayment Modal State
    const [showRepayment, setShowRepayment] = useState(false);
    const [step, setStep] = useState(1); // 1: Select Tx, 2: Details
    const [selectedTx, setSelectedTx] = useState(null);
    const [repayAmount, setRepayAmount] = useState('');
    const [repayDate, setRepayDate] = useState(new Date().toISOString().split('T')[0]);
    const [repaySourceId, setRepaySourceId] = useState('');
    const [repayPmId, setRepayPmId] = useState('');
    const [repayNote, setRepayNote] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Source Management State
    const [showAddSource, setShowAddSource] = useState(false);
    const [newSourceName, setNewSourceName] = useState('');
    const [newSourceColor, setNewSourceColor] = useState('#4ECDC4');

    // Payment Method Management State
    const [showAddPm, setShowAddPm] = useState(false);
    const [newPmName, setNewPmName] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        try {
            setLoading(true);
            const [srcs, methods] = await Promise.all([
                lendingSources.list(),
                paymentMethods.list('true')
            ]);
            setSources(srcs || []);
            setPms(methods || []);
        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleAddSource(e) {
        e.preventDefault();
        if (!newSourceName.trim()) return;
        try {
            triggerImpact('medium');
            const newSource = await lendingSources.create({ name: newSourceName.trim(), color: newSourceColor });
            setNewSourceName('');
            setShowAddSource(false);
            loadData();
            // Auto-select new source if in repayment flow
            if (showRepayment && step === 2) {
                setRepaySourceId(newSource.id);
            }
            triggerSuccess();
        } catch (error) {
            console.error('Failed to create source:', error);
            triggerError();
        }
    }

    async function handleAddPm(e) {
        e.preventDefault();
        if (!newPmName.trim()) return;
        try {
            triggerImpact('medium');
            const newPm = await paymentMethods.create({ name: newPmName.trim() });
            setNewPmName('');
            setShowAddPm(false);
            loadData();
            setRepayPmId(newPm.id);
            triggerSuccess();
        } catch (error) {
            console.error('Failed to create payment method:', error);
            triggerError();
        }
    }

    async function handleSubmitRepayment(e) {
        e.preventDefault();
        if (!selectedTx || !repayAmount || !repaySourceId || !repayPmId) return;

        setSubmitting(true);
        triggerImpact('medium');
        try {
            const data = {
                type: 'repayment',
                amount: parseFloat(repayAmount),
                date: new Date(repayDate).toISOString(),
                lending_source_id: repaySourceId,
                payment_method_id: repayPmId,
                related_transaction_id: selectedTx.id,
                note: repayNote || `Repayment for ${selectedTx.merchant || 'expense'}`,
                merchant: `Repayment: ${selectedTx.merchant || 'expense'}`
            };
            await transactions.create(data);
            setShowRepayment(false);
            resetRepaymentForm();
            loadData(); // Refresh totals
            triggerSuccess();
        } catch (error) {
            console.error('Failed to submit repayment:', error);
            triggerError();
        } finally {
            setSubmitting(false);
        }
    }

    function resetRepaymentForm() {
        setStep(1);
        setSelectedTx(null);
        setRepayAmount('');
        setRepayDate(new Date().toISOString().split('T')[0]);
        setRepaySourceId('');
        setRepayPmId('');
        setRepayNote('');
    }

    function openRepaymentFlow(preselectedTx = null) {
        if (preselectedTx) {
            setSelectedTx(preselectedTx);
            setRepayAmount(preselectedTx.amount.toString());
            setStep(2);
        } else {
            setStep(1);
        }
        setShowRepayment(true);
        triggerImpact('medium');
    }

    const colors = [
        '#4ECDC4', '#FF6B8A', '#FFE66D', '#A78BFA', '#34D399',
        '#F472B6', '#60A5FA', '#FBBF24'
    ];

    // Calculate total across all people
    const grandTotal = sources.reduce((sum, s) => sum + (s.total_repaid || 0), 0);

    return (
        <div className="page lending-page-v2">
            {/* Header */}
            <header className="lending-header-v2">
                <div className="header-content">
                    <h1>Repayments</h1>
                    <p className="subtitle">Track who owes you</p>
                </div>
                <button
                    className="add-person-btn"
                    onClick={() => setShowAddSource(true)}
                    aria-label="Add person"
                >
                    <Users size={20} />
                    <Plus size={14} className="plus-badge" />
                </button>
            </header>

            {/* Stats Card */}
            {grandTotal > 0 && (
                <motion.div
                    className="stats-card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <div className="stats-label">Total Collected</div>
                    <div className="stats-amount">Rp {formatAmount(grandTotal)}</div>
                </motion.div>
            )}

            {/* People List */}
            <div className="people-section">
                <div className="section-title">
                    <Users size={16} />
                    People
                    <span className="count">{sources.length}</span>
                </div>

                {loading ? (
                    <div className="loading-container">
                        <Loader2 size={32} className="spin" />
                    </div>
                ) : sources.length === 0 ? (
                    <div className="empty-people">
                        <div className="empty-icon">👥</div>
                        <p>No people added yet</p>
                        <button
                            className="add-first-person"
                            onClick={() => setShowAddSource(true)}
                        >
                            <Plus size={18} />
                            Add Person
                        </button>
                    </div>
                ) : (
                    <div className="people-grid">
                        {sources.map((source, index) => (
                            <motion.button
                                key={source.id}
                                className="person-card"
                                onClick={() => {
                                    setSelectedPerson(source);
                                    triggerImpact('light');
                                }}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <div
                                    className="person-avatar"
                                    style={{ backgroundColor: source.color || '#4ECDC4' }}
                                >
                                    {source.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="person-info">
                                    <span className="person-name">{source.name}</span>
                                    <span className="person-stat">
                                        {source.repayment_count || 0} repayments · Rp {formatAmount(source.total_repaid || 0)}
                                    </span>
                                </div>
                                <ChevronRight size={18} className="chevron" />
                            </motion.button>
                        ))}
                    </div>
                )}
            </div>

            {/* FAB - Add Repayment */}
            <motion.button
                className="fab repayment-fab"
                onClick={() => openRepaymentFlow()}
                whileTap={{ scale: 0.9 }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3, type: 'spring' }}
            >
                <ArrowDownLeft size={24} />
                <span>Log Repayment</span>
            </motion.button>

            {/* Person Detail Modal */}
            <AnimatePresence>
                {selectedPerson && (
                    <PersonRepaymentModal
                        person={selectedPerson}
                        onClose={() => setSelectedPerson(null)}
                        sources={sources}
                        paymentMethods={pms}
                        onUpdate={loadData}
                    />
                )}
            </AnimatePresence>

            {/* Repayment Flow Modal */}
            <AnimatePresence>
                {showRepayment && (
                    <motion.div
                        className="modal-overlay full-screen-mobile"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={(e) => e.target === e.currentTarget && setShowRepayment(false)}
                    >
                        <motion.div
                            className="repayment-modal-v2"
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 30, stiffness: 400 }}
                        >
                            {step === 1 && (
                                <TransactionSelector
                                    onClose={() => setShowRepayment(false)}
                                    onSelect={(tx) => {
                                        setSelectedTx(tx);
                                        setRepayAmount(tx.amount.toString());
                                        setStep(2);
                                        triggerImpact('medium');
                                    }}
                                />
                            )}

                            {step === 2 && (
                                <div className="repayment-form-v2">
                                    <div className="modal-header">
                                        <button
                                            className="back-btn"
                                            onClick={() => setStep(1)}
                                        >
                                            ←
                                        </button>
                                        <h2>Repayment Details</h2>
                                        <button
                                            className="modal-close"
                                            onClick={() => setShowRepayment(false)}
                                        >
                                            <X size={24} />
                                        </button>
                                    </div>

                                    {/* Reference Transaction */}
                                    <div className="reference-card">
                                        <div className="ref-label">For expense</div>
                                        <div className="ref-merchant">{selectedTx?.merchant || 'Expense'}</div>
                                        <div className="ref-amount">
                                            Rp {formatAmount(selectedTx?.amount || 0)}
                                        </div>
                                    </div>

                                    <form onSubmit={handleSubmitRepayment} className="repayment-form-fields">
                                        {/* Amount */}
                                        <div className="form-group">
                                            <label>Amount Received</label>
                                            <div className="amount-input-v2">
                                                <span className="prefix">Rp</span>
                                                <input
                                                    type="number"
                                                    value={repayAmount}
                                                    onChange={e => setRepayAmount(e.target.value)}
                                                    placeholder="0"
                                                    autoFocus
                                                />
                                            </div>
                                        </div>

                                        {/* Date */}
                                        <div className="form-group">
                                            <label>Date</label>
                                            <input
                                                type="date"
                                                className="input"
                                                value={repayDate}
                                                onChange={e => setRepayDate(e.target.value)}
                                            />
                                        </div>

                                        {/* From Person */}
                                        <div className="form-group">
                                            <CustomSelect
                                                label="From"
                                                value={repaySourceId}
                                                onChange={setRepaySourceId}
                                                options={sources}
                                                placeholder="Who paid you?"
                                                onAddNew={() => setShowAddSource(true)}
                                                addNewLabel="Add Person"
                                            />
                                        </div>

                                        {/* To Account */}
                                        <div className="form-group">
                                            <CustomSelect
                                                label="To Account"
                                                value={repayPmId}
                                                onChange={setRepayPmId}
                                                options={pms}
                                                placeholder="Received to..."
                                                onAddNew={() => setShowAddPm(true)}
                                                addNewLabel="Add Account"
                                            />
                                        </div>

                                        {/* Note */}
                                        <div className="form-group">
                                            <label>Note (optional)</label>
                                            <input
                                                type="text"
                                                className="input"
                                                value={repayNote}
                                                onChange={e => setRepayNote(e.target.value)}
                                                placeholder="Add a note..."
                                            />
                                        </div>

                                        <motion.button
                                            type="submit"
                                            className="submit-repayment-btn"
                                            disabled={submitting || !repayAmount || !repaySourceId || !repayPmId}
                                            whileTap={{ scale: 0.98 }}
                                        >
                                            {submitting ? (
                                                <Loader2 size={20} className="spin" />
                                            ) : (
                                                <>
                                                    <Check size={20} />
                                                    Save Repayment
                                                </>
                                            )}
                                        </motion.button>
                                    </form>
                                </div>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Add Person Modal */}
            <AnimatePresence>
                {showAddSource && (
                    <motion.div
                        className="modal-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={(e) => e.target === e.currentTarget && setShowAddSource(false)}
                    >
                        <motion.div
                            className="add-modal"
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                        >
                            <div className="modal-header">
                                <h2>Add Person</h2>
                                <button className="modal-close" onClick={() => setShowAddSource(false)}>
                                    <X size={24} />
                                </button>
                            </div>
                            <form onSubmit={handleAddSource}>
                                <div className="form-group">
                                    <label>Name</label>
                                    <input
                                        type="text"
                                        value={newSourceName}
                                        onChange={(e) => setNewSourceName(e.target.value)}
                                        placeholder="e.g. John Doe"
                                        autoFocus
                                        className="input"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Color</label>
                                    <div className="color-picker">
                                        {colors.map(c => (
                                            <button
                                                key={c}
                                                type="button"
                                                className={`color-dot ${newSourceColor === c ? 'selected' : ''}`}
                                                style={{ backgroundColor: c }}
                                                onClick={() => setNewSourceColor(c)}
                                            />
                                        ))}
                                    </div>
                                </div>
                                <button
                                    type="submit"
                                    className="submit-btn"
                                    disabled={!newSourceName.trim()}
                                >
                                    Add Person
                                </button>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Add Payment Method Modal */}
            <AnimatePresence>
                {showAddPm && (
                    <motion.div
                        className="modal-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={(e) => e.target === e.currentTarget && setShowAddPm(false)}
                    >
                        <motion.div
                            className="add-modal"
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                        >
                            <div className="modal-header">
                                <h2>Add Account</h2>
                                <button className="modal-close" onClick={() => setShowAddPm(false)}>
                                    <X size={24} />
                                </button>
                            </div>
                            <form onSubmit={handleAddPm}>
                                <div className="form-group">
                                    <label>Account Name</label>
                                    <input
                                        type="text"
                                        value={newPmName}
                                        onChange={(e) => setNewPmName(e.target.value)}
                                        placeholder="e.g. BCA, Cash"
                                        autoFocus
                                        className="input"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    className="submit-btn"
                                    disabled={!newPmName.trim()}
                                >
                                    Add Account
                                </button>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
