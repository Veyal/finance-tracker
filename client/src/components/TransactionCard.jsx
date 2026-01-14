import { useState } from 'react';
import { Edit2, Trash2, AlertCircle } from 'lucide-react';
import { usePrivacy } from '../context/PrivacyContext';
import './TransactionCard.css';

function formatAmount(amount) {
    return new Intl.NumberFormat('id-ID').format(amount);
}

function formatDateTime(dateString) {
    return new Date(dateString).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    });
}

export default function TransactionCard({ transaction, onEdit, onDelete }) {
    const [showActions, setShowActions] = useState(false);

    const {
        type,
        amount,
        date,
        category_name,
        group_name,
        payment_method_name,
        income_source_name,
        merchant,
        note
    } = transaction;

    const needsReview = type === 'expense' && (!category_name || !group_name || !payment_method_name);

    function handleCardClick() {
        setShowActions(!showActions);
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
        <div className={`transaction-card ${type} ${showActions ? 'expanded' : ''}`} onClick={handleCardClick}>
            {/* Main Content */}
            <div className="transaction-content">
                {/* Left: Info */}
                <div className="transaction-left">
                    <div className="transaction-primary">
                        <span className="transaction-name">{displayName}</span>
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
                        {/* Time removed per user request */}
                    </div>
                </div>

                {/* Right: Amount */}
                <div className="transaction-right">
                    <span className={`transaction-amount amount-${type}`}>
                        {usePrivacy().isPrivacyMode ? '****' : `${type === 'expense' ? '-' : '+'}Rp ${formatAmount(amount)}`}
                    </span>
                    {group_name && (
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

            {/* Actions - shown on tap */}
            {showActions && (
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
