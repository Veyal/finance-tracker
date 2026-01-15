import { NavLink, useLocation } from 'react-router-dom';
import { Home, List, PieChart, Settings } from 'lucide-react';
import { useHaptics } from '../hooks/useHaptics';
import PrivacyToggle from './PrivacyToggle';
import './Navigation.css';

const navItems = [
    { path: '/', icon: Home, label: 'Today' },
    { path: '/transactions', icon: List, label: 'All' },
    { path: '/insights', icon: PieChart, label: 'Insights' },
    { path: '/settings', icon: Settings, label: 'Settings' },
];

export default function Navigation() {
    const location = useLocation();
    const { triggerImpact } = useHaptics();

    return (
        <>
            {/* Mobile Bottom Nav */}
            <nav className="nav-mobile">
                {navItems.map(({ path, icon: Icon, label }) => (
                    <NavLink
                        key={path}
                        to={path}
                        className={`nav-item ${location.pathname === path ? 'active' : ''}`}
                        onClick={() => triggerImpact('light')}
                    >
                        <Icon size={24} />
                        <span>{label}</span>
                    </NavLink>
                ))}
            </nav>

            {/* Tablet Rail */}
            <nav className="nav-tablet">
                {navItems.map(({ path, icon: Icon, label }) => (
                    <NavLink
                        key={path}
                        to={path}
                        className={`nav-item ${location.pathname === path ? 'active' : ''}`}
                        title={label}
                        onClick={() => triggerImpact('light')}
                    >
                        <Icon size={24} />
                    </NavLink>
                ))}
                <div className="nav-tablet-footer">
                    <PrivacyToggle className="nav-privacy-btn" />
                </div>
            </nav>

            {/* Desktop Sidebar */}
            <nav className="nav-desktop">
                <div className="nav-logo">
                    <span className="nav-logo-icon">💰</span>
                    <span className="nav-logo-text">Finance</span>
                    <PrivacyToggle className="nav-privacy-btn" style={{ marginLeft: 'auto' }} />
                </div>

                <div className="nav-links">
                    {navItems.map(({ path, icon: Icon, label }) => (
                        <NavLink
                            key={path}
                            to={path}
                            className={`nav-link ${location.pathname === path ? 'active' : ''}`}
                            onClick={() => triggerImpact('light')}
                        >
                            <Icon size={20} />
                            <span>{label}</span>
                        </NavLink>
                    ))}
                </div>
            </nav>
        </>
    );
}

