import { useState, useRef } from 'react';
import { usePrivacy } from '../context/PrivacyContext';
import './CumulativeNetChart.css';

export default function CumulativeNetChart({ data, height = 180 }) {
    const { isPrivacyMode } = usePrivacy();
    const [activeIndex, setActiveIndex] = useState(null);
    const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
    const svgRef = useRef(null);

    // Calculate cumulative net (income - expense) for each day
    const cumulativeData = data.reduce((acc, day, index) => {
        const net = (day.income || 0) - (day.expense || 0);
        const prevTotal = index > 0 ? acc[index - 1].cumulative : 0;
        acc.push({
            ...day,
            net,
            cumulative: prevTotal + net
        });
        return acc;
    }, []);

    const values = cumulativeData.map(d => d.cumulative);
    const maxValue = Math.max(...values, 0);
    const minValue = Math.min(...values, 0);
    const valueRange = maxValue - minValue || 1;

    // Final cumulative value
    const finalValue = values[values.length - 1] || 0;
    const isPositive = finalValue >= 0;

    // Chart dimensions
    const padding = { top: 30, right: 20, bottom: 40, left: 20 };
    const chartWidth = 100;
    const chartHeight = height - padding.top - padding.bottom;

    // Calculate zero line position
    const zeroY = padding.top + (maxValue / valueRange) * chartHeight;

    // Generate smooth path
    function generatePath() {
        if (values.length < 2) return '';

        const points = values.map((val, i) => ({
            x: padding.left + (i / (values.length - 1)) * (chartWidth - padding.left - padding.right),
            y: padding.top + ((maxValue - val) / valueRange) * chartHeight
        }));

        if (points.length === 2) {
            return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
        }

        let path = `M ${points[0].x} ${points[0].y}`;
        for (let i = 0; i < points.length - 1; i++) {
            const p0 = points[i - 1] || points[0];
            const p1 = points[i];
            const p2 = points[i + 1];
            const p3 = points[i + 2] || points[points.length - 1];

            const tension = 0.3;
            const cp1x = p1.x + (p2.x - p0.x) * tension;
            const cp1y = p1.y + (p2.y - p0.y) * tension;
            const cp2x = p2.x - (p3.x - p1.x) * tension;
            const cp2y = p2.y - (p3.y - p1.y) * tension;

            path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
        }
        return path;
    }

    // Area fill path (from line to zero line)
    function generateAreaPath() {
        if (values.length < 2) return '';
        const linePath = generatePath();
        const lastX = padding.left + (chartWidth - padding.left - padding.right);
        return `${linePath} L ${lastX} ${zeroY} L ${padding.left} ${zeroY} Z`;
    }

    function getPointPosition(index) {
        const x = padding.left + (index / (values.length - 1)) * (chartWidth - padding.left - padding.right);
        const y = padding.top + ((maxValue - values[index]) / valueRange) * chartHeight;
        return { x, y };
    }

    function handlePointHover(index, event) {
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

    function formatAmount(amount) {
        if (isPrivacyMode) return '****';
        const abs = Math.abs(amount);
        if (abs >= 1000000) return (amount / 1000000).toFixed(1) + 'M';
        if (abs >= 1000) return Math.round(amount / 1000) + 'K';
        return new Intl.NumberFormat('id-ID').format(amount);
    }

    function formatDate(dateStr) {
        const date = new Date(dateStr + 'T00:00:00');
        return date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });
    }

    const lineColor = isPositive ? 'var(--income-green)' : 'var(--expense-red)';
    const gradientId = 'cumulative-gradient';

    return (
        <div className="cumulative-net-chart" onMouseLeave={() => setActiveIndex(null)}>
            {/* Summary Badge */}
            <div className={`cumulative-badge ${isPositive ? 'positive' : 'negative'}`}>
                <span className="badge-label">{isPositive ? 'Saved' : 'Spent more'}</span>
                <span className="badge-value">
                    {isPositive ? '+' : ''}Rp {formatAmount(finalValue)}
                </span>
            </div>

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
                            stopColor={isPositive ? '#6bffb8' : '#ff6b8a'}
                            stopOpacity="0.3"
                        />
                        <stop
                            offset="100%"
                            stopColor={isPositive ? '#6bffb8' : '#ff6b8a'}
                            stopOpacity="0"
                        />
                    </linearGradient>
                </defs>

                {/* Zero baseline */}
                <line
                    x1={padding.left}
                    y1={zeroY}
                    x2={chartWidth - padding.right}
                    y2={zeroY}
                    className="zero-line"
                />
                <text
                    x={padding.left - 2}
                    y={zeroY}
                    className="zero-label"
                    textAnchor="end"
                    alignmentBaseline="middle"
                >
                    0
                </text>

                {/* Area fill */}
                <path
                    d={generateAreaPath()}
                    fill={`url(#${gradientId})`}
                    className="area-fill"
                />

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

                {/* End point marker */}
                {values.length > 0 && (
                    <circle
                        cx={getPointPosition(values.length - 1).x}
                        cy={getPointPosition(values.length - 1).y}
                        r="4"
                        fill={lineColor}
                        className="end-point"
                    />
                )}

                {/* Interactive points */}
                {values.map((val, i) => {
                    const pos = getPointPosition(i);
                    const isActive = activeIndex === i;
                    return (
                        <g key={i}>
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
                            {isActive && (
                                <circle
                                    cx={pos.x}
                                    cy={pos.y}
                                    r={4}
                                    fill={lineColor}
                                    className="point-dot active"
                                />
                            )}
                        </g>
                    );
                })}

                {/* X-axis labels */}
                {data.map((d, i) => {
                    const showLabel = i === 0 || i === data.length - 1 ||
                        (data.length > 7 && i % Math.ceil(data.length / 5) === 0);
                    if (!showLabel) return null;
                    const x = padding.left + (i / (data.length - 1)) * (chartWidth - padding.left - padding.right);
                    return (
                        <text key={i} x={x} y={height - 8} textAnchor="middle" className="x-label">
                            {new Date(d.day + 'T00:00:00').getDate()}
                        </text>
                    );
                })}
            </svg>

            {/* Tooltip */}
            {activeIndex !== null && (
                <div
                    className={`chart-tooltip ${cumulativeData[activeIndex]?.cumulative >= 0 ? 'positive' : 'negative'}`}
                    style={{ left: tooltipPosition.x, top: tooltipPosition.y - 10 }}
                >
                    <div className="tooltip-date">{formatDate(cumulativeData[activeIndex]?.day)}</div>
                    <div className="tooltip-net">
                        Day: {cumulativeData[activeIndex]?.net >= 0 ? '+' : ''}Rp {formatAmount(cumulativeData[activeIndex]?.net || 0)}
                    </div>
                    <div className="tooltip-amount">
                        Total: {cumulativeData[activeIndex]?.cumulative >= 0 ? '+' : ''}Rp {formatAmount(cumulativeData[activeIndex]?.cumulative || 0)}
                    </div>
                </div>
            )}
        </div>
    );
}
