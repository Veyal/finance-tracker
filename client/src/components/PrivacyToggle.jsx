import { Eye, EyeOff } from 'lucide-react';
import { usePrivacy } from '../context/PrivacyContext';
import { useLocation } from 'react-router-dom';

export default function PrivacyToggle({ className = '', style = {} }) {
    const { isPrivacyMode, togglePrivacy } = usePrivacy();
    const location = useLocation();

    // Determine if we are in the sidebar or a header
    const isSidebar = className.includes('nav-privacy-btn');

    return (
        <button
            type="button"
            className={`privacy-toggle-btn ${className}`}
            onClick={togglePrivacy}
            title={isPrivacyMode ? "Show Amounts" : "Hide Amounts"}
            style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: isSidebar ? 8 : '4px',
                borderRadius: '50%',
                width: 'auto',
                height: 'auto',
                backdropFilter: 'none',
                transition: 'all 0.2s ease',
                ...style
            }}
        >
            {isPrivacyMode ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
    );
}
