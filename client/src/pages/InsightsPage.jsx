import { useState, useEffect } from 'react';
import { TrendingDown, TrendingUp, ArrowUpDown, Calendar, Target, Zap, Activity, TrendingUp as TrendUp } from 'lucide-react';
import { transactions } from '../api/api';
import SpendingLineChart from '../components/SpendingLineChart';
import { usePrivacy } from '../context/PrivacyContext';
import './InsightsPage.css';

export default function InsightsPage() {
    const { isPrivacyMode } = usePrivacy();
    const [range, setRange] = useState('month');
    const [viewType, setViewType] = useState('expense');
    const [data, setData] = useState(null);
    const [dailyData, setDailyData] = useState([]);
    const [prevPeriodTotal, setPrevPeriodTotal] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadInsights();
    }, [range, viewType]);

    async function loadInsights() {
        try {
            setLoading(true);
            const today = new Date();
            let from, to, prevFrom, prevTo;

            if (range === 'week') {
                const weekAgo = new Date(today);
                weekAgo.setDate(today.getDate() - 7);
                from = weekAgo.toISOString().split('T')[0];
                to = today.toISOString().split('T')[0];

                // Previous week
                const twoWeeksAgo = new Date(weekAgo);
                twoWeeksAgo.setDate(weekAgo.getDate() - 7);
                prevFrom = twoWeeksAgo.toISOString().split('T')[0];
                prevTo = weekAgo.toISOString().split('T')[0];
            } else if (range === 'month') {
                from = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
                to = today.toISOString().split('T')[0];

                // Previous month
                const prevMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
                const prevMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                prevFrom = prevMonthStart.toISOString().split('T')[0];
                prevTo = prevMonthEnd.toISOString().split('T')[0];
            } else {
                from = new Date(today.getFullYear(), 0, 1).toISOString().split('T')[0];
                to = today.toISOString().split('T')[0];

                // Previous year
                prevFrom = new Date(today.getFullYear() - 1, 0, 1).toISOString().split('T')[0];
                prevTo = new Date(today.getFullYear() - 1, 11, 31).toISOString().split('T')[0];
            }

            const [insightsResult, summaryResult, prevInsights] = await Promise.all([
                transactions.insights({ from, to, type: viewType }),
                transactions.summary({ from, to }),
                transactions.insights({ from: prevFrom, to: prevTo, type: viewType })
            ]);

            setData(insightsResult);
            setDailyData(summaryResult || []);
            setPrevPeriodTotal(viewType === 'expense'
                ? prevInsights?.totals?.expense || 0
                : prevInsights?.totals?.income || 0
            );
        } catch (error) {
            console.error('Failed to load insights:', error);
        } finally {
            setLoading(false);
        }
    }

    function formatAmount(amount) {
        if (isPrivacyMode) return '****';
        if (amount >= 1000000) {
            return (amount / 1000000).toFixed(1) + 'M';
        } else if (amount >= 1000) {
            return (amount / 1000).toFixed(0) + 'K';
        }
        return new Intl.NumberFormat('id-ID').format(amount || 0);
    }

    function formatFullAmount(amount) {
        if (isPrivacyMode) return '****';
        return new Intl.NumberFormat('id-ID').format(amount || 0);
    }

    function getMaxAmount(items) {
        if (!items?.length) return 1;
        return Math.max(...items.map(i => i.total || 0));
    }

    // Calculate daily average
    const currentTotal = viewType === 'expense'
        ? (data?.totals?.expense || 0)
        : (data?.totals?.income || 0);

    const avgDaily = dailyData.length > 0
        ? (viewType === 'expense'
            ? dailyData.reduce((sum, d) => sum + (d.expense || 0), 0) / dailyData.length
            : dailyData.reduce((sum, d) => sum + (d.income || 0), 0) / dailyData.length)
        : 0;

    // Get max daily for chart scaling
    const maxDaily = dailyData.length > 0
        ? Math.max(...dailyData.map(d => viewType === 'expense' ? (d.expense || 0) : (d.income || 0)))
        : 1;

    // Calculate top spending category
    const topCategory = data?.byCategory?.[0];

    // Calculate period comparison
    const periodChange = prevPeriodTotal > 0
        ? ((currentTotal - prevPeriodTotal) / prevPeriodTotal * 100).toFixed(0)
        : 0;
    const isUp = periodChange > 0;

    // Find highest spending day
    const highestDay = dailyData.length > 0
        ? dailyData.reduce((max, d) => {
            const val = viewType === 'expense' ? d.expense : d.income;
            return val > (viewType === 'expense' ? max.expense : max.income) ? d : max;
        }, dailyData[0])
        : null;

    return (
        <div className="page insights-page">
            <header className="insights-header">
                <h1>Insights</h1>
            </header>

            {/* Range Selector */}
            <div className="range-selector">
                {['week', 'month', 'year'].map(r => (
                    <button
                        key={r}
                        type="button"
                        className={`chip ${range === r ? 'active' : ''}`}
                        onClick={() => setRange(r)}
                    >
                        This {r}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="loader">
                    <div className="loader-spinner"></div>
                </div>
            ) : (
                <>
                    {/* Summary Cards */}
                    <div className="insights-summary">
                        <div className="insights-card expense">
                            <div className="insights-card-icon">
                                <TrendingDown size={24} />
                            </div>
                            <div className="insights-card-content">
                                <span className="insights-card-label">Total Expense</span>
                                <span className="insights-card-amount amount-expense">
                                    Rp {formatFullAmount(data?.totals?.expense)}
                                </span>
                            </div>
                        </div>

                        <div className="insights-card income">
                            <div className="insights-card-icon">
                                <TrendingUp size={24} />
                            </div>
                            <div className="insights-card-content">
                                <span className="insights-card-label">Total Income</span>
                                <span className="insights-card-amount amount-income">
                                    Rp {formatFullAmount(data?.totals?.income)}
                                </span>
                            </div>
                        </div>

                        <div className="insights-card net">
                            <div className="insights-card-icon">
                                <ArrowUpDown size={24} />
                            </div>
                            <div className="insights-card-content">
                                <span className="insights-card-label">Net</span>
                                <span className={`insights-card-amount ${(data?.totals?.net || 0) >= 0 ? 'amount-income' : 'amount-expense'}`}>
                                    Rp {formatFullAmount(data?.totals?.net)}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="quick-stats">
                        <div className="stat-card">
                            <Calendar size={18} />
                            <div className="stat-content">
                                <span className="stat-value">Rp {formatAmount(avgDaily)}</span>
                                <span className="stat-label">Daily Avg</span>
                            </div>
                        </div>
                        {topCategory && (
                            <div className="stat-card">
                                <Target size={18} />
                                <div className="stat-content">
                                    <span className="stat-value">{topCategory.name || 'Other'}</span>
                                    <span className="stat-label">Top Category</span>
                                </div>
                            </div>
                        )}
                        <div className="stat-card">
                            <Zap size={18} />
                            <div className="stat-content">
                                <span className="stat-value">{dailyData.length}</span>
                                <span className="stat-label">Active Days</span>
                            </div>
                        </div>
                    </div>

                    {/* Period Comparison Card */}
                    {prevPeriodTotal > 0 && (
                        <div className={`comparison-card ${isUp ? 'up' : 'down'}`}>
                            <div className="comparison-icon">
                                {isUp ? <TrendUp size={20} /> : <TrendingDown size={20} />}
                            </div>
                            <div className="comparison-content">
                                <span className="comparison-change">
                                    {isUp ? '+' : ''}{periodChange}%
                                </span>
                                <span className="comparison-text">
                                    vs last {range}
                                </span>
                            </div>
                            <div className="comparison-prev">
                                <span className="comparison-prev-label">Last {range}</span>
                                <span className="comparison-prev-amount">
                                    Rp {formatAmount(prevPeriodTotal)}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Type Toggle */}
                    <div className="type-toggle-inline">
                        <button
                            type="button"
                            className={`chip ${viewType === 'expense' ? 'chip-expense active' : ''}`}
                            onClick={() => setViewType('expense')}
                        >
                            Expense
                        </button>
                        <button
                            type="button"
                            className={`chip ${viewType === 'income' ? 'chip-income active' : ''}`}
                            onClick={() => setViewType('income')}
                        >
                            Income
                        </button>
                    </div>

                    {/* Line Chart - NEW! */}
                    {dailyData.length > 1 && (
                        <section className="chart-section line-chart-section">
                            <div className="section-header">
                                <h3>
                                    <Activity size={18} />
                                    <span>Daily Trend</span>
                                </h3>
                            </div>
                            <SpendingLineChart
                                data={dailyData}
                                type={viewType}
                                height={200}
                                showAverage={true}
                                showTooltip={true}
                            />
                        </section>
                    )}

                    {/* Daily Spending/Income Tracker */}
                    {dailyData.length > 0 && (
                        <section className="chart-section daily-tracker">
                            <div className="daily-tracker-header">
                                <h3>Daily {viewType === 'expense' ? 'Spending' : 'Income'}</h3>
                                <span className="daily-avg">
                                    Avg: Rp {formatAmount(avgDaily)}/day
                                </span>
                            </div>
                            <div className="daily-list">
                                {dailyData.slice().reverse().map((day, index) => {
                                    const value = viewType === 'expense' ? (day.expense || 0) : (day.income || 0);
                                    const percentage = maxDaily > 0 ? (value / maxDaily) * 100 : 0;
                                    const dateObj = new Date(day.day + 'T00:00:00');
                                    const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
                                    const dayNum = dateObj.getDate();
                                    const monthName = dateObj.toLocaleDateString('en-US', { month: 'short' });
                                    const isHighest = highestDay && day.day === highestDay.day;

                                    return (
                                        <div key={index} className={`daily-item stagger-item ${isHighest ? 'highest' : ''}`}>
                                            <div className="daily-date">
                                                <span className="daily-day">{dayName}</span>
                                                <span className="daily-num">{dayNum} {monthName}</span>
                                            </div>
                                            <div className="daily-bar-wrapper">
                                                <div
                                                    className={`daily-bar ${viewType}`}
                                                    style={{ width: `${Math.max(percentage, 2)}%` }}
                                                />
                                            </div>
                                            <span className={`daily-amount amount-${viewType}`}>
                                                Rp {formatFullAmount(value)}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    )}

                    {/* Donut Chart for Categories */}
                    {data?.byCategory?.length > 0 && (
                        <section className="chart-section">
                            <h3>Category Breakdown</h3>
                            <div className="donut-container">
                                <DonutChart data={data.byCategory} type={viewType} />
                                <div className="donut-legend">
                                    {data.byCategory.slice(0, 5).map((item, i) => (
                                        <div key={item.id || i} className="legend-item">
                                            <span
                                                className="legend-dot"
                                                style={{ background: getColor(i, viewType) }}
                                            />
                                            <span className="legend-name">{item.name || 'Other'}</span>
                                            <span className="legend-value">Rp {formatAmount(item.total)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </section>
                    )}

                    {/* By Category */}
                    <section className="insights-section">
                        <h3>By Category</h3>
                        {data?.byCategory?.length ? (
                            <div className="breakdown-list">
                                {data.byCategory.map(item => (
                                    <BreakdownItem
                                        key={item.id || 'uncategorized'}
                                        item={item}
                                        max={getMaxAmount(data.byCategory)}
                                        type={viewType}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="empty-state">
                                <div className="empty-state-text">No data for this period</div>
                            </div>
                        )}
                    </section>

                    {/* By Group */}
                    <section className="insights-section">
                        <h3>By Group</h3>
                        {data?.byGroup?.length ? (
                            <div className="breakdown-list">
                                {data.byGroup.map(item => (
                                    <BreakdownItem
                                        key={item.id || 'ungrouped'}
                                        item={item}
                                        max={getMaxAmount(data.byGroup)}
                                        type={viewType}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="empty-state">
                                <div className="empty-state-text">No data for this period</div>
                            </div>
                        )}
                    </section>

                    {/* By Payment Method */}
                    <section className="insights-section">
                        <h3>By Payment Method</h3>
                        {data?.byPaymentMethod?.length ? (
                            <div className="breakdown-list">
                                {data.byPaymentMethod.map(item => (
                                    <BreakdownItem
                                        key={item.id || 'unspecified'}
                                        item={item}
                                        max={getMaxAmount(data.byPaymentMethod)}
                                        type={viewType}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="empty-state">
                                <div className="empty-state-text">No data for this period</div>
                            </div>
                        )}
                    </section>
                </>
            )}
        </div>
    );
}

// Color palette for charts
function getColor(index, type) {
    const expenseColors = [
        '#ff6b6b', '#ff8787', '#ffa8a8', '#ffc9c9', '#ffe3e3'
    ];
    const incomeColors = [
        '#51cf66', '#69db7c', '#8ce99a', '#b2f2bb', '#d3f9d8'
    ];
    return type === 'expense' ? expenseColors[index % 5] : incomeColors[index % 5];
}

// Donut Chart Component
function DonutChart({ data, type }) {
    const total = data.reduce((sum, item) => sum + (item.total || 0), 0);
    let currentAngle = 0;

    const slices = data.slice(0, 5).map((item, index) => {
        const percentage = total > 0 ? (item.total / total) : 0;
        const angle = percentage * 360;
        const startAngle = currentAngle;
        currentAngle += angle;

        return {
            ...item,
            percentage,
            startAngle,
            angle,
            color: getColor(index, type)
        };
    });

    // Create SVG arc path
    function describeArc(startAngle, endAngle, radius, innerRadius) {
        const start = polarToCartesian(50, 50, radius, endAngle);
        const end = polarToCartesian(50, 50, radius, startAngle);
        const innerStart = polarToCartesian(50, 50, innerRadius, endAngle);
        const innerEnd = polarToCartesian(50, 50, innerRadius, startAngle);
        const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;

        return [
            'M', start.x, start.y,
            'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y,
            'L', innerEnd.x, innerEnd.y,
            'A', innerRadius, innerRadius, 0, largeArcFlag, 1, innerStart.x, innerStart.y,
            'Z'
        ].join(' ');
    }

    function polarToCartesian(cx, cy, radius, angle) {
        const rad = (angle - 90) * Math.PI / 180;
        return {
            x: cx + radius * Math.cos(rad),
            y: cy + radius * Math.sin(rad)
        };
    }

    return (
        <svg viewBox="0 0 100 100" className="donut-chart">
            {slices.map((slice, index) => (
                <path
                    key={index}
                    d={describeArc(slice.startAngle, slice.startAngle + slice.angle - 0.5, 45, 28)}
                    fill={slice.color}
                    className="donut-slice"
                />
            ))}
            <text x="50" y="47" textAnchor="middle" className="donut-total-label">Total</text>
            <text x="50" y="58" textAnchor="middle" className="donut-total-value">
                {usePrivacy().isPrivacyMode ? '****' : new Intl.NumberFormat('id-ID', { notation: 'compact' }).format(total)}
            </text>
        </svg>
    );
}

function BreakdownItem({ item, max, type }) {
    const { isPrivacyMode } = usePrivacy();
    const percentage = max > 0 ? (item.total / max) * 100 : 0;

    function formatAmount(amount) {
        if (isPrivacyMode) return '****';
        return new Intl.NumberFormat('id-ID').format(amount || 0);
    }

    return (
        <div className="breakdown-item">
            <div className="breakdown-header">
                <span className="breakdown-name">{item.name || 'Uncategorized'}</span>
                <span className={`breakdown-amount amount-${type}`}>
                    Rp {formatAmount(item.total)}
                </span>
            </div>
            <div className="progress-bar">
                <div
                    className="progress-bar-fill"
                    style={{
                        width: `${percentage}%`,
                        background: type === 'expense' ? 'var(--expense-red)' : 'var(--income-green)'
                    }}
                />
            </div>
            <span className="breakdown-count">{item.count} transactions</span>
        </div>
    );
}
