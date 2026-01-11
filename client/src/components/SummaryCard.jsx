import { TrendingDown, TrendingUp, Minus } from 'lucide-react';
import './SummaryCard.css';

function formatAmount(amount) {
    return new Intl.NumberFormat('id-ID').format(Math.abs(amount));
}

export default function SummaryCard({ expense = 0, income = 0, net = 0 }) {
    return (
        <div className="summary-card card-glass animate-slide-up">
            <div className="summary-item summary-expense">
                <div className="summary-icon">
                    <TrendingDown size={20} />
                </div>
                <div className="summary-content">
                    <span className="summary-label">Expense</span>
                    <span className="summary-amount amount-expense">
                        Rp {formatAmount(expense)}
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
                        Rp {formatAmount(income)}
                    </span>
                </div>
            </div>

            <div className="summary-divider" />

            <div className="summary-item summary-net">
                <div className="summary-icon">
                    <Minus size={20} />
                </div>
                <div className="summary-content">
                    <span className="summary-label">Net</span>
                    <span className={`summary-amount ${net >= 0 ? 'amount-income' : 'amount-expense'}`}>
                        Rp {formatAmount(net)}
                    </span>
                </div>
            </div>
        </div>
    );
}
