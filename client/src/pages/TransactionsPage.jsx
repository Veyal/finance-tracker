import { useState, useEffect } from 'react';
import { Search, Filter, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { transactions, categories, groups, paymentMethods } from '../api/api';
import TransactionCard from '../components/TransactionCard';
import TransactionForm from '../components/TransactionForm';
import SummaryCard from '../components/SummaryCard';
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

export default function TransactionsPage() {
    const [data, setData] = useState({ transactions: [], totals: { expense: 0, income: 0, net: 0 } });
    const [loading, setLoading] = useState(true);
    const [showFilters, setShowFilters] = useState(false);
    const [editingTx, setEditingTx] = useState(null);
    const [options, setOptions] = useState({ categories: [], groups: [], paymentMethods: [] });

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
                const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
                return { from: monthStart.toISOString().split('T')[0], to: today };
            }
            case 'all':
                return { from: '', to: '' };
            default:
                return { from: '', to: '' };
        }
    };

    useEffect(() => {
        loadData();
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
                <h1>All Transactions</h1>
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
                        className={`chip ${filters.type === 'all' ? 'active' : ''}`}
                        onClick={() => setFilters(prev => ({ ...prev, type: 'all' }))}
                    >
                        All
                    </button>
                    <button
                        type="button"
                        className={`chip chip-expense ${filters.type === 'expense' ? 'active' : ''}`}
                        onClick={() => setFilters(prev => ({ ...prev, type: 'expense' }))}
                    >
                        Expenses
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

            {/* Summary */}
            <SummaryCard
                expense={data.totals.expense}
                income={data.totals.income}
                net={data.totals.net}
            />

            {/* Filter Panel */}
            {showFilters && (
                <div className="filter-panel card animate-slide-up">
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
                    <>
                        <div className="results-count">
                            {data.transactions.length} transaction{data.transactions.length !== 1 ? 's' : ''}
                        </div>
                        {groupTransactionsByDate(data.transactions).map(({ date, transactions: txs }) => (
                            <div key={date} className="date-group">
                                <div className="date-divider">
                                    <span className="date-divider-text">{formatDateDivider(date)}</span>
                                </div>
                                {txs.map((tx, index) => (
                                    <div key={tx.id} className="stagger-item">
                                        <TransactionCard
                                            transaction={tx}
                                            onEdit={() => setEditingTx(tx)}
                                            onDelete={() => handleDelete(tx.id)}
                                        />
                                    </div>
                                ))}
                            </div>
                        ))}
                    </>
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
