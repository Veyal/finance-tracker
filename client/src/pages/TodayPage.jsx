import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { transactions, categories, groups, paymentMethods, incomeSources, lendingSources } from '../api/api';
import TransactionCard from '../components/TransactionCard';
import TransactionForm from '../components/TransactionForm';
import QuickAddForm from '../components/QuickAddForm';
import SummaryCard from '../components/SummaryCard';
import TransactionDetailModal from '../components/TransactionDetailModal';
import PrivacyToggle from '../components/PrivacyToggle';
import './TodayPage.css';

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

export default function TodayPage() {
    const [data, setData] = useState({ transactions: [], totals: { expense: 0, income: 0, net: 0 } });
    const [loading, setLoading] = useState(true);
    const [showQuickAdd, setShowQuickAdd] = useState(false);
    const [editingTx, setEditingTx] = useState(null);
    const [viewingTx, setViewingTx] = useState(null);
    const [options, setOptions] = useState({ categories: [], groups: [], paymentMethods: [], incomeSources: [] });

    const today = new Date().toISOString().split('T')[0];

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

    useEffect(() => {
        loadData();
        loadOptions();
    }, []);

    async function loadData() {
        try {
            setLoading(true);
            const result = await transactions.list({
                from: today,
                to: today,
                // Removed filters per request
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
            const [cats, grps, pms, sources, lending] = await Promise.all([
                categories.list('true'),
                groups.list('true'),
                paymentMethods.list('true'),
                incomeSources.list('true'),
                lendingSources.list(),
            ]);
            setOptions({
                categories: cats,
                groups: grps,
                paymentMethods: pms,
                incomeSources: sources,
                lendingSources: lending
            });
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

    function handleDragEnd(event) {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            setData((prev) => {
                const oldIndex = prev.transactions.findIndex((t) => t.id === active.id);
                const newIndex = prev.transactions.findIndex((t) => t.id === over.id);

                const newTransactions = arrayMove(prev.transactions, oldIndex, newIndex);

                const updates = newTransactions.map((tx, index) => ({
                    id: tx.id,
                    sort_order: index,
                    // No date update needed as it's "Today" page, implies same date
                }));

                transactions.reorder(updates).catch(err => console.error("Reorder failed", err));

                return {
                    ...prev,
                    transactions: newTransactions
                };
            });
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
                    <div style={{ flex: 1 }}>
                        <p className="today-greeting">{getGreeting()}</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <h1>Today</h1>
                            <PrivacyToggle style={{ marginTop: '4px' }} />
                        </div>
                        <p className="today-date">{formatDate(new Date())}</p>
                    </div>
                </div>
            </header>

            <SummaryCard
                expense={data.totals.expense}
                income={data.totals.income}
                net={data.totals.net}
            />

            {/* FilterChips removed */}

            <div className="transaction-list">
                {loading ? (
                    <div className="loader">
                        <div className="loader-spinner"></div>
                    </div>
                ) : data.transactions.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">✨</div>
                        <div className="empty-state-title">
                            No transactions yet
                        </div>
                        <div className="empty-state-text">
                            Tap the + button to log your first expense
                        </div>
                    </div>
                ) : (
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={data.transactions.map(t => t.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            {data.transactions.map((tx, index) => (
                                <SortableTransaction
                                    key={tx.id}
                                    transaction={tx}
                                    onEdit={() => setEditingTx(tx)}
                                    onDelete={() => handleDelete(tx.id)}
                                    onClick={(tx) => setViewingTx(tx)}
                                />
                            ))}
                        </SortableContext>
                    </DndContext>
                )}
            </div>

            {/* FAB Button */}
            <button className="fab" onClick={() => setShowQuickAdd(true)}>
                <Plus size={28} />
            </button>

            {/* Quick Add Form */}
            {showQuickAdd && (
                <QuickAddForm
                    options={options}
                    onSave={handleQuickAddSave}
                    onClose={() => setShowQuickAdd(false)}
                    onOptionsChange={loadOptions}
                />
            )}

            {/* Full Edit Form */}
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
