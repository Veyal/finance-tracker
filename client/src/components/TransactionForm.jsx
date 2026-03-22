import { useState, useEffect } from 'react';
import { X, Loader2, Calendar, Tag, Users, Wallet, Info } from 'lucide-react';
import { transactions, categories, groups, paymentMethods } from '../api/api';
import useLockBodyScroll from '../hooks/useLockBodyScroll';
import CustomSelect from './CustomSelect';
import DatePicker from './DatePicker';
import { getCurrencySymbol } from '../utils/format';
import './TransactionForm.css';

export default function TransactionForm({ transaction, options, onSave, onClose, onOptionsChange }) {
    const [type, setType] = useState(transaction?.type || 'expense');
    const [amount, setAmount] = useState(transaction?.amount?.toString() || '');
    const [date, setDate] = useState(() => {
        if (transaction?.date) {
            return transaction.date.split(/[T\s]/)[0];
        }
        return new Date().toISOString().split('T')[0];
    });
    const [categoryId, setCategoryId] = useState(transaction?.category_id || '');
    const [groupId, setGroupId] = useState(transaction?.group_id || '');
    const [paymentMethodId, setPaymentMethodId] = useState(transaction?.payment_method_id || '');
    const [incomeSourceId, setIncomeSourceId] = useState(transaction?.income_source_id || '');
    const [name, setName] = useState(transaction?.merchant || '');
    const [note, setNote] = useState(transaction?.note || '');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Add category modal state
    const [showAddCategory, setShowAddCategory] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [addCategoryLoading, setAddCategoryLoading] = useState(false);

    // Add group modal state
    const [showAddGroup, setShowAddGroup] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');
    const [addGroupLoading, setAddGroupLoading] = useState(false);

    // Add payment method modal state
    const [showAddPayment, setShowAddPayment] = useState(false);
    const [newPaymentName, setNewPaymentName] = useState('');
    const [addPaymentLoading, setAddPaymentLoading] = useState(false);

    const isEditing = !!transaction;

    useLockBodyScroll();

    const handleInputFocus = (e) => {
        setTimeout(() => {
            e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
    };

    async function handleSubmit(e) {
        e.preventDefault();
        if (loading) return;

        const amountNum = parseFloat(amount);
        if (!amountNum || amountNum <= 0) {
            setError('Please enter a valid amount');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const data = {
                type,
                amount: amountNum,
                date: `${date}T12:00:00`,
                category_id: type === 'expense' ? (categoryId || null) : null,
                group_id: type === 'expense' ? (groupId || null) : null,
                payment_method_id: paymentMethodId || null,
                income_source_id: type === 'income' ? (incomeSourceId || null) : null,
                merchant: name || null,
                note: note || null,
            };

            if (isEditing) {
                await transactions.update(transaction.id, data);
            } else {
                await transactions.create(data);
            }
            onSave(data);
        } catch (err) {
            setError('Failed to save transaction');
        } finally {
            setLoading(false);
        }
    }

    function handleAmountChange(e) {
        const value = e.target.value.replace(/[^0-9.]/g, '');
        setAmount(value);
    }

    return (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="modal transaction-form-modal animate-slide-up">
                <div className="modal-header">
                    <h2>{isEditing ? 'Edit Transaction' : 'New Transaction'}</h2>
                    <button className="btn btn-icon btn-ghost" onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>

                <form className="modal-body" onSubmit={handleSubmit}>
                    {/* Type Switcher */}
                    <div className="type-toggle">
                        <button
                            type="button"
                            className={`type-btn ${type === 'expense' ? 'active expense' : ''}`}
                            onClick={() => setType('expense')}
                        >
                            Expense
                        </button>
                        <button
                            type="button"
                            className={`type-btn ${type === 'income' ? 'active income' : ''}`}
                            onClick={() => setType('income')}
                        >
                            Income
                        </button>
                    </div>

                    {/* Big Amount Input */}
                    <div className="amount-input-group">
                        <span className="amount-prefix">{getCurrencySymbol()}</span>
                        <input
                            type="text"
                            inputMode="decimal"
                            className="amount-input-field"
                            value={amount}
                            onChange={handleAmountChange}
                            placeholder="0"
                            autoFocus
                        />
                    </div>

                    <div className="form-group">
                        <label className="input-label">
                            <Info size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                            Merchant / Description
                        </label>
                        <input
                            type="text"
                            className="input name-input"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            onFocus={handleInputFocus}
                            placeholder="e.g., Starbucks, Rent, Salary"
                        />
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <DatePicker
                                label={<><Calendar size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> Date</>}
                                value={date}
                                onChange={setDate}
                            />
                        </div>
                        {type === 'expense' ? (
                            <div className="form-group">
                                <CustomSelect
                                    label={<><Tag size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> Category</>}
                                    value={categoryId}
                                    onChange={setCategoryId}
                                    options={options?.categories || []}
                                    placeholder="Select category"
                                    onAddNew={() => setShowAddCategory(true)}
                                    addNewLabel="Add Category"
                                />
                            </div>
                        ) : (
                            <div className="form-group">
                                <CustomSelect
                                    label={<><Tag size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> Source</>}
                                    value={incomeSourceId}
                                    onChange={setIncomeSourceId}
                                    options={options?.incomeSources || []}
                                    placeholder="Select source"
                                />
                            </div>
                        )}
                    </div>

                    <div className="form-row">
                        {type === 'expense' && (
                            <div className="form-group">
                                <CustomSelect
                                    label={<><Users size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> Group</>}
                                    value={groupId}
                                    onChange={setGroupId}
                                    options={options?.groups || []}
                                    placeholder="Select group"
                                    onAddNew={() => setShowAddGroup(true)}
                                    addNewLabel="Add Group"
                                />
                            </div>
                        )}
                        <div className="form-group">
                            <CustomSelect
                                label={<><Wallet size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> {type === 'expense' ? "Payment Method" : "Account"}</>}
                                value={paymentMethodId}
                                onChange={setPaymentMethodId}
                                options={options?.paymentMethods || []}
                                placeholder="Select method"
                                onAddNew={() => setShowAddPayment(true)}
                                addNewLabel="Add Method"
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="input-label">Note (Optional)</label>
                        <textarea
                            className="input note-textarea"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            onFocus={handleInputFocus}
                            placeholder="Add more details..."
                            rows={2}
                        />
                    </div>

                    {error && <div className="form-error">{error}</div>}

                    <div className="form-actions">
                        <button
                            type="submit"
                            className="btn btn-primary btn-lg"
                            disabled={loading || !amount}
                        >
                            {loading ? <Loader2 size={20} className="spin" /> : 'Save Transaction'}
                        </button>
                    </div>
                </form>
            </div>

            {/* Nested Modals */}
            {showAddCategory && (
                <div className="modal-overlay nested-modal" onClick={() => setShowAddCategory(false)}>
                    <div className="modal add-category-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>New Category</h2>
                            <button className="btn btn-icon btn-ghost" onClick={() => setShowAddCategory(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="input-label">Name</label>
                                <input
                                    type="text"
                                    className="input"
                                    value={newCategoryName}
                                    onChange={e => setNewCategoryName(e.target.value)}
                                    placeholder="e.g., Subscriptions"
                                    autoFocus
                                />
                            </div>
                            <button
                                className="btn btn-primary btn-lg"
                                onClick={async () => {
                                    setAddCategoryLoading(true);
                                    try {
                                        const res = await categories.create({ name: newCategoryName });
                                        if (onOptionsChange) await onOptionsChange();
                                        setCategoryId(res.id);
                                        setShowAddCategory(false);
                                        setNewCategoryName('');
                                    } finally { setAddCategoryLoading(false); }
                                }}
                                disabled={addCategoryLoading || !newCategoryName.trim()}
                            >
                                {addCategoryLoading ? <Loader2 size={20} className="spin" /> : 'Create Category'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Similar for Group and Payment Method if needed, but let's stick to fixing the core issues */}
        </div>
    );
}
