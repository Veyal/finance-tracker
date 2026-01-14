import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { transactions, categories, groups, paymentMethods } from '../api/api';
import CustomSelect from './CustomSelect';
import './TransactionForm.css';

export default function TransactionForm({ transaction, options, onSave, onClose, onOptionsChange }) {
    const [type, setType] = useState(transaction?.type || 'expense');
    const [amount, setAmount] = useState(transaction?.amount?.toString() || '');
    const [date, setDate] = useState(() => {
        if (transaction?.date) {
            // Handle both ISO format (T separator) and SQLite format (space separator)
            return transaction.date.split(/[T\s]/)[0];
        }
        return new Date().toISOString().split('T')[0];
    });
    const [categoryId, setCategoryId] = useState(transaction?.category_id || '');
    const [groupId, setGroupId] = useState(transaction?.group_id || '');
    const [paymentMethodId, setPaymentMethodId] = useState(transaction?.payment_method_id || '');
    const [incomeSourceId, setIncomeSourceId] = useState(transaction?.income_source_id || '');
    const [lendingSourceId, setLendingSourceId] = useState(transaction?.lending_source_id || '');
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

    // Prevent body scrolling when modal is open
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    // Helper to ensure focused input is visible on mobile
    const handleInputFocus = (e) => {
        // Small delay to allow keyboard to appear
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
                date: new Date(date).toISOString(),
                category_id: type === 'expense' ? (categoryId || null) : null,
                group_id: type === 'expense' ? (groupId || null) : null,
                payment_method_id: paymentMethodId || null,
                income_source_id: type === 'income' ? (incomeSourceId || null) : null,
                lending_source_id: null,
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

    function handleBackdropClick(e) {
        if (e.target === e.currentTarget) {
            onClose();
        }
    }

    async function handleAddCategory() {
        if (!newCategoryName.trim() || addCategoryLoading) return;

        setAddCategoryLoading(true);
        try {
            const newCategory = await categories.create({ name: newCategoryName.trim() });
            // Notify parent to refresh options
            if (onOptionsChange) {
                onOptionsChange();
            }
            // Select the newly created category
            setCategoryId(newCategory.id);
            setShowAddCategory(false);
            setNewCategoryName('');
        } catch (err) {
            console.error('Failed to add category:', err);
        } finally {
            setAddCategoryLoading(false);
        }
    }

    async function handleAddGroup() {
        if (!newGroupName.trim() || addGroupLoading) return;

        setAddGroupLoading(true);
        try {
            const newGroup = await groups.create({ name: newGroupName.trim() });
            if (onOptionsChange) {
                onOptionsChange();
            }
            setGroupId(newGroup.id);
            setShowAddGroup(false);
            setNewGroupName('');
        } catch (err) {
            console.error('Failed to add group:', err);
        } finally {
            setAddGroupLoading(false);
        }
    }

    async function handleAddPayment() {
        if (!newPaymentName.trim() || addPaymentLoading) return;

        setAddPaymentLoading(true);
        try {
            const newPayment = await paymentMethods.create({ name: newPaymentName.trim() });
            if (onOptionsChange) {
                onOptionsChange();
            }
            setPaymentMethodId(newPayment.id);
            setShowAddPayment(false);
            setNewPaymentName('');
        } catch (err) {
            console.error('Failed to add payment method:', err);
        } finally {
            setAddPaymentLoading(false);
        }
    }

    return (
        <div className="modal-overlay" onClick={handleBackdropClick}>
            <div className="modal transaction-form-modal">
                <div className="modal-header">
                    <h2>{isEditing ? 'Edit Transaction' : 'Add Transaction'}</h2>
                    <button className="btn btn-icon btn-ghost" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <form className="modal-body" onSubmit={handleSubmit}>
                    {/* Type Toggle */}
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

                    {/* Amount Input */}
                    <div className="amount-input-group">
                        <span className="amount-prefix">Rp</span>
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

                    {/* Transaction Name */}
                    <div className="form-group">
                        <input
                            type="text"
                            className="input name-input"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            onFocus={handleInputFocus}
                            placeholder="Transaction name (e.g., Starbucks, Grocery)"
                        />
                    </div>

                    {/* All Details - Always Visible */}
                    <div className="details-section">
                        {/* Date + Category/Source */}
                        <div className="form-row">
                            <div className="form-group">
                                <label className="input-label">Date</label>
                                <input
                                    type="date"
                                    className="input"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    onFocus={handleInputFocus}
                                />
                            </div>
                            {/* Category only for expenses */}
                            {type === 'expense' && (
                                <CustomSelect
                                    label="Category"
                                    value={categoryId}
                                    onChange={setCategoryId}
                                    options={options.categories}
                                    placeholder="Select category"
                                    onAddNew={() => setShowAddCategory(true)}
                                    addNewLabel="Add Category"
                                />
                            )}
                            {/* For income, show source */}
                            {type === 'income' && (
                                <CustomSelect
                                    label="Source"
                                    value={incomeSourceId}
                                    onChange={setIncomeSourceId}
                                    options={options.incomeSources || []}
                                    placeholder="Select source"
                                />
                            )}
                        </div>

                        {/* Group - Only for expenses */}
                        {type === 'expense' && (
                            <div className="form-row">
                                <CustomSelect
                                    label="Group"
                                    value={groupId}
                                    onChange={setGroupId}
                                    options={options.groups}
                                    placeholder="Select group"
                                    onAddNew={() => setShowAddGroup(true)}
                                    addNewLabel="Add Group"
                                />
                            </div>
                        )}

                        {/* Payment Method / Account - For both Expense and Income */}
                        <div className="form-group">
                            <CustomSelect
                                label={type === 'expense' ? "Payment Method" : "Account"}
                                value={paymentMethodId}
                                onChange={setPaymentMethodId}
                                options={options.paymentMethods}
                                placeholder={type === 'expense' ? "Paid with" : "Received to"}
                                onAddNew={() => setShowAddPayment(true)}
                                addNewLabel="Add Method"
                            />
                        </div>

                        <div className="form-group">
                            <label className="input-label">Note</label>
                            <input
                                type="text"
                                className="input"
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                onFocus={handleInputFocus}
                                placeholder="Add a note..."
                            />
                        </div>
                    </div>

                    {error && <div className="form-error">{error}</div>}

                    <button
                        type="submit"
                        className="btn btn-primary btn-lg"
                        disabled={loading || !amount}
                    >
                        {loading ? <Loader2 size={20} className="spin" /> : 'Save'}
                    </button>
                </form>
            </div>

            {/* Add Category Modal */}
            {showAddCategory && (
                <div className="modal-overlay nested-modal" onClick={(e) => e.target === e.currentTarget && setShowAddCategory(false)}>
                    <div className="modal add-category-modal">
                        <div className="modal-header">
                            <h2>Add Category</h2>
                            <button className="btn btn-icon btn-ghost" onClick={() => setShowAddCategory(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="input-label">Category Name</label>
                                <input
                                    type="text"
                                    className="input"
                                    value={newCategoryName}
                                    onChange={(e) => setNewCategoryName(e.target.value)}
                                    onFocus={handleInputFocus}
                                    placeholder="e.g., Groceries, Entertainment"
                                    autoFocus
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                                />
                            </div>
                            <button
                                type="button"
                                className="btn btn-primary btn-lg"
                                onClick={handleAddCategory}
                                disabled={addCategoryLoading || !newCategoryName.trim()}
                                style={{ width: '100%', marginTop: 'var(--space-md)' }}
                            >
                                {addCategoryLoading ? <Loader2 size={20} className="spin" /> : 'Add Category'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Group Modal */}
            {showAddGroup && (
                <div className="modal-overlay nested-modal" onClick={(e) => e.target === e.currentTarget && setShowAddGroup(false)}>
                    <div className="modal add-category-modal">
                        <div className="modal-header">
                            <h2>Add Group</h2>
                            <button className="btn btn-icon btn-ghost" onClick={() => setShowAddGroup(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="input-label">Group Name</label>
                                <input
                                    type="text"
                                    className="input"
                                    value={newGroupName}
                                    onChange={(e) => setNewGroupName(e.target.value)}
                                    onFocus={handleInputFocus}
                                    placeholder="e.g., Personal, Family"
                                    autoFocus
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddGroup()}
                                />
                            </div>
                            <button
                                type="button"
                                className="btn btn-primary btn-lg"
                                onClick={handleAddGroup}
                                disabled={addGroupLoading || !newGroupName.trim()}
                                style={{ width: '100%', marginTop: 'var(--space-md)' }}
                            >
                                {addGroupLoading ? <Loader2 size={20} className="spin" /> : 'Add Group'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Payment Modal */}
            {showAddPayment && (
                <div className="modal-overlay nested-modal" onClick={(e) => e.target === e.currentTarget && setShowAddPayment(false)}>
                    <div className="modal add-category-modal">
                        <div className="modal-header">
                            <h2>Add Payment Method</h2>
                            <button className="btn btn-icon btn-ghost" onClick={() => setShowAddPayment(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="input-label">Payment Method Name</label>
                                <input
                                    type="text"
                                    className="input"
                                    value={newPaymentName}
                                    onChange={(e) => setNewPaymentName(e.target.value)}
                                    onFocus={handleInputFocus}
                                    placeholder="e.g., Cash, Credit Card"
                                    autoFocus
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddPayment()}
                                />
                            </div>
                            <button
                                type="button"
                                className="btn btn-primary btn-lg"
                                onClick={handleAddPayment}
                                disabled={addPaymentLoading || !newPaymentName.trim()}
                                style={{ width: '100%', marginTop: 'var(--space-md)' }}
                            >
                                {addPaymentLoading ? <Loader2 size={20} className="spin" /> : 'Add Payment Method'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

