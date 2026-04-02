import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingDown, TrendingUp, ArrowUpRight, ArrowDownRight, Activity, ChevronLeft, ChevronRight } from 'lucide-react';
import { usePrivacy } from '../context/PrivacyContext';
import { formatCurrency } from '../utils/format';
import './SummaryCard.css';

const items = [
    { id: 'expense', label: 'Expense', icon: TrendingDown, colorClass: 'amount-expense' },
    { id: 'net', label: 'Net', icon: null, colorClass: 'net' }, // Icon handled dynamically
    { id: 'income', label: 'Income', icon: TrendingUp, colorClass: 'amount-income' }
];

export default function SummaryCard({ expense = 0, income = 0, net = 0 }) {
    const { isPrivacyMode } = usePrivacy();
    const [activeIndex, setActiveIndex] = useState(1); // Default to 'Net' (index 1)

    const getValue = (id) => {
        if (id === 'expense') return expense;
        if (id === 'income') return income;
        return net;
    };

    const nextItem = () => setActiveIndex((prev) => (prev + 1) % items.length);
    const prevItem = () => setActiveIndex((prev) => (prev - 1 + items.length) % items.length);

    const activeItem = items[activeIndex];

    return (
        <div className="summary-pill-container animate-slide-up">
            <div className="summary-pill card-glass">
                <button className="pill-nav-btn prev" onClick={prevItem}>
                    <ChevronLeft size={16} />
                </button>

                <div className="pill-content-wrapper">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeItem.id}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.2 }}
                            drag="x"
                            dragElastic={0.2}
                            dragConstraints={{ left: 0, right: 0 }}
                            onDragEnd={(_, { offset, velocity }) => {
                                const swipe = offset.x;
                                const velocityThreshold = Math.abs(velocity.x) > 300;
                                if (swipe < -50 || (velocityThreshold && velocity.x < 0)) {
                                    nextItem();
                                } else if (swipe > 50 || (velocityThreshold && velocity.x > 0)) {
                                    prevItem();
                                }
                            }}
                            className="pill-item"
                        >
                            <div className={`pill-icon ${activeItem.id === 'net' ? (net >= 0 ? 'income' : 'expense') : activeItem.id}`}>
                                {activeItem.id === 'expense' && <TrendingDown size={18} />}
                                {activeItem.id === 'income' && <TrendingUp size={18} />}
                                {activeItem.id === 'net' && (
                                    net > 0 ? <ArrowUpRight size={18} /> : net < 0 ? <ArrowDownRight size={18} /> : <Activity size={18} />
                                )}
                            </div>
                            
                            <div className="pill-info">
                                <span className="pill-label">{activeItem.label}</span>
                                <span className={`pill-amount ${activeItem.id === 'net' ? (net >= 0 ? 'amount-income' : 'amount-expense') : activeItem.colorClass}`}>
                                    {isPrivacyMode ? '••••' : formatCurrency(getValue(activeItem.id))}
                                </span>
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </div>

                <button className="pill-nav-btn next" onClick={nextItem}>
                    <ChevronRight size={16} />
                </button>
            </div>

            <div className="pill-indicators">
                {items.map((_, index) => (
                    <div 
                        key={index} 
                        className={`indicator ${index === activeIndex ? 'active' : ''}`}
                        onClick={() => setActiveIndex(index)}
                    />
                ))}
            </div>
        </div>
    );
}
