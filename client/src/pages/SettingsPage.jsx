import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Archive, LogOut, ChevronRight, X, Loader2, Lock, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { categories, groups, paymentMethods, incomeSources, auth } from '../api/api';
import './SettingsPage.css';

export default function SettingsPage() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [activeSection, setActiveSection] = useState(null);
    const [data, setData] = useState({ categories: [], groups: [], paymentMethods: [], incomeSources: [] });
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [formName, setFormName] = useState('');
    const [formLoading, setFormLoading] = useState(false);

    // Change PIN state
    const [showChangePin, setShowChangePin] = useState(false);
    const [currentPin, setCurrentPin] = useState('');
    const [newPin, setNewPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [pinError, setPinError] = useState('');
    const [pinSuccess, setPinSuccess] = useState(false);
    const [pinLoading, setPinLoading] = useState(false);
    const [activePinField, setActivePinField] = useState('current');
    const pinInputRef = useRef(null);

    useEffect(() => {
        loadData();
    }, []);

    // Focus pin input when modal opens
    useEffect(() => {
        if (showChangePin && pinInputRef.current) {
            pinInputRef.current.focus();
        }
    }, [showChangePin, activePinField]);

    async function loadData() {
        try {
            setLoading(true);
            const [cats, grps, pms, sources] = await Promise.all([
                categories.list(),
                groups.list(),
                paymentMethods.list(),
                incomeSources.list(),
            ]);
            setData({ categories: cats, groups: grps, paymentMethods: pms, incomeSources: sources });
        } catch (error) {
            console.error('Failed to load settings data:', error);
        } finally {
            setLoading(false);
        }
    }

    function getApi() {
        switch (activeSection) {
            case 'categories': return categories;
            case 'groups': return groups;
            case 'paymentMethods': return paymentMethods;
            case 'incomeSources': return incomeSources;
            default: return null;
        }
    }

    async function handleSave() {
        const api = getApi();
        if (!api || !formName.trim()) return;

        setFormLoading(true);
        try {
            if (editingItem) {
                await api.update(editingItem.id, { name: formName.trim() });
            } else {
                await api.create({ name: formName.trim() });
            }
            await loadData();
            setShowForm(false);
            setEditingItem(null);
            setFormName('');
        } catch (error) {
            console.error('Failed to save:', error);
        } finally {
            setFormLoading(false);
        }
    }

    async function handleArchive(item) {
        const api = getApi();
        if (!api) return;

        try {
            await api.delete(item.id);
            await loadData();
        } catch (error) {
            console.error('Failed to archive:', error);
        }
    }

    function openEdit(item) {
        setEditingItem(item);
        setFormName(item.name);
        setShowForm(true);
    }

    function openAdd() {
        setEditingItem(null);
        setFormName('');
        setShowForm(true);
    }

    function getSectionData() {
        switch (activeSection) {
            case 'categories': return data.categories;
            case 'groups': return data.groups;
            case 'paymentMethods': return data.paymentMethods;
            case 'incomeSources': return data.incomeSources;
            default: return [];
        }
    }

    function getSectionTitle() {
        switch (activeSection) {
            case 'categories': return 'Categories';
            case 'groups': return 'Groups';
            case 'paymentMethods': return 'Payment Methods';
            case 'incomeSources': return 'Income Sources';
            default: return '';
        }
    }

    async function handleLogout() {
        try {
            await logout();
        } catch (error) {
            console.error('Logout failed:', error);
        }
    }

    function openChangePin() {
        setCurrentPin('');
        setNewPin('');
        setConfirmPin('');
        setPinError('');
        setPinSuccess(false);
        setActivePinField('current');
        setShowChangePin(true);
    }

    function handlePinChange(e, setter) {
        const value = e.target.value.replace(/\D/g, '').slice(0, 6);
        setter(value);
    }

    async function handleChangePin() {
        setPinError('');

        if (currentPin.length !== 6) {
            setPinError('Current PIN must be 6 digits');
            return;
        }
        if (newPin.length !== 6) {
            setPinError('New PIN must be 6 digits');
            return;
        }
        if (newPin !== confirmPin) {
            setPinError('New PINs do not match');
            return;
        }
        if (currentPin === newPin) {
            setPinError('New PIN must be different from current PIN');
            return;
        }

        setPinLoading(true);
        try {
            await auth.changePin(currentPin, newPin);
            setPinSuccess(true);
            setTimeout(() => {
                setShowChangePin(false);
            }, 1500);
        } catch (err) {
            if (err.error === 'wrong_pin') {
                setPinError('Current PIN is incorrect');
            } else {
                setPinError('Failed to change PIN. Please try again.');
            }
        } finally {
            setPinLoading(false);
        }
    }

    function renderPinDots(value, maxLength = 6) {
        return (
            <div className="pin-dots-display">
                {[...Array(maxLength)].map((_, i) => (
                    <span
                        key={i}
                        className={`pin-dot ${value.length > i ? 'filled' : ''}`}
                    />
                ))}
            </div>
        );
    }

    if (loading) {
        return (
            <div className="page settings-page">
                <div className="loader">
                    <div className="loader-spinner"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="page settings-page">
            <header className="settings-header">
                <h1>Settings</h1>
            </header>

            <div className="settings-user">
                <div className="user-avatar">{user?.username?.[0]?.toUpperCase() || '?'}</div>
                <div className="user-info">
                    <span className="user-name">{user?.username}</span>
                    <span className="user-label">Personal Account</span>
                </div>
            </div>

            {!activeSection ? (
                <div className="settings-menu">
                    <button type="button" className="settings-item" onClick={() => setActiveSection('categories')}>
                        <span>Categories</span>
                        <div className="settings-item-meta">
                            <span className="settings-count">{data.categories.filter(c => c.is_active).length}</span>
                            <ChevronRight size={20} />
                        </div>
                    </button>

                    <button type="button" className="settings-item" onClick={() => setActiveSection('groups')}>
                        <span>Groups</span>
                        <div className="settings-item-meta">
                            <span className="settings-count">{data.groups.filter(g => g.is_active).length}</span>
                            <ChevronRight size={20} />
                        </div>
                    </button>

                    <button type="button" className="settings-item" onClick={() => setActiveSection('paymentMethods')}>
                        <span>Payment Methods</span>
                        <div className="settings-item-meta">
                            <span className="settings-count">{data.paymentMethods.filter(p => p.is_active).length}</span>
                            <ChevronRight size={20} />
                        </div>
                    </button>

                    <button type="button" className="settings-item" onClick={() => setActiveSection('incomeSources')}>
                        <span>Income Sources</span>
                        <div className="settings-item-meta">
                            <span className="settings-count">{data.incomeSources.filter(s => s.is_active).length}</span>
                            <ChevronRight size={20} />
                        </div>
                    </button>

                    <div className="settings-divider" />

                    <button type="button" className="settings-item" onClick={() => navigate('/split')}>
                        <Users size={20} />
                        <span>Repayments</span>
                        <ChevronRight size={20} className="settings-chevron" />
                    </button>

                    <div className="settings-divider" />

                    <button type="button" className="settings-item" onClick={openChangePin}>
                        <Lock size={20} />
                        <span>Change PIN</span>
                        <ChevronRight size={20} className="settings-chevron" />
                    </button>

                    <button type="button" className="settings-item danger" onClick={handleLogout}>
                        <LogOut size={20} />
                        <span>Log Out</span>
                    </button>
                </div>
            ) : (
                <div className="settings-detail animate-slide-up">
                    <button type="button" className="back-btn" onClick={() => setActiveSection(null)}>
                        ← Back
                    </button>

                    <div className="detail-header">
                        <h2>{getSectionTitle()}</h2>
                        <button type="button" className="btn btn-primary" onClick={openAdd}>
                            <Plus size={18} />
                            Add
                        </button>
                    </div>

                    <div className="items-list">
                        {getSectionData().map(item => (
                            <div key={item.id} className={`list-item ${!item.is_active ? 'archived' : ''}`}>
                                <span className="list-item-name">
                                    {item.name}
                                    {!item.is_active && <span className="archived-badge">Archived</span>}
                                </span>
                                <div className="list-item-actions">
                                    <button type="button" className="btn btn-icon btn-ghost" onClick={() => openEdit(item)}>
                                        <Edit2 size={16} />
                                    </button>
                                    {item.is_active && (
                                        <button type="button" className="btn btn-icon btn-ghost" onClick={() => handleArchive(item)}>
                                            <Archive size={16} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {showForm && (
                <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowForm(false)}>
                    <div className="modal">
                        <div className="modal-header">
                            <h2>{editingItem ? 'Edit' : 'Add'} {getSectionTitle().slice(0, -1)}</h2>
                            <button type="button" className="btn btn-icon btn-ghost" onClick={() => setShowForm(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="input-label">Name</label>
                                <input
                                    type="text"
                                    className="input"
                                    value={formName}
                                    onChange={(e) => setFormName(e.target.value)}
                                    placeholder="Enter name..."
                                    autoFocus
                                />
                            </div>
                            <button
                                className="btn btn-primary btn-lg"
                                onClick={handleSave}
                                disabled={formLoading || !formName.trim()}
                                style={{ width: '100%', marginTop: 'var(--space-md)' }}
                            >
                                {formLoading ? <Loader2 size={20} className="spin" /> : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Change PIN Modal */}
            {showChangePin && (
                <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowChangePin(false)}>
                    <div className="modal change-pin-modal">
                        <div className="modal-header">
                            <h2>Change PIN</h2>
                            <button type="button" className="btn btn-icon btn-ghost" onClick={() => setShowChangePin(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-body">
                            {pinSuccess ? (
                                <div className="pin-success">
                                    <div className="pin-success-icon">✓</div>
                                    <p>PIN changed successfully!</p>
                                </div>
                            ) : (
                                <>
                                    <div className="pin-field-group">
                                        <label className="input-label">Current PIN</label>
                                        <div
                                            className={`pin-input-wrapper ${activePinField === 'current' ? 'focused' : ''}`}
                                            onClick={() => {
                                                setActivePinField('current');
                                                pinInputRef.current?.focus();
                                            }}
                                        >
                                            {renderPinDots(currentPin)}
                                            {activePinField === 'current' && (
                                                <input
                                                    ref={pinInputRef}
                                                    type="password"
                                                    inputMode="numeric"
                                                    className="pin-hidden-input"
                                                    value={currentPin}
                                                    onChange={(e) => handlePinChange(e, setCurrentPin)}
                                                    maxLength={6}
                                                    autoFocus
                                                />
                                            )}
                                        </div>
                                    </div>

                                    <div className="pin-field-group">
                                        <label className="input-label">New PIN</label>
                                        <div
                                            className={`pin-input-wrapper ${activePinField === 'new' ? 'focused' : ''}`}
                                            onClick={() => {
                                                setActivePinField('new');
                                                pinInputRef.current?.focus();
                                            }}
                                        >
                                            {renderPinDots(newPin)}
                                            {activePinField === 'new' && (
                                                <input
                                                    ref={pinInputRef}
                                                    type="password"
                                                    inputMode="numeric"
                                                    className="pin-hidden-input"
                                                    value={newPin}
                                                    onChange={(e) => handlePinChange(e, setNewPin)}
                                                    maxLength={6}
                                                />
                                            )}
                                        </div>
                                    </div>

                                    <div className="pin-field-group">
                                        <label className="input-label">Confirm New PIN</label>
                                        <div
                                            className={`pin-input-wrapper ${activePinField === 'confirm' ? 'focused' : ''}`}
                                            onClick={() => {
                                                setActivePinField('confirm');
                                                pinInputRef.current?.focus();
                                            }}
                                        >
                                            {renderPinDots(confirmPin)}
                                            {activePinField === 'confirm' && (
                                                <input
                                                    ref={pinInputRef}
                                                    type="password"
                                                    inputMode="numeric"
                                                    className="pin-hidden-input"
                                                    value={confirmPin}
                                                    onChange={(e) => handlePinChange(e, setConfirmPin)}
                                                    maxLength={6}
                                                />
                                            )}
                                        </div>
                                    </div>

                                    {pinError && <div className="pin-error">{pinError}</div>}

                                    <button
                                        className="btn btn-primary btn-lg"
                                        onClick={handleChangePin}
                                        disabled={pinLoading || currentPin.length !== 6 || newPin.length !== 6 || confirmPin.length !== 6}
                                        style={{ width: '100%', marginTop: 'var(--space-md)' }}
                                    >
                                        {pinLoading ? <Loader2 size={20} className="spin" /> : 'Change PIN'}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

