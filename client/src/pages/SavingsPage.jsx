import { useState, useEffect } from 'react';
import { PiggyBank, Plus, ArrowDownLeft, ArrowUpRight, X, Trash2, Edit3, Check, Loader2, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { savings, paymentMethods } from '../api/api';
import { usePrivacy } from '../context/PrivacyContext';
import { useHaptics } from '../hooks/useHaptics';
import PrivacyToggle from '../components/PrivacyToggle';
import CustomSelect from '../components/CustomSelect';
import DatePicker from '../components/DatePicker';
import './SavingsPage.css';

function formatAmount(amount) {
    return new Intl.NumberFormat('id-ID').format(amount || 0);
}

export default function SavingsPage() {
    const { isPrivacyMode } = usePrivacy();
    const { triggerImpact, triggerSuccess, triggerError } = useHaptics();

    const [data, setData] = useState({ accounts: [], totalBalance: 0 });
    const [loading, setLoading] = useState(true);
    const [paymentMethodsList, setPaymentMethodsList] = useState([]);

    // Modal states
    const [showAddAccount, setShowAddAccount] = useState(false);
    const [showTransaction, setShowTransaction] = useState(null); // { type: 'deposit' | 'withdraw', account: {...} }
    const [showAccountDetails, setShowAccountDetails] = useState(null); // account with transactions
    const [editingTx, setEditingTx] = useState(null);
    const [showAddPaymentMethod, setShowAddPaymentMethod] = useState(false);

    // Form states
    const [newAccountName, setNewAccountName] = useState('');
    const [newAccountTarget, setNewAccountTarget] = useState('');
    const [newAccountColor, setNewAccountColor] = useState('#6366f1');
    const [txAmount, setTxAmount] = useState('');
    const [txNote, setTxNote] = useState('');
    const [txDate, setTxDate] = useState('');
    const [txPaymentMethod, setTxPaymentMethod] = useState('');
    const [newPaymentMethodName, setNewPaymentMethodName] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const presetColors = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6', '#06b6d4', '#84cc16'];

    useEffect(() => {
        loadData();
        loadPaymentMethods();
    }, []);

    async function loadData() {
        try {
            setLoading(true);
            const result = await savings.list();
            setData(result);
        } catch (error) {
            console.error('Failed to load savings:', error);
        } finally {
            setLoading(false);
        }
    }

    async function loadPaymentMethods() {
        try {
            const pms = await paymentMethods.list();
            setPaymentMethodsList(pms);
        } catch (error) {
            console.error('Failed to load payment methods:', error);
        }
    }

    async function handleAddPaymentMethod(e) {
        e.preventDefault();
        if (!newPaymentMethodName.trim() || submitting) return;

        try {
            setSubmitting(true);
            triggerImpact('medium');
            const newPm = await paymentMethods.create({ name: newPaymentMethodName.trim() });
            triggerSuccess();
            setPaymentMethodsList(prev => [...prev, newPm]);
            setTxPaymentMethod(newPm.id);
            setNewPaymentMethodName('');
            setShowAddPaymentMethod(false);
        } catch (error) {
            console.error('Failed to add payment method:', error);
            triggerError();
        } finally {
            setSubmitting(false);
        }
    }

    async function handleCreateAccount(e) {
        e.preventDefault();
        if (!newAccountName.trim() || submitting) return;

        try {
            setSubmitting(true);
            triggerImpact('medium');
            await savings.create({
                name: newAccountName.trim(),
                target_amount: newAccountTarget ? parseFloat(newAccountTarget) : null,
                color: newAccountColor,
            });
            triggerSuccess();
            setNewAccountName('');
            setNewAccountTarget('');
            setShowAddAccount(false);
            loadData();
        } catch (error) {
            console.error('Failed to create account:', error);
            triggerError();
        } finally {
            setSubmitting(false);
        }
    }

    async function handleDeleteAccount(id) {
        if (!confirm('Delete this savings account?')) return;
        try {
            triggerImpact('medium');
            await savings.delete(id);
            triggerSuccess();
            loadData();
            setShowAccountDetails(null);
        } catch (error) {
            console.error('Failed to delete account:', error);
            triggerError();
        }
    }

    async function handleSubmitTransaction(e) {
        e.preventDefault();
        const amount = parseFloat(txAmount);
        if (!amount || amount <= 0 || submitting) return;

        try {
            setSubmitting(true);
            triggerImpact('medium');

            const payload = {
                amount,
                date: txDate || null,
                note: txNote.trim() || null,
                payment_method_id: txPaymentMethod || null,
            };

            if (showTransaction.type === 'deposit') {
                await savings.deposit(showTransaction.account.id, payload);
            } else {
                await savings.withdraw(showTransaction.account.id, payload);
            }

            triggerSuccess();
            setTxAmount('');
            setTxDate('');
            setTxNote('');
            setTxPaymentMethod('');
            setShowTransaction(null);
            loadData();

            // Refresh account details if viewing
            if (showAccountDetails?.id === showTransaction.account.id) {
                const result = await savings.getTransactions(showAccountDetails.id);
                setShowAccountDetails(result);
            }
        } catch (error) {
            console.error('Failed to submit transaction:', error);
            triggerError();
        } finally {
            setSubmitting(false);
        }
    }

    async function handleViewAccountDetails(account) {
        try {
            const result = await savings.getTransactions(account.id);
            setShowAccountDetails(result);
        } catch (error) {
            console.error('Failed to load account details:', error);
        }
    }

    async function handleUpdateTransaction(e) {
        e.preventDefault();
        const amount = parseFloat(txAmount);
        if (!amount || amount <= 0 || submitting) return;

        try {
            setSubmitting(true);
            triggerImpact('medium');
            await savings.updateTransaction(editingTx.id, {
                amount,
                date: txDate || null,
                note: txNote.trim() || null,
                payment_method_id: txPaymentMethod || null,
            });
            triggerSuccess();
            setEditingTx(null);
            setTxAmount('');
            setTxDate('');
            setTxNote('');
            setTxPaymentMethod('');

            // Refresh account details
            if (showAccountDetails) {
                const result = await savings.getTransactions(showAccountDetails.account.id);
                setShowAccountDetails(result);
            }
            loadData();
        } catch (error) {
            console.error('Failed to update transaction:', error);
            triggerError();
        } finally {
            setSubmitting(false);
        }
    }

    async function handleDeleteTransaction(txId) {
        if (!confirm('Delete this transaction?')) return;
        try {
            triggerImpact('medium');
            await savings.deleteTransaction(txId);
            triggerSuccess();

            // Refresh account details
            if (showAccountDetails) {
                const result = await savings.getTransactions(showAccountDetails.account.id);
                setShowAccountDetails(result);
            }
            loadData();
        } catch (error) {
            console.error('Failed to delete transaction:', error);
            triggerError();
        }
    }

    function openEditTx(tx) {
        setEditingTx(tx);
        setTxAmount(tx.amount.toString());
        setTxDate(tx.date ? tx.date.split('T')[0] : '');
        setTxNote(tx.note || '');
        setTxPaymentMethod(tx.payment_method_id || '');
    }

    return (
        <div className="page savings-page">
            <header className="savings-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <h1>Savings</h1>
                    <PrivacyToggle style={{ marginTop: '4px' }} />
                </div>
                <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => setShowAddAccount(true)}
                >
                    <Plus size={18} />
                    New Goal
                </button>
            </header>

            {/* Total Savings Card */}
            <div className="savings-total-card">
                <div className="savings-total-label">Total Savings</div>
                <div className="savings-total-amount">
                    Rp {isPrivacyMode ? '••••••' : formatAmount(data.totalBalance)}
                </div>
            </div>

            {/* Savings Accounts List */}
            <div className="savings-list">
                {loading ? (
                    <div className="loader">
                        <div className="loader-spinner"></div>
                    </div>
                ) : data.accounts.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">
                            <PiggyBank size={64} />
                        </div>
                        <div className="empty-state-title">No savings goals yet</div>
                        <div className="empty-state-text">
                            Create your first savings goal to start tracking
                        </div>
                    </div>
                ) : (
                    data.accounts.map(account => (
                        <div
                            key={account.id}
                            className="savings-account-card"
                            onClick={() => handleViewAccountDetails(account)}
                        >
                            <div className="account-header">
                                <div
                                    className="account-icon"
                                    style={{ backgroundColor: account.color || '#6366f1' }}
                                >
                                    <PiggyBank size={20} />
                                </div>
                                <div className="account-info">
                                    <div className="account-name">{account.name}</div>
                                    <div className="account-balance">
                                        Rp {isPrivacyMode ? '••••••' : formatAmount(account.balance)}
                                    </div>
                                </div>
                                <ChevronRight size={20} className="account-chevron" />
                            </div>

                            {account.target_amount && (
                                <div className="account-progress">
                                    <div className="progress-bar">
                                        <div
                                            className="progress-fill"
                                            style={{
                                                width: `${Math.min(100, (account.balance / account.target_amount) * 100)}%`,
                                                backgroundColor: account.color || '#6366f1'
                                            }}
                                        />
                                    </div>
                                    <div className="progress-text">
                                        {isPrivacyMode ? '••%' : `${Math.round((account.balance / account.target_amount) * 100)}%`} of Rp {isPrivacyMode ? '••••••' : formatAmount(account.target_amount)}
                                    </div>
                                </div>
                            )}

                            <div className="account-actions" onClick={e => e.stopPropagation()}>
                                <button
                                    type="button"
                                    className="btn btn-sm btn-success"
                                    onClick={() => setShowTransaction({ type: 'deposit', account })}
                                >
                                    <ArrowDownLeft size={16} />
                                    Deposit
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-sm btn-secondary"
                                    onClick={() => setShowTransaction({ type: 'withdraw', account })}
                                >
                                    <ArrowUpRight size={16} />
                                    Withdraw
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Add Account Modal */}
            <AnimatePresence>
                {showAddAccount && (
                    <motion.div
                        className="modal-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowAddAccount(false)}
                    >
                        <motion.div
                            className="modal-content"
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="modal-header">
                                <h2>New Savings Goal</h2>
                                <button className="btn btn-ghost" onClick={() => setShowAddAccount(false)}>
                                    <X size={20} />
                                </button>
                            </div>
                            <form onSubmit={handleCreateAccount}>
                                <div className="form-group">
                                    <label className="input-label">Goal Name</label>
                                    <input
                                        type="text"
                                        className="input"
                                        placeholder="e.g. Emergency Fund, Vacation"
                                        value={newAccountName}
                                        onChange={e => setNewAccountName(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="input-label">Target Amount (Optional)</label>
                                    <input
                                        type="number"
                                        className="input"
                                        placeholder="0"
                                        value={newAccountTarget}
                                        onChange={e => setNewAccountTarget(e.target.value)}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="input-label">Color</label>
                                    <div className="color-picker">
                                        {presetColors.map(color => (
                                            <button
                                                key={color}
                                                type="button"
                                                className={`color-option ${newAccountColor === color ? 'active' : ''}`}
                                                style={{ backgroundColor: color }}
                                                onClick={() => setNewAccountColor(color)}
                                            />
                                        ))}
                                    </div>
                                </div>
                                <button
                                    type="submit"
                                    className="btn btn-primary btn-full"
                                    disabled={submitting}
                                >
                                    {submitting ? <Loader2 size={18} className="spinning" /> : 'Create Goal'}
                                </button>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Transaction Modal (Deposit/Withdraw) */}
            <AnimatePresence>
                {showTransaction && (
                    <motion.div
                        className="modal-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowTransaction(null)}
                    >
                        <motion.div
                            className="modal-content"
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="modal-header">
                                <h2>
                                    {showTransaction.type === 'deposit' ? 'Deposit to' : 'Withdraw from'} {showTransaction.account.name}
                                </h2>
                                <button className="btn btn-ghost" onClick={() => setShowTransaction(null)}>
                                    <X size={20} />
                                </button>
                            </div>
                            <form onSubmit={handleSubmitTransaction}>
                                <div className="form-group">
                                    <label className="input-label">Amount</label>
                                    <input
                                        type="number"
                                        className="input input-amount"
                                        placeholder="0"
                                        value={txAmount}
                                        onChange={e => setTxAmount(e.target.value)}
                                        required
                                        autoFocus
                                    />
                                </div>
                                <div className="form-group">
                                    <DatePicker
                                        label="Date"
                                        value={txDate}
                                        onChange={setTxDate}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="input-label">Payment Method</label>
                                    <CustomSelect
                                        options={paymentMethodsList}
                                        value={txPaymentMethod}
                                        onChange={setTxPaymentMethod}
                                        placeholder="Select payment method"
                                        onAddNew={() => setShowAddPaymentMethod(true)}
                                        addNewLabel="Add Payment Method"
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="input-label">Note (Optional)</label>
                                    <input
                                        type="text"
                                        className="input"
                                        placeholder="e.g. Monthly savings"
                                        value={txNote}
                                        onChange={e => setTxNote(e.target.value)}
                                    />
                                </div>
                                <button
                                    type="submit"
                                    className={`btn btn-full ${showTransaction.type === 'deposit' ? 'btn-success' : 'btn-primary'}`}
                                    disabled={submitting}
                                >
                                    {submitting ? (
                                        <Loader2 size={18} className="spinning" />
                                    ) : showTransaction.type === 'deposit' ? (
                                        <>
                                            <ArrowDownLeft size={18} />
                                            Deposit
                                        </>
                                    ) : (
                                        <>
                                            <ArrowUpRight size={18} />
                                            Withdraw
                                        </>
                                    )}
                                </button>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Account Details Modal */}
            <AnimatePresence>
                {showAccountDetails && (
                    <motion.div
                        className="modal-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowAccountDetails(null)}
                    >
                        <motion.div
                            className="modal-content modal-large"
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="modal-header">
                                <div className="account-detail-header">
                                    <div
                                        className="account-icon"
                                        style={{ backgroundColor: showAccountDetails.account.color || '#6366f1' }}
                                    >
                                        <PiggyBank size={20} />
                                    </div>
                                    <div>
                                        <h2>{showAccountDetails.account.name}</h2>
                                        <div className="account-balance-small">
                                            Balance: Rp {isPrivacyMode ? '••••••' : formatAmount(
                                                showAccountDetails.transactions.reduce((sum, tx) =>
                                                    sum + (tx.type === 'savings_deposit' ? tx.amount : -tx.amount), 0)
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <button className="btn btn-ghost" onClick={() => setShowAccountDetails(null)}>
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="account-detail-actions">
                                <button
                                    className="btn btn-sm btn-success"
                                    onClick={() => {
                                        setShowTransaction({ type: 'deposit', account: showAccountDetails.account });
                                        setShowAccountDetails(null);
                                    }}
                                >
                                    <ArrowDownLeft size={16} /> Deposit
                                </button>
                                <button
                                    className="btn btn-sm btn-secondary"
                                    onClick={() => {
                                        setShowTransaction({ type: 'withdraw', account: showAccountDetails.account });
                                        setShowAccountDetails(null);
                                    }}
                                >
                                    <ArrowUpRight size={16} /> Withdraw
                                </button>
                                <button
                                    className="btn btn-sm btn-danger"
                                    onClick={() => handleDeleteAccount(showAccountDetails.account.id)}
                                >
                                    <Trash2 size={16} /> Delete
                                </button>
                            </div>

                            <div className="transactions-list">
                                <h3>Transaction History</h3>
                                {showAccountDetails.transactions.length === 0 ? (
                                    <div className="empty-state-small">No transactions yet</div>
                                ) : (
                                    showAccountDetails.transactions.map(tx => (
                                        <div key={tx.id} className="tx-item">
                                            <div className={`tx-icon ${tx.type === 'savings_deposit' ? 'deposit' : 'withdraw'}`}>
                                                {tx.type === 'savings_deposit' ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                                            </div>
                                            <div className="tx-content">
                                                <div className="tx-row-main">
                                                    <div className="tx-details">
                                                        <div className="tx-type">{tx.type === 'savings_deposit' ? 'Deposit' : 'Withdrawal'}</div>
                                                        <div className="tx-meta">
                                                            {new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                            {tx.note && <span className="tx-note"> · {tx.note}</span>}
                                                        </div>
                                                    </div>
                                                    <div className={`tx-amount ${tx.type === 'savings_deposit' ? 'positive' : 'negative'}`}>
                                                        {tx.type === 'savings_deposit' ? '+' : '-'}Rp {isPrivacyMode ? '••••' : formatAmount(tx.amount)}
                                                    </div>
                                                </div>
                                                <div className="tx-actions">
                                                    <button className="btn btn-ghost btn-xs" onClick={() => openEditTx(tx)}>
                                                        <Edit3 size={14} /> Edit
                                                    </button>
                                                    <button className="btn btn-ghost btn-xs tx-delete" onClick={() => handleDeleteTransaction(tx.id)}>
                                                        <Trash2 size={14} /> Delete
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Edit Transaction Modal */}
            <AnimatePresence>
                {editingTx && (
                    <motion.div
                        className="modal-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setEditingTx(null)}
                    >
                        <motion.div
                            className="modal-content"
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="modal-header">
                                <h2>Edit {editingTx.type === 'savings_deposit' ? 'Deposit' : 'Withdrawal'}</h2>
                                <button className="btn btn-ghost" onClick={() => setEditingTx(null)}>
                                    <X size={20} />
                                </button>
                            </div>
                            <form onSubmit={handleUpdateTransaction}>
                                <div className="form-group">
                                    <label className="input-label">Amount</label>
                                    <input
                                        type="number"
                                        className="input input-amount"
                                        value={txAmount}
                                        onChange={e => setTxAmount(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <DatePicker
                                        label="Date"
                                        value={txDate}
                                        onChange={setTxDate}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="input-label">Payment Method</label>
                                    <CustomSelect
                                        options={paymentMethodsList}
                                        value={txPaymentMethod}
                                        onChange={setTxPaymentMethod}
                                        placeholder="Select payment method"
                                        onAddNew={() => setShowAddPaymentMethod(true)}
                                        addNewLabel="Add Payment Method"
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="input-label">Note</label>
                                    <input
                                        type="text"
                                        className="input"
                                        value={txNote}
                                        onChange={e => setTxNote(e.target.value)}
                                    />
                                </div>
                                <button
                                    type="submit"
                                    className="btn btn-primary btn-full"
                                    disabled={submitting}
                                >
                                    {submitting ? <Loader2 size={18} className="spinning" /> : 'Update'}
                                </button>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Add Payment Method Modal */}
            <AnimatePresence>
                {showAddPaymentMethod && (
                    <motion.div
                        className="modal-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowAddPaymentMethod(false)}
                    >
                        <motion.div
                            className="modal-content"
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="modal-header">
                                <h2>Add Payment Method</h2>
                                <button className="btn btn-ghost" onClick={() => setShowAddPaymentMethod(false)}>
                                    <X size={20} />
                                </button>
                            </div>
                            <form onSubmit={handleAddPaymentMethod}>
                                <div className="form-group">
                                    <label className="input-label">Name</label>
                                    <input
                                        type="text"
                                        className="input"
                                        placeholder="e.g. Cash, BCA, GoPay"
                                        value={newPaymentMethodName}
                                        onChange={e => setNewPaymentMethodName(e.target.value)}
                                        required
                                        autoFocus
                                    />
                                </div>
                                <button
                                    type="submit"
                                    className="btn btn-primary btn-full"
                                    disabled={submitting}
                                >
                                    {submitting ? <Loader2 size={18} className="spinning" /> : 'Add Method'}
                                </button>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
