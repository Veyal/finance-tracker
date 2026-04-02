import { useState, useEffect } from 'react';
import { TrendingDown, TrendingUp, Zap, Activity, Filter, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { transactions } from '../api/api';
import { SpendingTrendChart, CategoryBreakdown, DrillDownModal } from '../components/Insights';
import { usePrivacy } from '../context/PrivacyContext';
import { formatCurrency } from '../utils/format';
import './InsightsPage.css';

export default function InsightsPage() {
    const { isPrivacyMode } = usePrivacy();
    const [range, setRange] = useState('month');
    const [viewType, setViewType] = useState('expense');
    const [data, setData] = useState(null);
    const [dailyData, setDailyData] = useState([]);
    const [prevPeriodTotal, setPrevPeriodTotal] = useState(0);
    const [loading, setLoading] = useState(true);

    // Drill down state
    const [showDrillDown, setShowDrillDown] = useState(false);
    const [drillDownTitle, setDrillDownTitle] = useState('');
    const [drillDownFilters, setDrillDownFilters] = useState({});

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
        if (isPrivacyMode) return '••••';
        return formatCurrency(amount, { compact: true });
    }

    function formatFullAmount(amount) {
        if (isPrivacyMode) return '••••';
        return formatCurrency(amount);
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

    // Calculate period comparison
    const hasBaseline = prevPeriodTotal > 0;
    const periodChange = hasBaseline
        ? ((currentTotal - prevPeriodTotal) / prevPeriodTotal * 100).toFixed(0)
        : null;
    const isIncrease = periodChange !== null && Number(periodChange) > 0;
    const absChange = periodChange !== null ? Math.abs(Number(periodChange)) : null;

    // Callbacks for components
    const handlePointClick = (point) => {
        setDrillDownTitle(`Transactions on ${new Date(point.day).toLocaleDateString()}`);
        setDrillDownFilters({
            date: point.day,
            type: viewType
        });
        setShowDrillDown(true);
    };

    const handleCategoryClick = (item, type) => {
        setDrillDownTitle(`${item.name} Transactions`);
        const filters = { type: viewType };
        if (type === 'category') filters.categoryId = item.id;
        if (type === 'group') filters.groupId = item.id;
        if (type === 'paymentMethod') filters.paymentMethodId = item.id;
        
        setDrillDownFilters(filters);
        setShowDrillDown(true);
    };

    return (
        <div className="page insights-page">
            <header className="insights-header">
                <div className="header-title-row">
                    <h1>Insights</h1>
                    <div className="view-type-toggle">
                        <button 
                            className={`toggle-btn ${viewType === 'expense' ? 'active expense' : ''}`}
                            onClick={() => setViewType('expense')}
                        >
                            Expense
                        </button>
                        <button 
                            className={`toggle-btn ${viewType === 'income' ? 'active income' : ''}`}
                            onClick={() => setViewType('income')}
                        >
                            Income
                        </button>
                    </div>
                </div>
                
                <div className="range-selector-row">
                    <div className="range-chips">
                        {['week', 'month', 'year'].map(r => (
                            <button
                                key={r}
                                type="button"
                                className={`range-chip ${range === r ? 'active' : ''}`}
                                onClick={() => setRange(r)}
                            >
                                This {r}
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            {loading ? (
                <div className="loader">
                    <div className="loader-spinner"></div>
                </div>
            ) : (
                <div className="insights-content-grid">
                    {/* Top Stats Cards */}
                    <section className="stats-summary-grid">
                        <div className="stat-summary-card card-glass animate-slide-up" style={{ animationDelay: '0.1s' }}>
                            <div className={`stat-card-icon ${viewType}`}>
                                {viewType === 'expense' ? <TrendingDown size={20} /> : <TrendingUp size={20} />}
                            </div>
                            <div className="stat-card-info">
                                <span className="stat-card-label">Total {viewType === 'expense' ? 'Spending' : 'Income'}</span>
                                <div className="stat-card-value-row">
                                    <span className={`stat-card-value amount-${viewType}`}>
                                        {formatAmount(currentTotal)}
                                    </span>
                                    {(prevPeriodTotal > 0 || currentTotal > 0) && (
                                        <div className={`change-badge ${
                                            absChange === null
                                                ? 'new'
                                                : viewType === 'expense'
                                                    ? (isIncrease ? 'negative' : 'positive')
                                                    : (isIncrease ? 'positive' : 'negative')
                                        }`}>
                                            {absChange !== null && (isIncrease ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />)}
                                            <span>{absChange !== null ? `${absChange}%` : 'New'}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="stat-summary-card card-glass animate-slide-up" style={{ animationDelay: '0.2s' }}>
                            <div className="stat-card-icon daily">
                                <Activity size={20} />
                            </div>
                            <div className="stat-card-info">
                                <span className="stat-card-label">Daily Average</span>
                                <span className="stat-card-value">
                                    {formatAmount(avgDaily)}
                                </span>
                            </div>
                        </div>

                        <div className="stat-summary-card card-glass animate-slide-up" style={{ animationDelay: '0.3s' }}>
                            <div className="stat-card-icon active">
                                <Zap size={20} />
                            </div>
                            <div className="stat-card-info">
                                <span className="stat-card-label">Active Days</span>
                                <span className="stat-card-value">
                                    {dailyData.filter(d => (viewType === 'expense' ? d.expense : d.income) > 0).length}
                                </span>
                            </div>
                        </div>
                    </section>

                    {/* Trends Section */}
                    <section className="insights-section trends-section animate-slide-up" style={{ animationDelay: '0.4s' }}>
                        <div className="section-header">
                            <h3><Activity size={18} /> Daily Trends</h3>
                        </div>
                        <div className="chart-container card-glass">
                            <SpendingTrendChart 
                                data={dailyData} 
                                type={viewType} 
                                onPointClick={handlePointClick}
                            />
                        </div>
                    </section>

                    {/* Breakdown Section */}
                    <section className="insights-section breakdown-section animate-slide-up" style={{ animationDelay: '0.5s' }}>
                        <div className="section-header">
                            <h3><Filter size={18} /> Detailed Breakdown</h3>
                        </div>
                        <div className="breakdowns-grid">
                            <div className="breakdown-card card-glass">
                                <h4 className="breakdown-title">By Category</h4>
                                <CategoryBreakdown 
                                    data={data?.byCategory || []}
                                    type={viewType}
                                    onCategoryClick={(item) => handleCategoryClick(item, 'category')}
                                />
                            </div>
                            <div className="breakdown-card card-glass">
                                <h4 className="breakdown-title">By Group</h4>
                                <CategoryBreakdown 
                                    data={data?.byGroup || []}
                                    type={viewType}
                                    onCategoryClick={(item) => handleCategoryClick(item, 'group')}
                                />
                            </div>
                            <div className="breakdown-card card-glass">
                                <h4 className="breakdown-title">By Payment Method</h4>
                                <CategoryBreakdown 
                                    data={data?.byPaymentMethod || []}
                                    type={viewType}
                                    onCategoryClick={(item) => handleCategoryClick(item, 'paymentMethod')}
                                />
                            </div>
                        </div>
                    </section>
                </div>
            )}

            {/* Drill Down Modal */}
            <DrillDownModal 
                isOpen={showDrillDown}
                onClose={() => setShowDrillDown(false)}
                title={drillDownTitle}
                filters={drillDownFilters}
            />
        </div>
    );
}
