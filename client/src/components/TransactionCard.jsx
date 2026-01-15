import { useState } from 'react';
import { Edit2, Trash2, AlertCircle, Users, GripVertical } from 'lucide-react';
import { usePrivacy } from '../context/PrivacyContext';
import './TransactionCard.css';

function formatAmount(amount) {
    return new Intl.NumberFormat('id-ID').format(amount);
}

export default function TransactionCard({ transaction, onEdit, onDelete, onClick, dragHandleProps }) {
    const [showActions, setShowActions] = useState(false);
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
    // Use amount as primary, only use net_amount if there are actual repayments
    const displayAmount = hasRepayments && net_amount !== undefined ? net_amount : amount;

    const needsReview = type === 'expense' && (!category_name || !group_name || !payment_method_name);

    function handleCardClick(e) {
        if (onClick) {
            onClick(transaction);
        } else {
            setShowActions(!showActions);
        }
    }

    function handleEdit(e) {
        e.stopPropagation();
        setShowActions(false);
        onEdit();
    }

    function handleDelete(e) {
        e.stopPropagation();
        if (window.confirm('Delete this transaction?')) {
            onDelete();
        }
    }

    // Get display name
    const displayName = merchant || category_name || income_source_name || 'Unlabeled';
    const displayCategory = merchant && category_name ? category_name : null;

    return (
        <div
            className={`transaction-card ${type} ${showActions ? 'expanded' : ''} ${hasRepayments ? 'has-repayments' : ''}`}
            onClick={handleCardClick}
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

            {/* Actions - shown on tap (only if onClick not provided) */}
            {showActions && !onClick && (
                <div className="transaction-actions">
                    <button className="action-btn edit" onClick={handleEdit}>
                        <Edit2 size={16} />
                        <span>Edit</span>
                    </button>
                    <button className="action-btn delete" onClick={handleDelete}>
                        <Trash2 size={16} />
                        <span>Delete</span>
                    </button>
                </div>
            )}
        </div>
    );
}
