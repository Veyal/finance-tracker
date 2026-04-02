import { useState, useEffect, useCallback, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Loader2, AlertCircle, CalendarDays } from 'lucide-react';
import { transactions } from '../../api/api';
import { usePrivacy } from '../../context/PrivacyContext';
import { formatCurrency } from '../../utils/format';
import './InsightsCalendar.css';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function InsightsCalendar({ onDayClick }) {
    const { isPrivacyMode } = usePrivacy();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [dailyData, setDailyData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const pad = (n) => String(n).padStart(2, '0');
            const firstDay = `${year}-${pad(month + 1)}-01`;
            const lastDay = `${year}-${pad(month + 1)}-${pad(new Date(year, month + 1, 0).getDate())}`;
            const data = await transactions.summary({ from: firstDay, to: lastDay });
            setDailyData(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Failed to load calendar data:', err);
            setError('Failed to load data');
        } finally {
            setLoading(false);
        }
    }, [year, month]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const dataMap = useMemo(() => {
        const map = {};
        dailyData.forEach(d => { map[d.day] = d; });
        return map;
    }, [dailyData]);;

    const cells = useMemo(() => {
        const firstWeekday = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const result = [];
        for (let i = 0; i < firstWeekday; i++) result.push(null);
        for (let d = 1; d <= daysInMonth; d++) result.push(d);
        return result;
    }, [year, month]);

    function dateStr(day) {
        return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }

    const todayStr = useMemo(() => {
        const today = new Date();
        return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    }, []);

    const monthLabel = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

    return (
        <div className="insights-calendar card-glass">
            {/* Header */}
            <div className="ic-header">
                <div className="ic-title">
                    <CalendarDays size={18} />
                    <span>Monthly Calendar</span>
                </div>
                <div className="ic-nav">
                    <button
                        className="ic-nav-btn"
                        onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
                        aria-label="Previous month"
                    >
                        <ChevronLeft size={18} />
                    </button>
                    <span className="ic-month-label">{monthLabel}</span>
                    <button
                        className="ic-nav-btn"
                        onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
                        aria-label="Next month"
                    >
                        <ChevronRight size={18} />
                    </button>
                </div>
            </div>

            {/* Weekday header row */}
            <div className="ic-weekdays">
                {WEEKDAYS.map(d => (
                    <div key={d} className="ic-weekday">{d}</div>
                ))}
            </div>

            {/* Body */}
            {loading ? (
                <div className="ic-loading">
                    <Loader2 className="ic-spinner" size={28} />
                </div>
            ) : error ? (
                <div className="ic-error">
                    <AlertCircle size={28} />
                    <span>{error}</span>
                    <button className="ic-retry-btn" onClick={loadData}>Retry</button>
                </div>
            ) : (
                <div className="ic-days-grid">
                    {cells.map((day, i) => {
                        if (!day) return <div key={`empty-${i}`} className="ic-cell ic-cell-empty" />;

                        const ds = dateStr(day);
                        const entry = dataMap[ds];
                        const net = entry ? (entry.income || 0) - (entry.expense || 0) : null;
                        const isToday = ds === todayStr;
                        const hasData = net !== null;

                        let colorClass = '';
                        if (hasData && net > 0) colorClass = 'ic-cell-positive';
                        else if (hasData && net < 0) colorClass = 'ic-cell-negative';
                        else if (hasData) colorClass = 'ic-cell-neutral';

                        return (
                            <div
                                key={ds}
                                className={`ic-cell ${colorClass} ${isToday ? 'ic-cell-today' : ''} ${hasData ? 'ic-cell-clickable' : ''}`}
                                onClick={() => hasData && onDayClick?.(ds)}
                            >
                                <span className="ic-day-number">{day}</span>
                                {hasData && (
                                    <span className="ic-day-amount">
                                        {isPrivacyMode ? '••••' : formatCurrency(Math.abs(net), { compact: true })}
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
