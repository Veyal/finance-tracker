import { useState, useRef, useEffect } from 'react';
import './SpendingLineChart.css';

export default function SpendingLineChart({
    data,
    type = 'expense',
    height = 180,
    showAverage = true,
    showTooltip = true
}) {
    const [activeIndex, setActiveIndex] = useState(null);
    const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
    const svgRef = useRef(null);

    // Extract values based on type
    const values = data.map(d => type === 'expense' ? (d.expense || 0) : (d.income || 0));
    const maxValue = Math.max(...values, 1);
    const avgValue = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;

    // Chart dimensions
    const padding = { top: 20, right: 20, bottom: 40, left: 20 };
    const chartWidth = 100; // percentages
    const chartHeight = height - padding.top - padding.bottom;

    // Generate smooth bezier curve path using Catmull-Rom spline
    function generatePath() {
        if (values.length < 2) return '';

        const points = values.map((val, i) => ({
            x: padding.left + (i / (values.length - 1)) * (chartWidth - padding.left - padding.right),
            y: padding.top + chartHeight - (val / maxValue) * chartHeight
        }));

        if (points.length === 2) {
            return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
        }

        // Catmull-Rom to Bezier conversion for smooth curves
        let path = `M ${points[0].x} ${points[0].y}`;

        for (let i = 0; i < points.length - 1; i++) {
            const p0 = points[i - 1] || points[0];
            const p1 = points[i];
            const p2 = points[i + 1];
            const p3 = points[i + 2] || points[points.length - 1];

            // Calculate control points using Catmull-Rom
            const tension = 0.3;
            const cp1x = p1.x + (p2.x - p0.x) * tension;
            const cp1y = p1.y + (p2.y - p0.y) * tension;
            const cp2x = p2.x - (p3.x - p1.x) * tension;
            const cp2y = p2.y - (p3.y - p1.y) * tension;

            path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
        }

        return path;
    }

    // Generate area path for gradient fill
    function generateAreaPath() {
        if (values.length < 2) return '';

        const linePath = generatePath();
        const lastX = padding.left + (chartWidth - padding.left - padding.right);
        const bottomY = padding.top + chartHeight;

        return `${linePath} L ${lastX} ${bottomY} L ${padding.left} ${bottomY} Z`;
    }

    // Get point position for interactive dots
    function getPointPosition(index) {
        const x = padding.left + (index / (values.length - 1)) * (chartWidth - padding.left - padding.right);
        const y = padding.top + chartHeight - (values[index] / maxValue) * chartHeight;
        return { x, y };
    }

    function handlePointHover(index, event) {
        if (!showTooltip) return;
        setActiveIndex(index);

        const svg = svgRef.current;
        if (svg) {
            const rect = svg.getBoundingClientRect();
            const point = getPointPosition(index);
            setTooltipPosition({
                x: (point.x / 100) * rect.width,
                y: (point.y / height) * rect.height
            });
        }
    }

    function handleMouseLeave() {
        setActiveIndex(null);
    }

    function formatAmount(amount) {
        if (amount >= 1000000) {
            return (amount / 1000000).toFixed(1) + 'M';
        } else if (amount >= 1000) {
            return Math.round(amount / 1000) + 'K';
        }
        return new Intl.NumberFormat('id-ID').format(amount);
    }

    function formatDate(dateStr) {
        const date = new Date(dateStr + 'T00:00:00');
        return date.toLocaleDateString('en-US', {
            weekday: 'short',
            day: 'numeric'
        });
    }

    // Calculate average line Y position
    const avgY = padding.top + chartHeight - (avgValue / maxValue) * chartHeight;

    const lineColor = type === 'expense' ? 'var(--expense-red)' : 'var(--income-green)';
    const gradientId = `line-gradient-${type}`;

    return (
        <div className="spending-line-chart" onMouseLeave={handleMouseLeave}>
            <svg
                ref={svgRef}
                viewBox={`0 0 ${chartWidth} ${height}`}
                preserveAspectRatio="none"
                className="chart-svg"
            >
                <defs>
                    <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop
                            offset="0%"
                            stopColor={type === 'expense' ? '#ff6b8a' : '#6bffb8'}
                            stopOpacity="0.4"
                        />
                        <stop
                            offset="100%"
                            stopColor={type === 'expense' ? '#ff6b8a' : '#6bffb8'}
                            stopOpacity="0"
                        />
                    </linearGradient>
                </defs>

                {/* Grid lines */}
                <line
                    x1={padding.left}
                    y1={padding.top}
                    x2={chartWidth - padding.right}
                    y2={padding.top}
                    className="grid-line"
                />
                <line
                    x1={padding.left}
                    y1={padding.top + chartHeight / 2}
                    x2={chartWidth - padding.right}
                    y2={padding.top + chartHeight / 2}
                    className="grid-line"
                />
                <line
                    x1={padding.left}
                    y1={padding.top + chartHeight}
                    x2={chartWidth - padding.right}
                    y2={padding.top + chartHeight}
                    className="grid-line"
                />

                {/* Area fill */}
                <path
                    d={generateAreaPath()}
                    fill={`url(#${gradientId})`}
                    className="area-fill"
                />

                {/* Average line */}
                {showAverage && avgValue > 0 && (
                    <line
                        x1={padding.left}
                        y1={avgY}
                        x2={chartWidth - padding.right}
                        y2={avgY}
                        className="average-line"
                        strokeDasharray="2 2"
                    />
                )}

                {/* Main line */}
                <path
                    d={generatePath()}
                    fill="none"
                    stroke={lineColor}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="main-line"
                />

                {/* Interactive points */}
                {values.map((val, i) => {
                    const pos = getPointPosition(i);
                    const isActive = activeIndex === i;

                    return (
                        <g key={i}>
                            {/* Hover area */}
                            <rect
                                x={pos.x - 3}
                                y={padding.top}
                                width={6}
                                height={chartHeight}
                                fill="transparent"
                                onMouseEnter={(e) => handlePointHover(i, e)}
                                onTouchStart={(e) => handlePointHover(i, e)}
                                style={{ cursor: 'pointer' }}
                            />
                            {/* Point dot */}
                            <circle
                                cx={pos.x}
                                cy={pos.y}
                                r={isActive ? 4 : 2.5}
                                fill={lineColor}
                                className={`point-dot ${isActive ? 'active' : ''}`}
                            />
                        </g>
                    );
                })}

                {/* X-axis labels (show every few) */}
                {data.map((d, i) => {
                    // Show first, last, and some in between
                    const showLabel = i === 0 || i === data.length - 1 ||
                        (data.length > 7 && i % Math.ceil(data.length / 5) === 0);

                    if (!showLabel) return null;

                    const x = padding.left + (i / (data.length - 1)) * (chartWidth - padding.left - padding.right);

                    return (
                        <text
                            key={i}
                            x={x}
                            y={height - 8}
                            textAnchor="middle"
                            className="x-label"
                        >
                            {new Date(d.day + 'T00:00:00').getDate()}
                        </text>
                    );
                })}
            </svg>

            {/* Tooltip */}
            {showTooltip && activeIndex !== null && (
                <div
                    className={`chart-tooltip ${type}`}
                    style={{
                        left: tooltipPosition.x,
                        top: tooltipPosition.y - 10
                    }}
                >
                    <div className="tooltip-date">
                        {formatDate(data[activeIndex]?.day)}
                    </div>
                    <div className="tooltip-amount">
                        Rp {formatAmount(values[activeIndex])}
                    </div>
                </div>
            )}

            {/* Average indicator */}
            {showAverage && avgValue > 0 && (
                <div className="avg-label">
                    <span className="avg-text">Avg</span>
                    <span className="avg-value">Rp {formatAmount(avgValue)}</span>
                </div>
            )}
        </div>
    );
}
