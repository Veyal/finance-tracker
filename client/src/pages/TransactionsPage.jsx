import { useState, useEffect } from 'react';
import { Search, Filter, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { transactions, categories, groups, paymentMethods, incomeSources, savings } from '../api/api';
import TransactionCard from '../components/TransactionCard';
import TransactionForm from '../components/TransactionForm';
import TransactionDetailModal from '../components/TransactionDetailModal';
import SummaryCard from '../components/SummaryCard';
import PrivacyToggle from '../components/PrivacyToggle';
import './TransactionsPage.css';

// Helper function to group transactions by date
function groupTransactionsByDate(txList, sortBy = 'date', sortOrder = 'desc') {
    const groups = {};
    txList.forEach(tx => {
        const date = tx.date.split(/[T\s]/)[0]; // Get YYYY-MM-DD
        if (!groups[date]) {
            groups[date] = [];
        }
        groups[date].push(tx);
    });

    // Convert to array
    const entries = Object.entries(groups);

    // Only sort the groups by date if we are actually sorting by date
    if (sortBy === 'date') {
        entries.sort((a, b) => {
            return sortOrder === 'desc'
                ? b[0].localeCompare(a[0])
                : a[0].localeCompare(b[0]);
        });
    }

    return entries.map(([date, transactions]) => ({ date, transactions }));
}

// Helper function to format date divider
function formatDateDivider(dateStr) {
    const date = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
        return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
        return 'Yesterday';
    } else {
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'short',
            day: 'numeric',
            year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
        });
    }
}

import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Sortable Transaction Item Wrapper with drag handle
function SortableTransaction({ transaction, onEdit, onDelete, onClick }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: transaction.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 100 : 'auto',
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} className="stagger-item">
            <TransactionCard
                transaction={transaction}
                onEdit={onEdit}
                onDelete={onDelete}
                onClick={onClick}
                dragHandleProps={listeners}
            />
        </div>
    );
}

export default function TransactionsPage() {
    const [data, setData] = useState({ transactions: [], totals: { expense: 0, income: 0, net: 0 } });
    const [loading, setLoading] = useState(true);
    const [showFilters, setShowFilters] = useState(false);
    const [editingTx, setEditingTx] = useState(null);
    const [viewingTx, setViewingTx] = useState(null);
    const [options, setOptions] = useState({ categories: [], groups: [], paymentMethods: [], incomeSources: [], savings: [] });

    // DnD Sensors
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                delay: 250,
                tolerance: 5,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // Filter state
    const [filters, setFilters] = useState({
        from: '',
        to: '',
        type: 'all',
        category_id: '',
        group_id: '',
        payment_method_id: '',
        q: '',
        sort_by: 'date',
        sort_order: 'desc',
    });

    // Track active preset for highlighting
    const [activePreset, setActivePreset] = useState('all');

    // Quick date presets
    const today = new Date().toISOString().split('T')[0];
    const getDateRange = (preset) => {
        const now = new Date();
        switch (preset) {
            case 'today':
                return { from: today, to: today };
            case 'week': {
                const weekAgo = new Date(now);
                weekAgo.setDate(weekAgo.getDate() - 7);
                return { from: weekAgo.toISOString().split('T')[0], to: today };
            }
            case 'month': {
                const now = new Date();
                const y = now.getFullYear();
                const m = String(now.getMonth() + 1).padStart(2, '0');
                const startOfMonth = `${y}-${m}-01`;
                return { from: startOfMonth, to: today };
            }
            case 'all':
                return { from: '', to: '' };
            default:
                return { from: '', to: '' };
        }
    };

    useEffect(() => {
        loadData();
    }, [filters.from, filters.to, filters.type, filters.category_id, filters.group_id, filters.payment_method_id, filters.sort_by, filters.sort_order, options.savings]);

    useEffect(() => {
        loadOptions();
    }, []);

    async function loadData() {
        try {
            setLoading(true);
            const params = {};
            if (filters.from) params.from = filters.from;
            if (filters.to) params.to = filters.to;
            if (filters.type && filters.type !== 'all') params.type = filters.type;
            if (filters.category_id) params.category_id = filters.category_id;
            if (filters.group_id) params.group_id = filters.group_id;
            if (filters.payment_method_id) params.payment_method_id = filters.payment_method_id;
            if (filters.q) params.q = filters.q;
            params.sort_by = filters.sort_by;
            params.sort_order = filters.sort_order;
            params.limit = 100;

            const result = await transactions.list(params);

            // Enrich with saving names if available
            if (options.savings && options.savings.length > 0) {
                result.transactions = result.transactions.map(tx => {
                    if (tx.type === 'savings_deposit' || tx.type === 'savings_withdrawal') {
                        // Try to find the saving account
                        // Assuming the ID field might be saving_id, savings_id, or account_id
                        const savingId = tx.saving_id || tx.savings_id || tx.account_id;
                        if (savingId) {
                            const account = options.savings.find(s => s.id === savingId);
                            if (account) {
                                return { ...tx, saving_name: account.name };
                            }
                        }
                    }
                    return tx;
                });
            }

            setData(result);
        } catch (error) {
            console.error('Failed to load transactions:', error);
        } finally {
            setLoading(false);
        }
    }

    async function loadOptions() {
        try {
            const [cats, grps, pms, sources, svgs] = await Promise.all([
                categories.list('true'),
                groups.list('true'),
                paymentMethods.list('true'),
                incomeSources.list('true'),
                savings.list().then(res => res.accounts || []) // savings.list returns { accounts: [], ... }
            ]);
            setOptions({ categories: cats, groups: grps, paymentMethods: pms, incomeSources: sources, savings: svgs });
        } catch (error) {
            console.error('Failed to load options:', error);
        }
    }

    function handleApplyFilters() {
        loadData();
        setShowFilters(false);
    }

    function handleClearFilters() {
        setFilters({
            from: '',
            to: '',
            type: 'all',
            category_id: '',
            group_id: '',
            payment_method_id: '',
            q: '',
            sort_by: 'date',
            sort_order: 'desc',
        });
    }

    function handleQuickDate(preset) {
        const range = getDateRange(preset);
        setFilters(prev => ({ ...prev, ...range }));
        setActivePreset(preset);
    }

    async function handleDelete(id) {
        try {
            await transactions.delete(id);
            loadData();
        } catch (error) {
            console.error('Failed to delete:', error);
        }
    }

    function handleUpdate(updatedTx) {
        setEditingTx(null);
        loadData();
    }

    function handleDragEnd(event) {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            setData((prev) => {
                const oldIndex = prev.transactions.findIndex((t) => t.id === active.id);
                const newIndex = prev.transactions.findIndex((t) => t.id === over.id);

                const newTransactions = arrayMove(prev.transactions, oldIndex, newIndex);

                // Prepare updates for backend
                // Re-assign sort orders based on new index
                // Also check if date changed (dragged to different date group visually, though list is linear)

                const activeTx = prev.transactions[oldIndex];
                const overTx = prev.transactions[newIndex];

                // If dragged to a spot with a different date, update the date
                let newDate = activeTx.date;
                if (activeTx.date.split('T')[0] !== overTx.date.split('T')[0]) {
                    newDate = overTx.date; // Adopt the date of the target
                }

                const updates = newTransactions.map((tx, index) => ({
                    id: tx.id,
                    sort_order: index, // Simple index-based order
                    date: tx.id === active.id ? newDate : undefined // Only update date for the moved item if needed
                }));

                // Call API in background
                transactions.reorder(updates).catch(err => console.error("Reorder failed", err));

                return {
                    ...prev,
                    transactions: newTransactions
                };
            });
        }
    }

    const activeFilterCount = [
        filters.from || filters.to,
        filters.type !== 'all',
        filters.category_id,
        filters.group_id,
        filters.payment_method_id,
    ].filter(Boolean).length;

    return (
        <div className="page transactions-page">
            <header className="transactions-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <h1>All Transactions</h1>
                    <PrivacyToggle style={{ marginTop: '4px' }} />
                </div>
                <div className="header-actions">
                    <div className="search-box">
                        <Search size={18} />
                        <input
                            type="text"
                            placeholder="Search..."
                            value={filters.q}
                            onChange={(e) => setFilters(prev => ({ ...prev, q: e.target.value }))}
                            onKeyDown={(e) => e.key === 'Enter' && loadData()}
                        />
                    </div>
                    <button
                        type="button"
                        className={`btn btn-secondary filter-btn ${activeFilterCount > 0 ? 'has-filters' : ''}`}
                        onClick={() => setShowFilters(!showFilters)}
                    >
                        <Filter size={18} />
                        {activeFilterCount > 0 && <span className="filter-badge">{activeFilterCount}</span>}
                    </button>
                </div>
            </header>

            {/* Quick Date Filters */}
            <div className="quick-filters">
                <button
                    type="button"
                    className={`chip ${activePreset === 'all' ? 'active' : ''}`}
                    onClick={() => handleQuickDate('all')}
                >
                    All Time
                </button>
                <button
                    type="button"
                    className={`chip ${activePreset === 'today' ? 'active' : ''}`}
                    onClick={() => handleQuickDate('today')}
                >
                    Today
                </button>
                <button
                    type="button"
                    className={`chip ${activePreset === 'week' ? 'active' : ''}`}
                    onClick={() => handleQuickDate('week')}
                >
                    This Week
                </button>
                <button
                    type="button"
                    className={`chip ${activePreset === 'month' ? 'active' : ''}`}
                    onClick={() => handleQuickDate('month')}
                >
                    This Month
                </button>

                <div className="type-chips">
                    <button
                        type="button"
                        className={`chip chip-expense ${filters.type === 'expense' ? 'active' : ''}`}
                        onClick={() => setFilters(prev => ({ ...prev, type: 'expense' }))}
                    >
                        Expenses
                    </button>
                    <button
                        type="button"
                        className={`chip chip-all ${filters.type === 'all' ? 'active' : ''}`}
                        onClick={() => setFilters(prev => ({ ...prev, type: 'all' }))}
                    >
                        All
                    </button>
                    <button
                        type="button"
                        className={`chip chip-income ${filters.type === 'income' ? 'active' : ''}`}
                        onClick={() => setFilters(prev => ({ ...prev, type: 'income' }))}
                    >
                        Income
                    </button>
                </div>
            </div>

            {/* Filter Panel - Visual position adjusted by order */}
            {showFilters && (
                <div className="filter-panel card animate-slide-up" style={{ marginBottom: '16px' }}>
                    <div className="filter-header">
                        <h3>Filters</h3>
                        <button type="button" className="btn btn-ghost" onClick={handleClearFilters}>
                            Clear All
                        </button>
                    </div>

                    <div className="filter-grid">
                        <div className="filter-group">
                            <label className="input-label">From Date</label>
                            <input
                                type="date"
                                className="input"
                                value={filters.from}
                                onChange={(e) => setFilters(prev => ({ ...prev, from: e.target.value }))}
                            />
                        </div>
                        <div className="filter-group">
                            <label className="input-label">To Date</label>
                            <input
                                type="date"
                                className="input"
                                value={filters.to}
                                onChange={(e) => setFilters(prev => ({ ...prev, to: e.target.value }))}
                            />
                        </div>
                        <div className="filter-group">
                            <label className="input-label">Category</label>
                            <select
                                className="select"
                                value={filters.category_id}
                                onChange={(e) => setFilters(prev => ({ ...prev, category_id: e.target.value }))}
                            >
                                <option value="">All Categories</option>
                                {options.categories.map(cat => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="filter-group">
                            <label className="input-label">Group</label>
                            <select
                                className="select"
                                value={filters.group_id}
                                onChange={(e) => setFilters(prev => ({ ...prev, group_id: e.target.value }))}
                            >
                                <option value="">All Groups</option>
                                {options.groups.map(grp => (
                                    <option key={grp.id} value={grp.id}>{grp.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="filter-group">
                            <label className="input-label">Payment Method</label>
                            <select
                                className="select"
                                value={filters.payment_method_id}
                                onChange={(e) => setFilters(prev => ({ ...prev, payment_method_id: e.target.value }))}
                            >
                                <option value="">All Methods</option>
                                {options.paymentMethods.map(pm => (
                                    <option key={pm.id} value={pm.id}>{pm.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="filter-group">
                            <label className="input-label">Sort By</label>
                            <select
                                className="select"
                                value={filters.sort_by}
                                onChange={(e) => setFilters(prev => ({ ...prev, sort_by: e.target.value }))}
                            >
                                <option value="date">Date</option>
                                <option value="amount">Amount</option>
                                <option value="merchant">Merchant</option>
                            </select>
                        </div>
                        <div className="filter-group">
                            <label className="input-label">Order</label>
                            <select
                                className="select"
                                value={filters.sort_order}
                                onChange={(e) => setFilters(prev => ({ ...prev, sort_order: e.target.value }))}
                            >
                                <option value="desc">
                                    {filters.sort_by === 'date' ? 'Newest First' : filters.sort_by === 'amount' ? 'Highest First' : 'Z to A'}
                                </option>
                                <option value="asc">
                                    {filters.sort_by === 'date' ? 'Oldest First' : filters.sort_by === 'amount' ? 'Lowest First' : 'A to Z'}
                                </option>
                            </select>
                        </div>
                    </div>

                    <button type="button" className="btn btn-primary" onClick={handleApplyFilters}>
                        Apply Filters
                    </button>
                </div>
            )}

            {/* Summary */}
            <SummaryCard
                expense={data.totals.expense}
                income={data.totals.income}
                net={data.totals.net}
            />

            {/* Transaction List */}
            <div className="transaction-list">
                {loading ? (
                    <div className="loader">
                        <div className="loader-spinner"></div>
                    </div>
                ) : data.transactions.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">📊</div>
                        <div className="empty-state-title">No transactions found</div>
                        <div className="empty-state-text">
                            Try adjusting your filters or date range
                        </div>
                    </div>
                ) : (
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <div className="results-count">
                            {data.transactions.length} transaction{data.transactions.length !== 1 ? 's' : ''}
                        </div>
                        <SortableContext
                            items={data.transactions.map(t => t.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            {groupTransactionsByDate(data.transactions, filters.sort_by, filters.sort_order).map(({ date, transactions: txs }) => (
                                <div key={date} className="date-group">
                                    <div className="date-divider">
                                        <span className="date-divider-text">{formatDateDivider(date)}</span>
                                    </div>
                                    {txs.map((tx) => (
                                        <SortableTransaction
                                            key={tx.id}
                                            transaction={tx}
                                            onEdit={() => setEditingTx(tx)}
                                            onDelete={() => handleDelete(tx.id)}
                                            onClick={(tx) => setViewingTx(tx)}
                                        />
                                    ))}
                                </div>
                            ))}
                        </SortableContext>
                    </DndContext>
                )}
            </div>

            {editingTx && (
                <TransactionForm
                    transaction={editingTx}
                    options={options}
                    onSave={handleUpdate}
                    onClose={() => setEditingTx(null)}
                    onOptionsChange={loadOptions}
                />
            )}

            {/* Transaction Detail Modal */}
            <AnimatePresence>
                {viewingTx && (
                    <TransactionDetailModal
                        transaction={viewingTx}
                        onClose={() => setViewingTx(null)}
                        onEdit={(tx) => {
                            setViewingTx(null);
                            setEditingTx(tx);
                        }}
                        onDelete={(id) => {
                            handleDelete(id);
                            setViewingTx(null);
                        }}
                        onRepaymentAdded={() => {
                            loadData();
                        }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
