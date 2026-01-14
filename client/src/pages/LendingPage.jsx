import { useState, useEffect } from 'react';
import { Plus, Users, ChevronRight, Check, X, Search, FileText, ArrowDownLeft } from 'lucide-react';
import { lendingSources, paymentMethods, transactions } from '../api/api';
import TransactionSelector from '../components/TransactionSelector';
import CustomSelect from '../components/CustomSelect';
import './LendingPage.css';

export default function LendingPage() {
    const [sources, setSources] = useState([]);
    const [pms, setPms] = useState([]);
    const [loading, setLoading] = useState(true);

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
    const [newSourceColor, setNewSourceColor] = useState('#FF6B6B');

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
            await lendingSources.create({ name: newSourceName.trim(), color: newSourceColor });
            setNewSourceName('');
            setShowAddSource(false);
            loadData();
        } catch (error) {
            console.error('Failed to create source:', error);
        }
    }

    async function handleSubmitRepayment(e) {
        e.preventDefault();
        if (!selectedTx || !repayAmount || !repaySourceId || !repayPmId) return;

        setSubmitting(true);
        try {
            const data = {
                type: 'income',
                amount: parseFloat(repayAmount),
                date: new Date(repayDate).toISOString(),
                lending_source_id: repaySourceId,
                payment_method_id: repayPmId,
                related_transaction_id: selectedTx.id,
                note: repayNote || `Repayment for ${selectedTx.merchant}`,
                merchant: `Repayment: ${selectedTx.merchant}`
            };
            await transactions.create(data);
            setShowRepayment(false);
            resetRepaymentForm();
            // Could refresh list or show success toast
        } catch (error) {
            console.error('Failed to submit repayment:', error);
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

    const colors = [
        '#FF6B6B', '#4ECDC4', '#FFE66D', '#1A535C', '#FF9F1C',
        '#F7FFF7', '#2EC4B6', '#E71D36'
    ];

    return (
        <div className="page lending-page">
            <header className="lending-header">
                <div>
                    <h1>Split Repayments</h1>
                    <p className="subtitle">Track payments from others</p>
                </div>
                <button className="add-source-btn" onClick={() => setShowAddSource(true)}>
                    <Users size={20} />
                </button>
            </header>

            <div className="action-area">
                <button className="btn-repayment-hero" onClick={() => setShowRepayment(true)}>
                    <div className="hero-icon">
                        <ArrowDownLeft size={32} />
                    </div>
                    <div className="hero-text">
                        <h3>Log Repayment</h3>
                        <p>Receive money from split bills</p>
                    </div>
                    <ChevronRight className="hero-arrow" />
                </button>
            </div>

            <div className="sources-section">
                <h3>People</h3>
                {loading ? (
                    <div className="loader"><div className="loader-spinner"></div></div>
                ) : (
                    <div className="lending-list">
                        {sources.map(source => (
                            <div key={source.id} className="lending-card">
                                <div className="lending-card-icon" style={{ backgroundColor: source.color || '#4ECDC4' }}>
                                    {source.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="lending-card-content">
                                    <div className="lending-name">{source.name}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Repayment Modal */}
            {showRepayment && (
                <div className="modal-overlay full-screen-mobile" onClick={(e) => e.target === e.currentTarget && setShowRepayment(false)}>
                    <div className="modal-content repayment-modal">
                        {step === 1 && (
                            <TransactionSelector
                                onClose={() => setShowRepayment(false)}
                                onSelect={(tx) => {
                                    setSelectedTx(tx);
                                    setRepayAmount(tx.amount.toString()); // Default to full amount
                                    setStep(2);
                                }}
                            />
                        )}

                        {step === 2 && (
                            <div className="repayment-form-step">
                                <div className="modal-header">
                                    <h2>Repayment Details</h2>
                                    <button className="modal-close" onClick={() => setShowRepayment(false)}>
                                        <X size={24} />
                                    </button>
                                </div>
                                <div className="selected-tx-summary">
                                    <div className="tx-label">Ref: {selectedTx.merchant}</div>
                                    <div className="tx-val">{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(selectedTx.amount)}</div>
                                </div>
                                <form onSubmit={handleSubmitRepayment}>
                                    <div className="form-group">
                                        <label>Amount Received</label>
                                        <div className="amount-input-group">
                                            <span className="amount-prefix">Rp</span>
                                            <input
                                                type="number"
                                                className="amount-input-field"
                                                value={repayAmount}
                                                onChange={e => setRepayAmount(e.target.value)}
                                                autoFocus
                                            />
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label>Date</label>
                                        <input
                                            type="date"
                                            className="input"
                                            value={repayDate}
                                            onChange={e => setRepayDate(e.target.value)}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <CustomSelect
                                            label="From"
                                            value={repaySourceId}
                                            onChange={setRepaySourceId}
                                            options={sources}
                                            placeholder="Who paid?"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <CustomSelect
                                            label="To Account"
                                            value={repayPmId}
                                            onChange={setRepayPmId}
                                            options={pms}
                                            placeholder="Received to..."
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Note</label>
                                        <input
                                            type="text"
                                            className="input"
                                            value={repayNote}
                                            onChange={e => setRepayNote(e.target.value)}
                                            placeholder="Optional note"
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        className="modal-submit-btn"
                                        disabled={submitting || !repayAmount || !repaySourceId || !repayPmId}
                                    >
                                        {submitting ? 'Saving...' : 'Save Repayment'}
                                    </button>
                                </form>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Add Source Modal */}
            {showAddSource && (
                <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowAddSource(false)}>
                    <div className="modal-content">
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
                                    className="modal-input"
                                />
                            </div>
                            <div className="form-group">
                                <label>Color tag</label>
                                <div className="color-options">
                                    {colors.map(c => (
                                        <button
                                            key={c}
                                            type="button"
                                            className={`color-option ${newSourceColor === c ? 'selected' : ''}`}
                                            style={{ backgroundColor: c }}
                                            onClick={() => setNewSourceColor(c)}
                                        />
                                    ))}
                                </div>
                            </div>
                            <button type="submit" className="modal-submit-btn" disabled={!newSourceName.trim()}>
                                Add Person
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
