import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { usePrivacy } from '../../context/PrivacyContext';
import { formatCurrency } from '../../utils/format';
import './SpendingTrendChart.css';

const CustomTooltip = ({ active, payload, label, type, isPrivacyMode }) => {
  if (active && payload && payload.length) {
    const value = payload[0].value;
    const dateStr = payload[0].payload.day;
    const date = new Date(dateStr + 'T00:00:00');
    const formattedDate = date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });

    return (
      <div className={`spending-trend-tooltip ${type}`}>
        <div className="tooltip-date">{formattedDate}</div>
        <div className="tooltip-amount">
          {isPrivacyMode ? '••••' : formatCurrency(value)}
        </div>
      </div>
    );
  }
  return null;
};

const SpendingTrendChart = ({ data, type = 'expense', onPointClick }) => {
  const { isPrivacyMode } = usePrivacy();

  const color = type === 'expense' ? 'var(--expense-red)' : 'var(--income-green)';
  const gradientId = `colorTrend${type.charAt(0).toUpperCase() + type.slice(1)}`;

  // Calculate average for reference line
  const values = data.map(d => type === 'expense' ? (d.expense || 0) : (d.income || 0));
  const avgValue = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;

  const handleClick = (state) => {
    if (state && state.activePayload && onPointClick) {
      onPointClick(state.activePayload[0].payload);
    }
  };

  return (
    <div className="spending-trend-container">
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart
          data={data}
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          onClick={handleClick}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="100%">
              <stop offset="5%" stopColor={color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="var(--border-subtle)"
            opacity={0.4}
          />
          <XAxis
            dataKey="day"
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'var(--text-muted)', fontSize: 10, fontWeight: 500 }}
            tickFormatter={(str) => {
                if (!str) return '';
                const date = new Date(str + 'T00:00:00');
                return date.getDate();
            }}
            minTickGap={20}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'var(--text-muted)', fontSize: 10, fontWeight: 500 }}
            tickFormatter={(val) => formatCurrency(val, { compact: true })}
            hide={isPrivacyMode}
          />
          <Tooltip
            content={<CustomTooltip type={type} isPrivacyMode={isPrivacyMode} />}
            cursor={{ stroke: 'var(--border-subtle)', strokeWidth: 1 }}
          />
          {avgValue > 0 && (
            <ReferenceLine
              y={avgValue}
              stroke="var(--text-muted)"
              strokeDasharray="4 4"
              opacity={0.5}
            />
          )}
          <Area
            type="monotone"
            dataKey={type}
            stroke={color}
            strokeWidth={3}
            fillOpacity={1}
            fill={`url(#${gradientId})`}
            animationDuration={1500}
            activeDot={{
              r: 6,
              fill: color,
              stroke: 'var(--bg-card)',
              strokeWidth: 2,
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default SpendingTrendChart;
