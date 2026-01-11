import { AlertCircle } from 'lucide-react';
import './FilterChips.css';

export default function FilterChips({
    groups = [],
    selectedGroupId,
    needsReview,
    onGroupChange,
    onNeedsReviewChange,
}) {
    return (
        <div className="filter-chips">
            <button
                className={`chip ${!selectedGroupId ? 'active' : ''}`}
                onClick={() => onGroupChange(null)}
            >
                All
            </button>

            {groups.map((group) => (
                <button
                    key={group.id}
                    className={`chip ${selectedGroupId === group.id ? 'active' : ''}`}
                    onClick={() => onGroupChange(group.id)}
                >
                    {group.name}
                </button>
            ))}

            <div className="filter-divider" />

            <button
                className={`chip ${needsReview ? 'chip-warning active' : ''}`}
                onClick={() => onNeedsReviewChange(!needsReview)}
            >
                <AlertCircle size={14} />
                Needs Review
            </button>
        </div>
    );
}
