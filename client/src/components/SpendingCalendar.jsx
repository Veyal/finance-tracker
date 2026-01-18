import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar, X } from 'lucide-react';
import { transactions } from '../api/api';
import { usePrivacy } from '../context/PrivacyContext';
import TransactionCard from './TransactionCard';
import './SpendingCalendar.css';

export default function SpendingCalendar({ type = 'expense' }) {
    const { isPrivacyMode } = usePrivacy();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [summary, setSummary] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(null);
    const [dayTransactions, setDayTransactions] = useState([]);
    const [loadingTransactions, setLoadingTransactions] = useState(false);

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    useEffect(() => {
        loadSummary();
    }, [year, month]);

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

    async function handleDayClick(day) {
        if (!day) return;
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        setSelectedDate(dateStr);
        setLoadingTransactions(true);
        try {
            const response = await transactions.list({ from: dateStr, to: dateStr });
            // API returns { transactions, totals, next_cursor } - extract the transactions array
            setDayTransactions(response.transactions || []);
        } catch (error) {
            console.error('Failed to load transactions:', error);
            setDayTransactions([]);
        } finally {
            setLoadingTransactions(false);
        }
    }

    function closePopup() {
        setSelectedDate(null);
        setDayTransactions([]);
    }

    function getDaysInMonth() {
        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const days = [];

        for (let i = 0; i < firstDayOfMonth; i++) {
            days.push(null);
        }

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

    function formatAmount(amount, short = true) {
        if (isPrivacyMode) return '***';
        if (!amount) return short ? '' : 'Rp 0';
        if (short) {
            if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M`;
            if (amount >= 1000) return `${(amount / 1000).toFixed(0)}K`;
            return amount.toString();
        }
        return `Rp ${new Intl.NumberFormat('id-ID').format(amount)}`;
    }

    function formatDateDisplay(dateStr) {
        const date = new Date(dateStr + 'T00:00:00');
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    }

    function getIntensity(amount) {
        if (!amount) return 0;
        const maxSpend = Math.max(...summary.map(s => type === 'expense' ? (s.expense || 0) : (s.income || 0)));
        if (maxSpend === 0) return 0;
        const ratio = amount / maxSpend;
        if (ratio > 0.8) return 5;
        if (ratio > 0.6) return 4;
        if (ratio > 0.4) return 3;
        if (ratio > 0.2) return 2;
        return 1;
    }

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const monthName = currentDate.toLocaleString('default', { month: 'short', year: 'numeric' });
    const days = getDaysInMonth();
    const weekdays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

    return (
        <section className="chart-section spending-calendar">
            <div className="spending-calendar-header">
                <h3>
                    <Calendar size={18} />
                    <span>Spending Calendar</span>
                </h3>
                <div className="calendar-nav">
                    <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))}>
                        <ChevronLeft size={16} />
                    </button>
                    <span className="calendar-month-label">{monthName}</span>
                    <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))}>
                        <ChevronRight size={16} />
                    </button>
                </div>
            </div>

            <div className="spending-calendar-grid">
                <div className="calendar-weekdays">
                    {weekdays.map((day, i) => (
                        <div key={i} className="calendar-weekday">{day}</div>
                    ))}
                </div>

                <div className="calendar-days">
                    {days.map((day, index) => {
                        if (!day) {
                            return <div key={index} className="calendar-day empty" />;
                        }

                        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                        const daySummary = getDaySummary(day);
                        const amount = type === 'expense' ? (daySummary?.expense || 0) : (daySummary?.income || 0);
                        const intensity = getIntensity(amount);
                        const isToday = dateStr === todayStr;

                        return (
                            <div
                                key={index}
                                className={`calendar-day ${isToday ? 'today' : ''} ${intensity > 0 ? `intensity-${intensity}` : ''} ${type === 'income' ? 'income-mode' : ''}`}
                                onClick={() => handleDayClick(day)}
                            >
                                <span className="calendar-day-num">{day}</span>
                                {amount > 0 && (
                                    <span className="calendar-day-amount">
                                        {formatAmount(amount)}
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>

                <div className="calendar-legend">
                    <span className="legend-label">Less</span>
                    <div className="legend-scale">
                        {[1, 2, 3, 4, 5].map(level => (
                            <div
                                key={level}
                                className="legend-box"
                                style={{
                                    background: type === 'expense'
                                        ? `rgba(255, 107, 138, ${level * 0.15})`
                                        : `rgba(107, 255, 184, ${level * 0.15})`
                                }}
                            />
                        ))}
                    </div>
                    <span className="legend-label">More</span>
                </div>
            </div>

            {/* Day Transactions Popup */}
            {selectedDate && (
                <div className="calendar-popup-overlay" onClick={closePopup}>
                    <div className="calendar-popup" onClick={e => e.stopPropagation()}>
                        <div className="calendar-popup-header">
                            <h4>{formatDateDisplay(selectedDate)}</h4>
                            <button className="popup-close-btn" onClick={closePopup}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="calendar-popup-content">
                            {loadingTransactions ? (
                                <div className="popup-loading">Loading...</div>
                            ) : dayTransactions.length === 0 ? (
                                <div className="popup-empty">No transactions on this day</div>
                            ) : (
                                <div className="popup-transactions">
                                    {dayTransactions.map(tx => (
                                        <TransactionCard
                                            key={tx.id}
                                            transaction={tx}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}
