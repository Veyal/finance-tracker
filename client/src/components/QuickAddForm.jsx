import { useState, useEffect, useRef } from 'react';
import { X, Check, ChevronRight, ChevronLeft, Minus, Plus, Calendar, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { transactions, categories, groups, paymentMethods } from '../api/api';
import { useHaptics } from '../hooks/useHaptics';
import './QuickAddForm.css';

// Local storage keys for smart defaults
const STORAGE_KEYS = {
    lastCategory: 'ft_last_category',
    lastGroup: 'ft_last_group',
    lastPayment: 'ft_last_payment',
    lastIncomeSource: 'ft_last_income_source',
};

// Quick amount presets (in thousands)
const QUICK_AMOUNTS = [10, 20, 50, 100, 200, 500];

export default function QuickAddForm({ options, onSave, onClose, onOptionsChange }) {
    const { triggerImpact, triggerSuccess, triggerError } = useHaptics();

    // Step: 0 = amount, 1 = category/details, 2 = success
    const [step, setStep] = useState(0);
    const [type, setType] = useState('expense');
    const [amount, setAmount] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [groupId, setGroupId] = useState('');
    const [paymentMethodId, setPaymentMethodId] = useState('');
    const [incomeSourceId, setIncomeSourceId] = useState('');
    const [note, setNote] = useState('');
    const [name, setName] = useState('');
    const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Add category inline state
    const [showAddCategory, setShowAddCategory] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [addCategoryLoading, setAddCategoryLoading] = useState(false);

    // Add group inline state
    const [showAddGroup, setShowAddGroup] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');
    const [addGroupLoading, setAddGroupLoading] = useState(false);

    // Add payment inline state
    const [showAddPayment, setShowAddPayment] = useState(false);
    const [newPaymentName, setNewPaymentName] = useState('');
    const [addPaymentLoading, setAddPaymentLoading] = useState(false);

    const amountInputRef = useRef(null);

    // Load smart defaults on mount
    useEffect(() => {
        const lastCat = localStorage.getItem(STORAGE_KEYS.lastCategory);
        const lastGroup = localStorage.getItem(STORAGE_KEYS.lastGroup);
        const lastPayment = localStorage.getItem(STORAGE_KEYS.lastPayment);
        const lastSource = localStorage.getItem(STORAGE_KEYS.lastIncomeSource);

        let defaultCat = lastCat;

        // Time-aware smart defaults
        // Only if we don't have a specific strong preference or just as a heuristic
        // Here we try to interpret time if no lastCat is set, or maybe suggest based on time
        if (!defaultCat) {
            const hour = new Date().getHours();
            const lowerName = (n) => n.toLowerCase();
            let keyword = '';

            if (hour >= 5 && hour < 11) keyword = ['coffee', 'breakfast', 'morning'];
            else if (hour >= 11 && hour < 14) keyword = ['lunch', 'food'];
            else if (hour >= 14 && hour < 17) keyword = ['snack', 'drink'];
            else if (hour >= 17 && hour < 22) keyword = ['dinner', 'food'];

            if (keyword && options.categories.length > 0) {
                const match = options.categories.find(c =>
                    Array.isArray(keyword)
                        ? keyword.some(k => lowerName(c.name).includes(k))
                        : lowerName(c.name).includes(keyword)
                );
                if (match) defaultCat = match.id;
            }
        }

        if (defaultCat && options.categories.find(c => c.id === defaultCat)) {
            setCategoryId(defaultCat);
        }
        if (lastGroup && options.groups.find(g => g.id === lastGroup)) {
            setGroupId(lastGroup);
        }
        if (lastPayment && options.paymentMethods.find(p => p.id === lastPayment)) {
            setPaymentMethodId(lastPayment);
        }
        if (lastSource && options.incomeSources?.find(s => s.id === lastSource)) {
            setIncomeSourceId(lastSource);
        }
    }, [options]);

    // Focus amount input on mount
    useEffect(() => {
        if (step === 0 && amountInputRef.current) {
            amountInputRef.current.focus();
        }
    }, [step]);


    function handleAmountChange(e) {
        const value = e.target.value.replace(/[^0-9]/g, '');
        if (value !== amount) triggerImpact('light');
        setAmount(value);
    }

    function handleQuickAmount(k) {
        triggerImpact('medium');
        const newAmount = (parseInt(amount || '0') + k * 1000).toString();
        setAmount(newAmount);
    }

    function formatDisplayAmount(amt) {
        if (!amt) return '0';
        return new Intl.NumberFormat('id-ID').format(parseInt(amt));
    }

    async function handleAddCategory() {
        if (!newCategoryName.trim() || addCategoryLoading) return;
        setAddCategoryLoading(true);
        triggerImpact('medium');
        try {
            const newCategory = await categories.create({ name: newCategoryName.trim() });
            if (onOptionsChange) onOptionsChange();
            setCategoryId(newCategory.id);
            setShowAddCategory(false);
            setNewCategoryName('');
            triggerSuccess();
        } catch (err) {
            console.error('Failed to add category:', err);
            triggerError();
        } finally {
            setAddCategoryLoading(false);
        }
    }

    async function handleAddGroup() {
        if (!newGroupName.trim() || addGroupLoading) return;
        setAddGroupLoading(true);
        triggerImpact('medium');
        try {
            const newGroup = await groups.create({ name: newGroupName.trim() });
            if (onOptionsChange) onOptionsChange();
            setGroupId(newGroup.id);
            setShowAddGroup(false);
            setNewGroupName('');
            triggerSuccess();
        } catch (err) {
            console.error('Failed to add group:', err);
            triggerError();
        } finally {
            setAddGroupLoading(false);
        }
    }

    async function handleAddPayment() {
        if (!newPaymentName.trim() || addPaymentLoading) return;
        setAddPaymentLoading(true);
        triggerImpact('medium');
        try {
            const newPayment = await paymentMethods.create({ name: newPaymentName.trim() });
            if (onOptionsChange) onOptionsChange();
            setPaymentMethodId(newPayment.id);
            setShowAddPayment(false);
            setNewPaymentName('');
            triggerSuccess();
        } catch (err) {
            console.error('Failed to add payment:', err);
            triggerError();
        } finally {
            setAddPaymentLoading(false);
        }
    }

    async function handleSubmit() {
        const amountNum = parseFloat(amount);
        if (!amountNum || amountNum <= 0) {
            triggerError();
            setError('Enter an amount');
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
                payment_method_id: type === 'expense' ? (paymentMethodId || null) : null,
                income_source_id: type === 'income' ? (incomeSourceId || null) : null,
                merchant: name || null,
                note: note || null,
            };

            await transactions.create(data);

            // Save smart defaults
            if (categoryId) localStorage.setItem(STORAGE_KEYS.lastCategory, categoryId);
            if (groupId) localStorage.setItem(STORAGE_KEYS.lastGroup, groupId);
            if (paymentMethodId) localStorage.setItem(STORAGE_KEYS.lastPayment, paymentMethodId);
            if (incomeSourceId) localStorage.setItem(STORAGE_KEYS.lastIncomeSource, incomeSourceId);

            setStep(2); // Success!
            triggerSuccess();
            setTimeout(() => {
                onSave(data);
            }, 600);
        } catch (err) {
            triggerError();
            setError('Failed to save');
            setLoading(false);
        }
    }

    function handleBackdropClick(e) {
        if (e.target === e.currentTarget) {
            onClose();
        }
    }

    function goNext() {
        if (step === 0 && amount) {
            triggerImpact('medium');
            setStep(1);
        } else if (step === 1) {
            triggerImpact('medium');
            handleSubmit();
        }
    }

    function goBack() {
        if (step === 1) {
            triggerImpact('light');
            setStep(0);
        }
    }

    return (
        <div className="quick-add-overlay" onClick={handleBackdropClick}>
            <motion.div
                className="quick-add-container"
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
            >
                {/* Header */}
                <div className="quick-add-header">
                    {step === 1 && (
                        <button className="quick-add-back" onClick={goBack}>
                            <ChevronLeft size={24} />
                        </button>
                    )}
                    <div className="quick-add-title">
                        {step === 0 && 'Quick Add'}
                        {step === 1 && 'Details'}
                        {step === 2 && 'Done!'}
                    </div>
                    <button className="quick-add-close" onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>

                <AnimatePresence mode="wait">
                    {/* Step 0: Amount Entry */}
                    {step === 0 && (
                        <motion.div
                            key="step0"
                            className="quick-add-step step-amount"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ duration: 0.2 }}
                        >
                            {/* Type Toggle */}
                            <div className="type-toggle-pill">
                                <button
                                    className={`type-pill ${type === 'expense' ? 'active expense' : ''}`}
                                    onClick={() => { setType('expense'); triggerImpact('light'); }}
                                >
                                    <Minus size={18} />
                                    <span>Expense</span>
                                </button>
                                <button
                                    className={`type-pill ${type === 'income' ? 'active income' : ''}`}
                                    onClick={() => { setType('income'); triggerImpact('light'); }}
                                >
                                    <Plus size={18} />
                                    <span>Income</span>
                                </button>
                            </div>

                            {/* Amount Display */}
                            <div className={`amount-display ${type}`}>
                                <span className="amount-currency">Rp</span>
                                <input
                                    ref={amountInputRef}
                                    type="text"
                                    inputMode="numeric"
                                    className="amount-value-input"
                                    value={formatDisplayAmount(amount)}
                                    onChange={handleAmountChange}
                                    placeholder="0"
                                />
                            </div>

                            {/* Quick Amount Buttons */}
                            <div className="quick-amounts">
                                {QUICK_AMOUNTS.map(k => (
                                    <button
                                        key={k}
                                        className="quick-amount-btn"
                                        onClick={() => handleQuickAmount(k)}
                                    >
                                        +{k}K
                                    </button>
                                ))}
                            </div>

                            {error && <div className="quick-add-error">{error}</div>}

                            {/* Next Button */}
                            <button
                                className="quick-add-next"
                                onClick={goNext}
                                disabled={!amount}
                            >
                                <span>Continue</span>
                                <ChevronRight size={20} />
                            </button>
                        </motion.div>
                    )}

                    {/* Step 1: Category & Details */}
                    {step === 1 && (
                        <motion.div
                            key="step1"
                            className="quick-add-step step-details"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.2 }}
                        >
                            {/* Name Input */}
                            <div className="detail-section">
                                <label className="detail-label">Name</label>
                                <input
                                    type="text"
                                    className="name-input"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Transaction name (e.g., Starbucks)"
                                    autoFocus
                                />
                            </div>

                            {/* Category/Source Selection */}
                            {type === 'expense' ? (
                                <>
                                    <div className="detail-section">
                                        <label className="detail-label">Category</label>
                                        <div className="option-chips">
                                            {options.categories.map(cat => (
                                                <button
                                                    key={cat.id}
                                                    className={`option-chip ${categoryId === cat.id ? 'selected' : ''}`}
                                                    onClick={() => { setCategoryId(cat.id); triggerImpact('light'); }}
                                                >
                                                    {cat.name}
                                                </button>
                                            ))}
                                            {/* Add New Category button */}
                                            <button
                                                className="option-chip add-new-chip"
                                                onClick={() => setShowAddCategory(true)}
                                            >
                                                <Plus size={14} />
                                                Add New
                                            </button>
                                        </div>
                                        {/* Inline Add Category Form */}
                                        {showAddCategory && (
                                            <div className="inline-add-form">
                                                <input
                                                    type="text"
                                                    className="inline-add-input"
                                                    value={newCategoryName}
                                                    onChange={(e) => setNewCategoryName(e.target.value)}
                                                    placeholder="Category name"
                                                    autoFocus
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') handleAddCategory();
                                                        if (e.key === 'Escape') setShowAddCategory(false);
                                                    }}
                                                />
                                                <button
                                                    className="inline-add-btn"
                                                    onClick={handleAddCategory}
                                                    disabled={addCategoryLoading || !newCategoryName.trim()}
                                                >
                                                    {addCategoryLoading ? <Loader2 size={16} className="spin" /> : <Check size={16} />}
                                                </button>
                                                <button
                                                    className="inline-cancel-btn"
                                                    onClick={() => {
                                                        setShowAddCategory(false);
                                                        setNewCategoryName('');
                                                    }}
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    <div className="detail-section">
                                        <label className="detail-label">Payment</label>
                                        <div className="option-chips">
                                            {options.paymentMethods.map(pm => (
                                                <button
                                                    key={pm.id}
                                                    className={`option-chip ${paymentMethodId === pm.id ? 'selected' : ''}`}
                                                    onClick={() => { setPaymentMethodId(pm.id); triggerImpact('light'); }}
                                                >
                                                    {pm.name}
                                                </button>
                                            ))}
                                            <button
                                                className="option-chip add-new-chip"
                                                onClick={() => setShowAddPayment(true)}
                                            >
                                                <Plus size={14} />
                                                Add New
                                            </button>
                                        </div>
                                        {showAddPayment && (
                                            <div className="inline-add-form">
                                                <input
                                                    type="text"
                                                    className="inline-add-input"
                                                    value={newPaymentName}
                                                    onChange={(e) => setNewPaymentName(e.target.value)}
                                                    placeholder="Payment name"
                                                    autoFocus
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') handleAddPayment();
                                                        if (e.key === 'Escape') setShowAddPayment(false);
                                                    }}
                                                />
                                                <button
                                                    className="inline-add-btn"
                                                    onClick={handleAddPayment}
                                                    disabled={addPaymentLoading || !newPaymentName.trim()}
                                                >
                                                    {addPaymentLoading ? <Loader2 size={16} className="spin" /> : <Check size={16} />}
                                                </button>
                                                <button
                                                    className="inline-cancel-btn"
                                                    onClick={() => {
                                                        setShowAddPayment(false);
                                                        setNewPaymentName('');
                                                    }}
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    <div className="detail-section">
                                        <label className="detail-label">Group</label>
                                        <div className="option-chips">
                                            {options.groups.map(grp => (
                                                <button
                                                    key={grp.id}
                                                    className={`option-chip ${groupId === grp.id ? 'selected' : ''}`}
                                                    onClick={() => { setGroupId(grp.id); triggerImpact('light'); }}
                                                >
                                                    {grp.name}
                                                </button>
                                            ))}
                                            <button
                                                className="option-chip add-new-chip"
                                                onClick={() => setShowAddGroup(true)}
                                            >
                                                <Plus size={14} />
                                                Add New
                                            </button>
                                        </div>
                                        {showAddGroup && (
                                            <div className="inline-add-form">
                                                <input
                                                    type="text"
                                                    className="inline-add-input"
                                                    value={newGroupName}
                                                    onChange={(e) => setNewGroupName(e.target.value)}
                                                    placeholder="Group name"
                                                    autoFocus
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') handleAddGroup();
                                                        if (e.key === 'Escape') setShowAddGroup(false);
                                                    }}
                                                />
                                                <button
                                                    className="inline-add-btn"
                                                    onClick={handleAddGroup}
                                                    disabled={addGroupLoading || !newGroupName.trim()}
                                                >
                                                    {addGroupLoading ? <Loader2 size={16} className="spin" /> : <Check size={16} />}
                                                </button>
                                                <button
                                                    className="inline-cancel-btn"
                                                    onClick={() => {
                                                        setShowAddGroup(false);
                                                        setNewGroupName('');
                                                    }}
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div className="detail-section">
                                    <label className="detail-label">Source</label>
                                    <div className="option-chips">
                                        {(options.incomeSources || []).map(src => (
                                            <button
                                                key={src.id}
                                                className={`option-chip ${incomeSourceId === src.id ? 'selected' : ''}`}
                                                onClick={() => { setIncomeSourceId(src.id); triggerImpact('light'); }}
                                            >
                                                {src.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Date Input */}
                            <div className="detail-section">
                                <label className="detail-label">Date</label>
                                <div className="date-input-wrapper">
                                    <Calendar size={18} className="date-icon" />
                                    <input
                                        type="date"
                                        className="date-input"
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Note Input */}
                            <div className="detail-section">
                                <label className="detail-label">Note (optional)</label>
                                <input
                                    type="text"
                                    className="note-input"
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                    placeholder="Add a note..."
                                />
                            </div>

                            {error && <div className="quick-add-error">{error}</div>}

                            {/* Save Button */}
                            <button
                                className={`quick-add-save ${type}`}
                                onClick={handleSubmit}
                                disabled={loading}
                            >
                                {loading ? (
                                    <div className="save-loader" />
                                ) : (
                                    <>
                                        <Check size={20} />
                                        <span>Save {type === 'expense' ? 'Expense' : 'Income'}</span>
                                    </>
                                )}
                            </button>
                        </motion.div>
                    )}

                    {/* Step 2: Success */}
                    {step === 2 && (
                        <motion.div
                            key="step2"
                            className="quick-add-step step-success"
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                        >
                            <div className={`success-icon ${type}`}>
                                <Check size={48} />
                            </div>
                            <div className="success-amount">
                                Rp {formatDisplayAmount(amount)}
                            </div>
                            <div className="success-text">
                                {type === 'expense' ? 'Expense' : 'Income'} saved!
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
}
