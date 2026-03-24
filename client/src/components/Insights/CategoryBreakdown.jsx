import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { usePrivacy } from '../../context/PrivacyContext';
import { formatCurrency } from '../../utils/format';
import './CategoryBreakdown.css';

const CategoryBreakdown = ({ data, type = 'expense', onCategoryClick }) => {
  const { isPrivacyMode } = usePrivacy();

  if (!data || data.length === 0) {
    return (
      <div className="category-breakdown-empty">
        No data available for this period
      </div>
    );
  }

  // Find max amount for bar width normalization
  const maxAmount = Math.max(...data.map(item => item.total || 0), 1);
  const totalAmount = data.reduce((sum, item) => sum + (item.total || 0), 0);

  const getTrendIcon = (trend) => {
    if (trend > 0) return <ArrowUpRight size={14} className="trend-icon up" />;
    if (trend < 0) return <ArrowDownRight size={14} className="trend-icon down" />;
    return <Minus size={14} className="trend-icon neutral" />;
  };

  return (
    <div className="category-breakdown-container">
      <div className="category-list">
        {data.map((item, index) => {
          const percentage = totalAmount > 0 
            ? ((item.total / totalAmount) * 100).toFixed(1) 
            : 0;
          const barWidth = (item.total / maxAmount) * 100;
          
          // Mock trend for now as per requirements
          const mockTrend = (Math.random() * 20 - 10).toFixed(0);

          return (
            <div
              key={item.id || item.name || index}
              className="category-breakdown-item"
              onClick={() => onCategoryClick && onCategoryClick(item)}
              style={{ '--index': index }}
            >
              <div className="category-header">
                <div className="category-name-row">
                  <span className="category-name">{item.name || 'Uncategorized'}</span>
                  <span className="category-percentage">{percentage}%</span>
                </div>
                <div className="category-stats-row">
                  <span className={`category-amount amount-${type}`}>
                    {isPrivacyMode ? '••••' : formatCurrency(item.total, { compact: true })}
                  </span>
                  <div className="category-trend">
                    {getTrendIcon(Number(mockTrend))}
                    <span className={`trend-value ${Number(mockTrend) > 0 ? 'up' : Number(mockTrend) < 0 ? 'down' : 'neutral'}`}>
                      {Math.abs(Number(mockTrend))}%
                    </span>
                  </div>
                </div>
              </div>
              <div className="category-bar-wrapper">
                <div
                  className={`category-bar-fill ${type}`}
                  style={{ width: `${Math.max(barWidth, 2)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CategoryBreakdown;
