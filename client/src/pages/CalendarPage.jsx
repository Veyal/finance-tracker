import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { transactions } from '../api/api';
import { usePrivacy } from '../context/PrivacyContext';
import TransactionCard from '../components/TransactionCard';
import './CalendarPage.css';

export default function CalendarPage() {
    const { isPrivacyMode } = usePrivacy();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(null);
    const [summary, setSummary] = useState([]);
    const [dayTransactions, setDayTransactions] = useState([]);
    const [loading, setLoading] = useState(true);

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    useEffect(() => {
        loadSummary();
    }, [year, month]);

    useEffect(() => {
        if (selectedDate) {
            loadDayTransactions();
        }
    }, [selectedDate]);

    async function loadSummary() {
        try {
            setLoading(true);
            const firstDay = new Date(year, month, 1).toISOString().split('T')[0];
            const lastDay = new Date(year, month + 1, 0).toISOString().split('T')[0];
            const data = await transactions.summary({ from: firstDay, to: lastDay });
            setSummary(data);
        } catch (error) {
            console.error('Failed to load summary:', error);
        } finally {
            setLoading(false);
        }
    }

    async function loadDayTransactions() {
        try {
            const data = await transactions.list({ from: selectedDate, to: selectedDate });
            setDayTransactions(data.transactions);
        } catch (error) {
            console.error('Failed to load day transactions:', error);
        }
    }

    function getDaysInMonth() {
        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const days = [];

        // Add empty cells for days before the first day of the month
        for (let i = 0; i < firstDayOfMonth; i++) {
            days.push(null);
        }

        // Add the days of the month
        for (let i = 1; i <= daysInMonth; i++) {
            days.push(i);
        }

        return days;
    }

    function getDaySummary(day) {
        if (!day) return null;
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return summary.find(s => s.day === dateStr);
    }

    function formatAmount(amount) {
        if (!amount) return '';
        if (amount >= 1000000) {
            return `${(amount / 1000000).toFixed(1)}M`;
        }
        if (amount >= 1000) {
            return `${(amount / 1000).toFixed(0)}K`;
        }
        return amount.toString();
    }

    function handlePrevMonth() {
        setCurrentDate(new Date(year, month - 1, 1));
        setSelectedDate(null);
    }

    function handleNextMonth() {
        setCurrentDate(new Date(year, month + 1, 1));
        setSelectedDate(null);
    }

    function handleDayClick(day) {
        if (!day) return;
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        setSelectedDate(dateStr);
    }

    const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
    const days = getDaysInMonth();
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    return (
        <div className="page calendar-page">
            <header className="calendar-header">
                <button className="btn btn-icon btn-ghost" onClick={handlePrevMonth}>
                    <ChevronLeft size={24} />
                </button>
                <h1>{monthName}</h1>
                <button className="btn btn-icon btn-ghost" onClick={handleNextMonth}>
                    <ChevronRight size={24} />
                </button>
            </header>

            <div className="calendar-container">
                <div className="calendar-grid">
                    <div className="weekday-header">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                            <div key={day} className="weekday">{day}</div>
                        ))}
                    </div>

                    <div className="days-grid">
                        {days.map((day, index) => {
                            const dateStr = day ? `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` : '';
                            const daySummary = getDaySummary(day);
                            const isToday = dateStr === todayStr;
                            const isSelected = dateStr === selectedDate;

                            return (
                                <div
                                    key={index}
                                    className={`day-cell ${!day ? 'empty' : ''} ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}`}
                                    onClick={() => handleDayClick(day)}
                                >
                                    {day && (
                                        <>
                                            <span className="day-number">{day}</span>
                                            {daySummary?.expense > 0 && (
                                                <span className="day-expense">
                                                    {isPrivacyMode ? '***' : `-${formatAmount(daySummary.expense)}`}
                                                </span>
                                            )}
                                        </>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {selectedDate && (
                    <div className="day-transactions animate-slide-up">
                        <h3>{new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</h3>
                        {dayTransactions.length === 0 ? (
                            <div className="empty-state">
                                <div className="empty-state-icon">🌟</div>
                                <div className="empty-state-text">No transactions on this day</div>
                            </div>
                        ) : (
                            <div className="transaction-list">
                                {dayTransactions.map(tx => (
                                    <TransactionCard key={tx.id} transaction={tx} onEdit={() => { }} onDelete={() => { }} />
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
