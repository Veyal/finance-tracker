import { TrendingDown, TrendingUp, Minus, ArrowUpRight, ArrowDownRight, Activity } from 'lucide-react';
import { usePrivacy } from '../context/PrivacyContext';
import { formatCurrency } from '../utils/format';
import './SummaryCard.css';

export default function SummaryCard({ expense = 0, income = 0, net = 0 }) {
    const { isPrivacyMode } = usePrivacy();

    return (
        <div className="summary-card card-glass animate-slide-up">
            <div className="summary-item summary-expense">
                <div className="summary-icon">
                    <TrendingDown size={20} />
                </div>
                <div className="summary-content">
                    <span className="summary-label">Expense</span>
                    <span className="summary-amount amount-expense">
                        {isPrivacyMode ? '••••' : formatCurrency(expense)}
                    </span>
                </div>
            </div>

            <div className="summary-divider" />

            <div className="summary-item summary-income">
                <div className="summary-icon">
                    <TrendingUp size={20} />
                </div>
                <div className="summary-content">
                    <span className="summary-label">Income</span>
                    <span className="summary-amount amount-income">
                        {isPrivacyMode ? '••••' : formatCurrency(income)}
                    </span>
                </div>
            </div>

            <div className="summary-divider" />

            <div className="summary-item summary-net">
                <div className="summary-icon">
                    {net > 0 ? <ArrowUpRight size={20} /> : net < 0 ? <ArrowDownRight size={20} /> : <Activity size={20} />}
                </div>
                <div className="summary-content">
                    <span className="summary-label">Net</span>
                    <span className={`summary-amount ${net >= 0 ? 'amount-income' : 'amount-expense'}`}>
                        {isPrivacyMode ? '••••' : formatCurrency(net)}
                    </span>
                </div>
            </div>
        </div>
    );
}
