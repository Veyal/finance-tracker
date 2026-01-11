import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { transactions, categories, groups, paymentMethods, incomeSources } from '../api/api';
import TransactionCard from '../components/TransactionCard';
import TransactionForm from '../components/TransactionForm';
import QuickAddForm from '../components/QuickAddForm';
import SummaryCard from '../components/SummaryCard';
import FilterChips from '../components/FilterChips';
import './TodayPage.css';

export default function TodayPage() {
    const [data, setData] = useState({ transactions: [], totals: { expense: 0, income: 0, net: 0 } });
    const [loading, setLoading] = useState(true);
    const [showQuickAdd, setShowQuickAdd] = useState(false);
    const [editingTx, setEditingTx] = useState(null);
    const [filters, setFilters] = useState({ group_id: null, needs_review: false });
    const [options, setOptions] = useState({ categories: [], groups: [], paymentMethods: [], incomeSources: [] });

    const today = new Date().toISOString().split('T')[0];

    useEffect(() => {
        loadData();
        loadOptions();
    }, [filters]);

    async function loadData() {
        try {
            setLoading(true);
            const result = await transactions.list({
                from: today,
                to: today,
                group_id: filters.group_id || undefined,
                needs_review: filters.needs_review || undefined,
            });
            setData(result);
        } catch (error) {
            console.error('Failed to load transactions:', error);
        } finally {
            setLoading(false);
        }
    }

    async function loadOptions() {
        try {
            const [cats, grps, pms, sources] = await Promise.all([
                categories.list('true'),
                groups.list('true'),
                paymentMethods.list('true'),
                incomeSources.list('true'),
            ]);
            setOptions({ categories: cats, groups: grps, paymentMethods: pms, incomeSources: sources });
        } catch (error) {
            console.error('Failed to load options:', error);
        }
    }

    function handleQuickAddSave(newTx) {
        setShowQuickAdd(false);
        loadData();
    }

    function handleUpdate(updatedTx) {
        setEditingTx(null);
        loadData();
    }

    async function handleDelete(id) {
        try {
            await transactions.delete(id);
            loadData();
        } catch (error) {
            console.error('Failed to delete:', error);
        }
    }

    function formatDate(date) {
        return new Intl.DateTimeFormat('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
        }).format(date);
    }

    function getGreeting() {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 17) return 'Good afternoon';
        return 'Good evening';
    }

    return (
        <div className="page today-page">
            <header className="today-header">
                <div className="today-header-content">
                    <p className="today-greeting">{getGreeting()}</p>
                    <h1>Today</h1>
                    <p className="today-date">{formatDate(new Date())}</p>
                </div>
            </header>

            <SummaryCard
                expense={data.totals.expense}
                income={data.totals.income}
                net={data.totals.net}
            />

            <FilterChips
                groups={options.groups}
                selectedGroupId={filters.group_id}
                needsReview={filters.needs_review}
                onGroupChange={(id) => setFilters({ ...filters, group_id: id })}
                onNeedsReviewChange={(val) => setFilters({ ...filters, needs_review: val })}
            />

            <div className="transaction-list">
                {loading ? (
                    <div className="loader">
                        <div className="loader-spinner"></div>
                    </div>
                ) : data.transactions.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">✨</div>
                        <div className="empty-state-title">
                            {filters.needs_review ? 'All tidy!' : 'No transactions yet'}
                        </div>
                        <div className="empty-state-text">
                            {filters.needs_review
                                ? 'Everything is tidy. Great job!'
                                : 'Tap the + button to log your first expense'}
                        </div>
                    </div>
                ) : (
                    data.transactions.map((tx, index) => (
                        <div key={tx.id} className="stagger-item">
                            <TransactionCard
                                transaction={tx}
                                onEdit={() => setEditingTx(tx)}
                                onDelete={() => handleDelete(tx.id)}
                            />
                        </div>
                    ))
                )}
            </div>

            {/* FAB Button */}
            <button className="fab" onClick={() => setShowQuickAdd(true)}>
                <Plus size={28} />
            </button>

            {/* Quick Add Form (new step-based modal) */}
            {showQuickAdd && (
                <QuickAddForm
                    options={options}
                    onSave={handleQuickAddSave}
                    onClose={() => setShowQuickAdd(false)}
                    onOptionsChange={loadOptions}
                />
            )}

            {/* Full Edit Form (for editing existing transactions) */}
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
