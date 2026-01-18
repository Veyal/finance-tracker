import { useState, useEffect, useRef } from 'react';
import { X, Check, ChevronRight, ChevronLeft, Minus, Plus, Calendar, Loader2 } from 'lucide-react';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { transactions, categories, groups, paymentMethods } from '../api/api';
import { useHaptics } from '../hooks/useHaptics';
import NumberPad from './NumberPad';
import DatePicker from './DatePicker';
import './QuickAddForm.css';

// Local storage keys
const STORAGE_KEYS = {
    lastCategory: 'ft_last_category',
    lastGroup: 'ft_last_group',
    lastPayment: 'ft_last_payment',
    lastIncomeSource: 'ft_last_income_source',
};

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

    // Inline add states
    const [showAddCategory, setShowAddCategory] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [addCategoryLoading, setAddCategoryLoading] = useState(false);

    const [showAddGroup, setShowAddGroup] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');
    const [addGroupLoading, setAddGroupLoading] = useState(false);

    const [showAddPayment, setShowAddPayment] = useState(false);
    const [newPaymentName, setNewPaymentName] = useState('');
    const [addPaymentLoading, setAddPaymentLoading] = useState(false);

    const amountInputRef = useRef(null);
    const dragControls = useDragControls();

    // Lock body scroll when modal is open
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = '';
        };
    }, []);

    // Initial Load & Smart Defaults
    useEffect(() => {
        const lastCat = localStorage.getItem(STORAGE_KEYS.lastCategory);
        const lastGroup = localStorage.getItem(STORAGE_KEYS.lastGroup);
        const lastPayment = localStorage.getItem(STORAGE_KEYS.lastPayment);
        const lastSource = localStorage.getItem(STORAGE_KEYS.lastIncomeSource);

        let defaultCat = lastCat;

        // Time-based smart suggestion if no strong preference
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

        if (defaultCat && options.categories.find(c => c.id === defaultCat)) setCategoryId(defaultCat);
        if (lastGroup && options.groups.find(g => g.id === lastGroup)) setGroupId(lastGroup);
        if (lastPayment && options.paymentMethods.find(p => p.id === lastPayment)) setPaymentMethodId(lastPayment);
        if (lastSource && options.incomeSources?.find(s => s.id === lastSource)) setIncomeSourceId(lastSource);
    }, [options]);

    // Focus input management
    useEffect(() => {
        if (step === 0 && amountInputRef.current) {
            // Tiny delay to ensure modal animation doesn't conflict with focus
            setTimeout(() => amountInputRef.current?.focus(), 100);
        }
    }, [step]);

    function formatDisplayAmount(amt) {
        if (!amt) return '0';
        return new Intl.NumberFormat('id-ID').format(parseInt(amt));
    }

    // Helper to add new items
    async function handleAddItem(
        type, name, setLoading, setShow, setNewName, api, setIds
    ) {
        if (!name.trim() || type.loading) return;
        setLoading(true);
        triggerImpact('medium');
        try {
            const newItem = await api.create({ name: name.trim() });
            if (onOptionsChange) onOptionsChange();
            setIds(newItem.id);
            setShow(false);
            setNewName('');
            triggerSuccess();
        } catch (err) {
            console.error(`Failed to add ${type}:`, err);
            triggerError();
        } finally {
            setLoading(false);
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
                date: `${date}T12:00:00`, // Use noon local time to avoid timezone boundary issues
                category_id: type === 'expense' ? (categoryId || null) : null,
                group_id: type === 'expense' ? (groupId || null) : null,
                payment_method_id: paymentMethodId || null,
                income_source_id: type === 'income' ? (incomeSourceId || null) : null,
                merchant: name || null,
                note: note || null,
            };

            await transactions.create(data);

            // Update Defaults
            if (categoryId) localStorage.setItem(STORAGE_KEYS.lastCategory, categoryId);
            if (groupId) localStorage.setItem(STORAGE_KEYS.lastGroup, groupId);
            if (paymentMethodId) localStorage.setItem(STORAGE_KEYS.lastPayment, paymentMethodId);
            if (incomeSourceId) localStorage.setItem(STORAGE_KEYS.lastIncomeSource, incomeSourceId);

            setStep(2); // Success!
            triggerSuccess();
            setTimeout(() => {
                onSave(data);
            }, 1200); // 1.2s to enjoy the success animation
        } catch (err) {
            triggerError();
            setError('Failed to save');
            setLoading(false);
        }
    }

    function handleBackdropClick(e) {
        if (e.target === e.currentTarget) onClose();
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

    // Handle drag end - close if dragged down enough
    function handleDragEnd(event, info) {
        if (info.offset.y > 100) {
            onClose();
        }
    }

    return (
        <div className="quick-add-overlay" onClick={handleBackdropClick}>
            <motion.div
                className="quick-add-container"
                initial={{ opacity: 0, y: 100 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 100 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                drag="y"
                dragControls={dragControls}
                dragListener={false}
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={{ top: 0, bottom: 0.5 }}
                onDragEnd={handleDragEnd}
            >
                {/* Drag handle indicator */}
                <div
                    className="modal-drag-handle"
                    onPointerDown={(e) => dragControls.start(e)}
                    style={{ touchAction: 'none' }}
                >
                    <div className="drag-indicator" />
                </div>

                {/* Header */}
                <div className="quick-add-header">
                    {step === 1 ? (
                        <button className="quick-add-back" onClick={() => setStep(0)}>
                            <ChevronLeft size={24} />
                        </button>
                    ) : <div style={{ width: 40 }} />}

                    <div className="quick-add-title">
                        {step === 0 ? 'Quick Add' : step === 1 ? 'Details' : 'Success'}
                    </div>

                    <button className="quick-add-close" onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>

                <AnimatePresence mode="wait">
                    {/* Step 0: Amount */}
                    {step === 0 && (
                        <motion.div
                            key="step0"
                            className="quick-add-step step-amount"
                            initial={{ opacity: 0, x: -50 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -50 }}
                            transition={{ duration: 0.2 }}
                        >
                            {/* Type Toggle */}
                            <div className="type-toggle-pill">
                                {type === 'expense' && (
                                    <motion.div layoutId="active-pill" className="type-active-bg expense" />
                                )}
                                {type === 'income' && (
                                    <motion.div layoutId="active-pill" className="type-active-bg income" />
                                )}
                                <button
                                    className={`type-pill ${type === 'expense' ? 'active' : ''}`}
                                    onClick={() => { setType('expense'); triggerImpact('light'); }}
                                >
                                    <Minus size={16} /> Expense
                                </button>
                                <button
                                    className={`type-pill ${type === 'income' ? 'active' : ''}`}
                                    onClick={() => { setType('income'); triggerImpact('light'); }}
                                >
                                    <Plus size={16} /> Income
                                </button>
                            </div>

                            {/* Amount Display */}
                            <div className="amount-display">
                                <span className="amount-currency">Rp</span>
                                <input
                                    ref={amountInputRef}
                                    type="text"
                                    inputMode="decimal"
                                    className="quick-add-desktop-input"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                                    placeholder="0"
                                    autoFocus
                                    onKeyDown={(e) => e.key === 'Enter' && amount && goNext()}
                                />
                                <div className="quick-add-mobile-display">
                                    {amount ? new Intl.NumberFormat('id-ID').format(amount) : '0'}
                                </div>
                            </div>

                            {/* Numpad */}
                            <div className="quick-add-numpad">
                                <NumberPad
                                    onInput={(val) => {
                                        if (val === '.' && amount.includes('.')) return;
                                        setAmount(prev => (prev === '0' && val !== '.' ? val : prev + val));
                                        triggerImpact('light');
                                    }}
                                    onDelete={() => {
                                        setAmount(prev => prev.slice(0, -1));
                                        triggerImpact('light');
                                    }}
                                />
                            </div>

                            {error && <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="quick-add-error">{error}</motion.div>}

                            <motion.button
                                className="quick-add-next"
                                onClick={goNext}
                                disabled={!amount}
                                whileTap={{ scale: 0.95 }}
                            >
                                Continue <ChevronRight size={20} />
                            </motion.button>
                        </motion.div>
                    )}

                    {/* Step 1: Details */}
                    {step === 1 && (
                        <motion.div
                            key="step1"
                            className="quick-add-step step-details"
                            initial={{ opacity: 0, x: 50 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 50 }}
                            transition={{ duration: 0.2 }}
                        >
                            <div className="detail-section">
                                <label className="detail-label">Name</label>
                                <input
                                    type="text"
                                    className="name-input"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="e.g. Starbucks"
                                    autoFocus
                                />
                            </div>

                            {/* Conditional Categories / Groups for Expense */}
                            {type === 'expense' ? (
                                <>
                                    <div className="detail-section">
                                        <label className="detail-label">Category</label>
                                        <div className="option-chips">
                                            {options.categories.map(cat => (
                                                <motion.button
                                                    key={cat.id}
                                                    whileTap={{ scale: 0.95 }}
                                                    className={`option-chip ${categoryId === cat.id ? 'selected' : ''}`}
                                                    onClick={() => { setCategoryId(cat.id); triggerImpact('light'); }}
                                                >
                                                    {cat.name}
                                                </motion.button>
                                            ))}
                                            <button className="option-chip add-new-chip" onClick={() => setShowAddCategory(true)}>
                                                <Plus size={14} /> Add
                                            </button>
                                        </div>
                                        {/* Inline Add Category */}
                                        <AnimatePresence>
                                            {showAddCategory && (
                                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="inline-add-form">
                                                    <input
                                                        className="inline-add-input"
                                                        value={newCategoryName}
                                                        onChange={(e) => setNewCategoryName(e.target.value)}
                                                        placeholder="New Category"
                                                        autoFocus
                                                        onKeyDown={(e) => e.key === 'Enter' && handleAddItem('category', newCategoryName, setAddCategoryLoading, setShowAddCategory, setNewCategoryName, categories, setCategoryId)}
                                                    />
                                                    <button className="inline-add-btn" onClick={() => handleAddItem('category', newCategoryName, setAddCategoryLoading, setShowAddCategory, setNewCategoryName, categories, setCategoryId)}>
                                                        {addCategoryLoading ? <Loader2 size={16} className="spin" /> : <Check size={16} />}
                                                    </button>
                                                    <button className="inline-cancel-btn" onClick={() => setShowAddCategory(false)}><X size={16} /></button>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>

                                    {/* Groups */}
                                    <div className="detail-section">
                                        <label className="detail-label">Group</label>
                                        <div className="option-chips">
                                            {options.groups.map(grp => (
                                                <motion.button
                                                    key={grp.id}
                                                    whileTap={{ scale: 0.95 }}
                                                    className={`option-chip ${groupId === grp.id ? 'selected' : ''}`}
                                                    onClick={() => { setGroupId(grp.id); triggerImpact('light'); }}
                                                >
                                                    {grp.name}
                                                </motion.button>
                                            ))}
                                            <button className="option-chip add-new-chip" onClick={() => setShowAddGroup(true)}>
                                                <Plus size={14} /> Add
                                            </button>
                                        </div>
                                        <AnimatePresence>
                                            {showAddGroup && (
                                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="inline-add-form">
                                                    <input
                                                        className="inline-add-input"
                                                        value={newGroupName}
                                                        onChange={(e) => setNewGroupName(e.target.value)}
                                                        placeholder="New Group"
                                                        autoFocus
                                                        onKeyDown={(e) => e.key === 'Enter' && handleAddItem('group', newGroupName, setAddGroupLoading, setShowAddGroup, setNewGroupName, groups, setGroupId)}
                                                    />
                                                    <button className="inline-add-btn" onClick={() => handleAddItem('group', newGroupName, setAddGroupLoading, setShowAddGroup, setNewGroupName, groups, setGroupId)}>
                                                        {addGroupLoading ? <Loader2 size={16} className="spin" /> : <Check size={16} />}
                                                    </button>
                                                    <button className="inline-cancel-btn" onClick={() => setShowAddGroup(false)}><X size={16} /></button>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </>
                            ) : (
                                // Income Sources
                                <div className="detail-section">
                                    <label className="detail-label">Source</label>
                                    <div className="option-chips">
                                        {options.incomeSources?.map(src => (
                                            <motion.button
                                                key={src.id}
                                                whileTap={{ scale: 0.95 }}
                                                className={`option-chip ${incomeSourceId === src.id ? 'selected' : ''}`}
                                                onClick={() => { setIncomeSourceId(src.id); triggerImpact('light'); }}
                                            >
                                                {src.name}
                                            </motion.button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Payment Method */}
                            <div className="detail-section">
                                <label className="detail-label">{type === 'expense' ? 'Payment Method' : 'Account'}</label>
                                <div className="option-chips">
                                    {options.paymentMethods.map(pm => (
                                        <motion.button
                                            key={pm.id}
                                            whileTap={{ scale: 0.95 }}
                                            className={`option-chip ${paymentMethodId === pm.id ? 'selected' : ''}`}
                                            onClick={() => { setPaymentMethodId(pm.id); triggerImpact('light'); }}
                                        >
                                            {pm.name}
                                        </motion.button>
                                    ))}
                                    <button className="option-chip add-new-chip" onClick={() => setShowAddPayment(true)}>
                                        <Plus size={14} /> Add
                                    </button>
                                </div>
                                <AnimatePresence>
                                    {showAddPayment && (
                                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="inline-add-form">
                                            <input
                                                className="inline-add-input"
                                                value={newPaymentName}
                                                onChange={(e) => setNewPaymentName(e.target.value)}
                                                placeholder="New Method"
                                                autoFocus
                                                onKeyDown={(e) => e.key === 'Enter' && handleAddItem('payment', newPaymentName, setAddPaymentLoading, setShowAddPayment, setNewPaymentName, paymentMethods, setPaymentMethodId)}
                                            />
                                            <button className="inline-add-btn" onClick={() => handleAddItem('payment', newPaymentName, setAddPaymentLoading, setShowAddPayment, setNewPaymentName, paymentMethods, setPaymentMethodId)}>
                                                {addPaymentLoading ? <Loader2 size={16} className="spin" /> : <Check size={16} />}
                                            </button>
                                            <button className="inline-cancel-btn" onClick={() => setShowAddPayment(false)}><X size={16} /></button>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            <div className="detail-section">
                                <label className="detail-label">Date</label>
                                <DatePicker
                                    value={date}
                                    onChange={setDate}
                                />
                            </div>

                            <div className="detail-section">
                                <label className="detail-label">Notes</label>
                                <input
                                    type="text"
                                    className="note-input"
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                    placeholder="Add a note..."
                                />
                            </div>

                            <motion.button
                                className={`quick-add-save ${type}`}
                                onClick={handleSubmit}
                                disabled={loading}
                                whileTap={{ scale: 0.95 }}
                            >
                                {loading ? <div className="save-loader" /> : (
                                    <>
                                        <Check size={20} /> Save {type === 'expense' ? 'Expense' : 'Income'}
                                    </>
                                )}
                            </motion.button>
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
                                <Check size={48} strokeWidth={3} />
                            </div>
                            <div className="success-amount">
                                Rp {formatDisplayAmount(amount)}
                            </div>
                            <div className="success-text">
                                Transaction Saved
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
}
