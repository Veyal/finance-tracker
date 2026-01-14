import { useState, useEffect } from 'react';
import { Search, Filter, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { transactions, categories, groups, paymentMethods } from '../api/api';
import TransactionCard from '../components/TransactionCard';
import TransactionForm from '../components/TransactionForm';
import SummaryCard from '../components/SummaryCard';
import PrivacyToggle from '../components/PrivacyToggle';
import './TransactionsPage.css';

// Helper function to group transactions by date
function groupTransactionsByDate(txList) {
    const groups = {};
    txList.forEach(tx => {
        const date = tx.date.split(/[T\s]/)[0]; // Get YYYY-MM-DD
        if (!groups[date]) {
            groups[date] = [];
        }
        groups[date].push(tx);
    });

    // Convert to array sorted by date descending
    return Object.entries(groups)
        .sort((a, b) => b[0].localeCompare(a[0]))
        .map(([date, transactions]) => ({ date, transactions }));
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

// Sortable Transaction Item Wrapper
function SortableTransaction({ transaction, onEdit, onDelete }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id: transaction.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        touchAction: 'manipulation', // Allow scrolling, wait for delay to drag
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="stagger-item">
            <TransactionCard
                transaction={transaction}
                onEdit={onEdit}
                onDelete={onDelete}
            />
        </div>
    );
}

export default function TransactionsPage() {
    const [data, setData] = useState({ transactions: [], totals: { expense: 0, income: 0, net: 0 } });
    const [loading, setLoading] = useState(true);
    const [showFilters, setShowFilters] = useState(false);
    const [editingTx, setEditingTx] = useState(null);
    const [options, setOptions] = useState({ categories: [], groups: [], paymentMethods: [] });

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
    });

    // ... (keep existing state/effects)

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
    }, [filters.from, filters.to, filters.type, filters.category_id, filters.group_id, filters.payment_method_id]);

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
            params.limit = 100;

            const result = await transactions.list(params);
            setData(result);
        } catch (error) {
            console.error('Failed to load transactions:', error);
        } finally {
            setLoading(false);
        }
    }

    async function loadOptions() {
        try {
            const [cats, grps, pms] = await Promise.all([
                categories.list('true'),
                groups.list('true'),
                paymentMethods.list('true'),
            ]);
            setOptions({ categories: cats, groups: grps, paymentMethods: pms });
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
        });
    }

    function handleQuickDate(preset) {
        const range = getDateRange(preset);
        setFilters(prev => ({ ...prev, ...range }));
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

        if (active.id !== over.id) {
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
                    className={`chip ${!filters.from && !filters.to ? 'active' : ''}`}
                    onClick={() => handleQuickDate('all')}
                >
                    All Time
                </button>
                <button
                    type="button"
                    className={`chip ${filters.from === today && filters.to === today ? 'active' : ''}`}
                    onClick={() => handleQuickDate('today')}
                >
                    Today
                </button>
                <button
                    type="button"
                    className={`chip ${filters.from && filters.from !== today && !filters.to?.includes(today.slice(0, 7) + '-01') ? 'active' : ''}`}
                    onClick={() => handleQuickDate('week')}
                >
                    This Week
                </button>
                <button
                    type="button"
                    className={`chip ${filters.from?.endsWith('-01') ? 'active' : ''}`}
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
                            {groupTransactionsByDate(data.transactions).map(({ date, transactions: txs }) => (
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
        </div>
    );
}
