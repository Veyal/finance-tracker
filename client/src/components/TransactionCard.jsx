import { GripVertical, AlertCircle, Users } from 'lucide-react';
import { usePrivacy } from '../context/PrivacyContext';
import './TransactionCard.css';

function formatAmount(amount) {
    return new Intl.NumberFormat('id-ID').format(amount);
}

export default function TransactionCard({ transaction, onClick, dragHandleProps }) {
    const { isPrivacyMode } = usePrivacy();

    const {
        type,
        amount,
        net_amount,
        repayment_total,
        category_name,
        group_name,
        payment_method_name,
        income_source_name,
        merchant,
        note
    } = transaction;

    const hasRepayments = repayment_total > 0;
    const displayAmount = hasRepayments && net_amount !== undefined ? net_amount : amount;
    const needsReview = type === 'expense' && (!category_name || !group_name || !payment_method_name);

    const displayName = merchant || category_name || income_source_name || 'Unlabeled';
    const displayCategory = merchant && category_name ? category_name : null;

    return (
        <div
            className={`transaction-card ${type} ${hasRepayments ? 'has-repayments' : ''}`}
            onClick={() => onClick?.(transaction)}
        >
            {/* Main Content */}
            <div className="transaction-content">
                {/* Drag Handle (if enabled) */}
                {dragHandleProps && (
                    <div
                        className="drag-handle"
                        onClick={(e) => e.stopPropagation()}
                        {...dragHandleProps}
                    >
                        <GripVertical size={18} />
                    </div>
                )}

                {/* Left: Info */}
                <div className="transaction-left">
                    <div className="transaction-primary">
                        <span className="transaction-name">{displayName}</span>
                        {hasRepayments && (
                            <span className="repayment-badge" title="Has repayments">
                                <Users size={12} />
                            </span>
                        )}
                        {needsReview && (
                            <span className="review-dot" title="Needs review">
                                <AlertCircle size={14} />
                            </span>
                        )}
                    </div>
                    <div className="transaction-secondary">
                        {displayCategory && (
                            <span className="transaction-category">{displayCategory}</span>
                        )}
                        {type === 'expense' && payment_method_name && (
                            <span className="transaction-payment">{payment_method_name}</span>
                        )}
                        {type === 'income' && income_source_name && merchant && (
                            <span className="transaction-source">{income_source_name}</span>
                        )}
                    </div>
                </div>

                {/* Right: Amount */}
                <div className="transaction-right">
                    <span className={`transaction-amount amount-${type}`}>
                        {isPrivacyMode ? '****' : `${type === 'expense' ? '-' : '+'}Rp ${formatAmount(displayAmount)}`}
                    </span>
                    {hasRepayments && !isPrivacyMode && (
                        <span className="original-amount">
                            Rp {formatAmount(amount)}
                        </span>
                    )}
                    {!hasRepayments && group_name && (
                        <span className="transaction-group">{group_name}</span>
                    )}
                </div>
            </div>

            {/* Note (if present) */}
            {note && (
                <div className="transaction-note">
                    <span>{note}</span>
                </div>
            )}
        </div>
    );
}
