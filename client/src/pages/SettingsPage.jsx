import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Plus, Edit2, Archive, LogOut, ChevronRight, X, Loader2, Shield,
    Users, Download, Upload, AlertTriangle, CreditCard,
    Layers, Wallet, TrendingUp, FileJson, Info, Copy,
    Settings, Database, Trash2, Ghost
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { categories, groups, paymentMethods, incomeSources, auth, transactions as transactionsApi, data as dataApi } from '../api/api';
import { formatCurrency } from '../utils/format';
import './SettingsPage.css';

export default function SettingsPage() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [activeSection, setActiveSection] = useState(null);
    const [data, setData] = useState({ categories: [], groups: [], paymentMethods: [], incomeSources: [] });
    const [loading, setLoading] = useState(true);

    // App Preferences
    const [locale, setLocale] = useState(localStorage.getItem('ft_locale') || 'id-ID');
    const [currency, setCurrency] = useState(localStorage.getItem('ft_currency') || 'IDR');

    // Mods & Dialogs
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

    // Data Export/Import state
    const [importLoading, setImportLoading] = useState(false);
    const [exportLoading, setExportLoading] = useState(false);
    const [bulkLoading, setBulkLoading] = useState(false);
    const [showImportConfirm, setShowImportConfirm] = useState(false);
    const [pendingImportData, setPendingImportData] = useState(null);
    const [bulkResults, setBulkResults] = useState(null);
    const [pendingBulkData, setPendingBulkData] = useState(null);
    const [showBulkGuide, setShowBulkGuide] = useState(false);
    const [editingReviewItem, setEditingReviewItem] = useState(null);
    const [editingReviewIndex, setEditingReviewIndex] = useState(null);
    const fileInputRef = useRef(null);
    const bulkInputRef = useRef(null);

    useEffect(() => {
        loadData();
    }, []);

    // ... (keep loadData and other existing functions)

    const handleDiscardReviewItem = (index) => {
        const newResults = [...bulkResults.results];
        newResults.splice(index, 1);
        
        const newAdded = newResults.filter(r => r.status === 'added').length;
        const newSkipped = newResults.filter(r => r.status === 'skipped').length;
        
        setBulkResults({
            ...bulkResults,
            results: newResults,
            summary: {
                ...bulkResults.summary,
                total: newResults.length,
                added: newAdded,
                skipped: newSkipped
            }
        });
    };

    const handleOpenEditReview = (item, index) => {
        setEditingReviewItem({ ...item });
        setEditingReviewIndex(index);
    };

    const handleSaveReviewEdit = () => {
        const newResults = [...bulkResults.results];
        // If it was skipped (duplicate), assume editing it might make it valid
        const updatedItem = { 
            ...editingReviewItem, 
            status: 'added' // Reset to "Will Add"
        };
        newResults[editingReviewIndex] = updatedItem;
        
        const newAdded = newResults.filter(r => r.status === 'added').length;
        const newSkipped = newResults.filter(r => r.status === 'skipped').length;

        setBulkResults({
            ...bulkResults,
            results: newResults,
            summary: {
                ...bulkResults.summary,
                total: newResults.length,
                added: newAdded,
                skipped: newSkipped
            }
        });
        setEditingReviewItem(null);
        setEditingReviewIndex(null);
    };

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
            case 'preferences': return 'App Preferences';
            default: return '';
        }
    }

    const handlePreferenceChange = (key, value) => {
        localStorage.setItem(key, value);
        if (key === 'ft_locale') setLocale(value);
        if (key === 'ft_currency') setCurrency(value);
        // Page reload to apply formatting everywhere
        window.location.reload();
    };

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

        if (value.length === 6) {
            if (activePinField === 'current') {
                setActivePinField('new');
            } else if (activePinField === 'new') {
                setActivePinField('confirm');
            }
        }
    }

    async function handleChangePin() {
        setPinError('');
        if (currentPin.length !== 6 || newPin.length !== 6 || newPin !== confirmPin) {
            setPinError('Invalid PIN entry');
            return;
        }

        setPinLoading(true);
        try {
            await auth.changePin(currentPin, newPin);
            setPinSuccess(true);
            setTimeout(() => { setShowChangePin(false); }, 1500);
        } catch (err) {
            setPinError(err.error === 'wrong_pin' ? 'Current PIN is incorrect' : 'Failed to change PIN');
        } finally {
            setPinLoading(false);
        }
    }

    async function handleExport() {
        if (exportLoading) return;
        setExportLoading(true);
        try {
            const exportData = await dataApi.export();
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `finance_backup_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error('Export failed:', error);
        } finally {
            setExportLoading(false);
        }
    }

    function handleImportClick() {
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
            fileInputRef.current.click();
        }
    }

    function handleFileChange(event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const json = JSON.parse(e.target.result);
                setPendingImportData(json);
                setShowImportConfirm(true);
            } catch (error) {
                alert('Invalid file format');
            }
        };
        reader.readAsText(file);
    }

    async function confirmImport() {
        setImportLoading(true);
        try {
            await dataApi.import(pendingImportData);
            window.location.reload();
        } catch (error) {
            alert('Failed to import data');
        } finally {
            setImportLoading(false);
        }
    }

    function triggerBulkFileSelect() {
        setShowBulkGuide(false);
        if (bulkInputRef.current) {
            bulkInputRef.current.value = '';
            bulkInputRef.current.click();
        }
    }

    function handleBulkFileChange(event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const json = JSON.parse(e.target.result);
                const txList = Array.isArray(json) ? json : (json.transactions || []);
                if (!txList.length) return alert('No transactions found');
                setBulkLoading(true);
                setPendingBulkData(txList);
                const result = await transactionsApi.bulk(txList, { dryRun: true });
                setBulkResults(result);
            } catch (error) {
                alert('Failed to process file');
            } finally {
                setBulkLoading(false);
            }
        };
        reader.readAsText(file);
    }

    async function handleFinalBulkMerge() {
        setBulkLoading(true);
        try {
            // Only send items that are NOT skipped (or edited to 'added')
            const toImport = bulkResults.results.filter(r => r.status === 'added');
            if (toImport.length === 0) {
                alert('No new transactions to import');
                return;
            }
            const result = await transactionsApi.bulk(toImport);
            setBulkResults(result);
            setPendingBulkData(null);
        } catch (error) {
            alert('Failed to merge transactions');
        } finally {
            setBulkLoading(false);
        }
    }

    // --- REDESIGNED RENDERERS ---

    const renderMenuGrid = () => (
        <div className="settings-grid-v2 animate-slide-up">
            {/* User Profile Summary */}
            <div className="settings-user-card">
                <div className="user-avatar-v2">{user?.username?.[0]?.toUpperCase()}</div>
                <div className="user-info-v2">
                    <h3>{user?.username}</h3>
                    <p>Premium Member</p>
                </div>
                <button className="logout-icon-btn" onClick={handleLogout} title="Log Out">
                    <LogOut size={20} />
                </button>
            </div>

            {/* Entities Section */}
            <section className="settings-group-v2">
                <h4 className="group-label-v2">Entities</h4>
                <div className="settings-list-v2">
                    <button className="settings-item-v2" onClick={() => setActiveSection('categories')}>
                        <div className="item-icon-v2" style={{ color: '#ff7eb3' }}><Layers size={20} /></div>
                        <div className="item-text-v2">
                            <span>Categories</span>
                            <small>{data.categories.filter(c => c.is_active).length} Active</small>
                        </div>
                        <ChevronRight size={18} />
                    </button>
                    <button className="settings-item-v2" onClick={() => setActiveSection('groups')}>
                        <div className="item-icon-v2" style={{ color: '#F59E0B' }}><Users size={20} /></div>
                        <div className="item-text-v2">
                            <span>Groups</span>
                            <small>{data.groups.filter(c => c.is_active).length} Active</small>
                        </div>
                        <ChevronRight size={18} />
                    </button>
                    <button className="settings-item-v2" onClick={() => setActiveSection('paymentMethods')}>
                        <div className="item-icon-v2" style={{ color: '#10B981' }}><Wallet size={20} /></div>
                        <div className="item-text-v2">
                            <span>Payment Methods</span>
                            <small>{data.paymentMethods.filter(c => c.is_active).length} Active</small>
                        </div>
                        <ChevronRight size={18} />
                    </button>
                    <button className="settings-item-v2" onClick={() => setActiveSection('incomeSources')}>
                        <div className="item-icon-v2" style={{ color: '#3B82F6' }}><TrendingUp size={20} /></div>
                        <div className="item-text-v2">
                            <span>Income Sources</span>
                            <small>{data.incomeSources.filter(c => c.is_active).length} Active</small>
                        </div>
                        <ChevronRight size={18} />
                    </button>
                </div>
            </section>

            {/* Preferences & Security */}
            <section className="settings-group-v2">
                <h4 className="group-label-v2">App & Security</h4>
                <div className="settings-list-v2">
                    <button className="settings-item-v2" onClick={() => setActiveSection('preferences')}>
                        <div className="item-icon-v2" style={{ color: '#8B5CF6' }}><Settings size={20} /></div>
                        <div className="item-text-v2">
                            <span>Preferences</span>
                            <small>{currency} · {locale}</small>
                        </div>
                        <ChevronRight size={18} />
                    </button>
                    <button className="settings-item-v2" onClick={openChangePin}>
                        <div className="item-icon-v2" style={{ color: '#10B981' }}><Shield size={20} /></div>
                        <div className="item-text-v2">
                            <span>Security</span>
                            <small>Change your 6-digit PIN</small>
                        </div>
                        <ChevronRight size={18} />
                    </button>
                </div>
            </section>

            {/* Data Management */}
            <section className="settings-group-v2">
                <h4 className="group-label-v2">Data Management</h4>
                <div className="settings-list-v2">
                    <button className="settings-item-v2" onClick={handleExport} disabled={exportLoading}>
                        <div className="item-icon-v2" style={{ color: '#3B82F6' }}><Download size={20} /></div>
                        <div className="item-text-v2">
                            <span>Backup Data</span>
                            <small>Export all your data to JSON</small>
                        </div>
                        {exportLoading ? <Loader2 size={18} className="spin" /> : <ChevronRight size={18} />}
                    </button>
                    <button className="settings-item-v2" onClick={() => setShowBulkGuide(true)} disabled={bulkLoading}>
                        <div className="item-icon-v2" style={{ color: '#10B981' }}><FileJson size={20} /></div>
                        <div className="item-text-v2">
                            <span>Bulk Insert</span>
                            <small>Merge transactions from JSON</small>
                        </div>
                        {bulkLoading ? <Loader2 size={18} className="spin" /> : <ChevronRight size={18} />}
                    </button>
                    <button className="settings-item-v2" onClick={handleImportClick} disabled={importLoading}>
                        <div className="item-icon-v2" style={{ color: '#F59E0B' }}><Upload size={20} /></div>
                        <div className="item-text-v2">
                            <span>Restore Data</span>
                            <small>Overwrite current database</small>
                        </div>
                        {importLoading ? <Loader2 size={18} className="spin" /> : <ChevronRight size={18} />}
                    </button>
                </div>
            </section>

            {/* Useless Section (As requested) */}
            <section className="settings-group-v2">
                <h4 className="group-label-v2">Useless Stuff</h4>
                <div className="settings-list-v2">
                    <button className="settings-item-v2" onClick={() => navigate('/split')}>
                        <div className="item-icon-v2" style={{ color: '#ff7eb3' }}><CreditCard size={20} /></div>
                        <div className="item-text-v2">
                            <span>Repayments (Split)</span>
                            <small>Because tracking debt is boring</small>
                        </div>
                        <ChevronRight size={18} />
                    </button>
                    <button className="settings-item-v2" onClick={() => alert("Boo! Just a ghost.")}>
                        <div className="item-icon-v2" style={{ color: 'var(--text-muted)' }}><Ghost size={20} /></div>
                        <div className="item-text-v2">
                            <span>The Void</span>
                            <small>Does absolutely nothing</small>
                        </div>
                        <ChevronRight size={18} />
                    </button>
                </div>
            </section>

            {/* Hidden Inputs */}
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" style={{ display: 'none' }} />
            <input type="file" ref={bulkInputRef} onChange={handleBulkFileChange} accept=".json" style={{ display: 'none' }} />
        </div>
    );

    const renderDetailView = () => {
        let content;
        if (activeSection === 'preferences') {
            content = (
                <div className="preferences-form">
                    <div className="pref-group">
                        <label className="input-label">Currency Code</label>
                        <input
                            type="text"
                            className="input"
                            value={currency}
                            onChange={(e) => handlePreferenceChange('ft_currency', e.target.value.toUpperCase())}
                            placeholder="e.g. IDR, USD, EUR"
                        />
                        <p className="input-hint">Standard ISO currency code</p>
                    </div>
                    <div className="pref-group" style={{ marginTop: '20px' }}>
                        <label className="input-label">Locale Tag</label>
                        <input
                            type="text"
                            className="input"
                            value={locale}
                            onChange={(e) => handlePreferenceChange('ft_locale', e.target.value)}
                            placeholder="e.g. id-ID, en-US, de-DE"
                        />
                        <p className="input-hint">BCP 47 language tag for formatting</p>
                    </div>
                </div>
            );
        } else {
            content = getSectionData().map((item) => (
                <div key={item.id} className={`detail-item-v2 ${!item.is_active ? 'archived' : ''}`}>
                    <div className="item-info">
                        <span className="item-name">{item.name}</span>
                        {!item.is_active && <span className="badge-archived">Archived</span>}
                    </div>
                    <div className="item-actions">
                        <button className="btn-icon-sm" onClick={() => openEdit(item)}>
                            <Edit2 size={16} />
                        </button>
                        {item.is_active && (
                            <button className="btn-icon-sm danger" onClick={() => handleArchive(item)}>
                                <Archive size={16} />
                            </button>
                        )}
                    </div>
                </div>
            ));
        }

        return (
            <div className="settings-detail animate-slide-up">
                <div className="detail-header-v2">
                    <button className="btn-back-v2" onClick={() => setActiveSection(null)}>
                        <ChevronRight size={24} style={{ transform: 'rotate(180deg)' }} />
                    </button>
                    <h2>{getSectionTitle()}</h2>
                    {activeSection !== 'preferences' && (
                        <button className="btn-add-v2" onClick={openAdd}>
                            <Plus size={20} />
                        </button>
                    )}
                </div>

                <div className="items-list-v2">
                    {content}
                </div>
            </div>
        );
    };

    if (loading) {
        return <div className="page settings-page centered"><div className="loader-spinner"></div></div>;
    }

    return (
        <div className="page settings-page">
            {!activeSection && (
                <header className="settings-header-v2">
                    <h1>Settings</h1>
                </header>
            )}

            {activeSection ? renderDetailView() : renderMenuGrid()}

            {/* --- MODALS --- */}

            {showForm && (
                <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowForm(false)}>
                    <div className="modal">
                        <div className="modal-header">
                            <h2>{editingItem ? 'Edit' : 'New'} {getSectionTitle().slice(0, -1)}</h2>
                            <button className="btn-close" onClick={() => setShowForm(false)}>
                                <X size={18} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <label className="input-label">Name</label>
                            <input
                                type="text"
                                className="input"
                                value={formName}
                                onChange={(e) => setFormName(e.target.value)}
                                placeholder={`Enter name...`}
                                autoFocus
                            />
                        </div>
                        <div className="modal-actions">
                            <button className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
                            <button
                                className="btn btn-primary"
                                onClick={handleSave}
                                disabled={formLoading || !formName.trim()}
                            >
                                {formLoading ? <Loader2 size={18} className="spin" /> : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showChangePin && (
                <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowChangePin(false)}>
                    <div className="modal">
                        <div className="modal-header">
                            <h2>Change PIN</h2>
                            <button className="btn-close" onClick={() => setShowChangePin(false)}>
                                <X size={18} />
                            </button>
                        </div>
                        <div className="modal-body">
                            {pinSuccess ? (
                                <div className="success-animate" style={{ textAlign: 'center', padding: 'var(--space-lg)' }}>
                                    <div style={{ fontSize: '48px', marginBottom: '1rem' }}>✨</div>
                                    <h3>PIN Updated!</h3>
                                </div>
                            ) : (
                                <div className="pin-form-stack">
                                    <div className="pin-group">
                                        <label className="input-label">Current PIN</label>
                                        <div className={`pin-dots-input ${activePinField === 'current' ? 'active' : ''}`} onClick={() => { setActivePinField('current'); setTimeout(() => pinInputRef.current?.focus(), 10); }}>
                                            {[...Array(6)].map((_, i) => (<span key={i} className={`pin-dot ${activePinField === 'current' && currentPin.length === i ? 'current' : ''} ${currentPin.length > i ? 'filled' : ''}`} />))}
                                        </div>
                                    </div>
                                    <div className="pin-group">
                                        <label className="input-label">New PIN</label>
                                        <div className={`pin-dots-input ${activePinField === 'new' ? 'active' : ''}`} onClick={() => { setActivePinField('new'); setTimeout(() => pinInputRef.current?.focus(), 10); }}>
                                            {[...Array(6)].map((_, i) => (<span key={i} className={`pin-dot ${activePinField === 'new' && newPin.length === i ? 'current' : ''} ${newPin.length > i ? 'filled' : ''}`} />))}
                                        </div>
                                    </div>
                                    <div className="pin-group">
                                        <label className="input-label">Confirm New PIN</label>
                                        <div className={`pin-dots-input ${activePinField === 'confirm' ? 'active' : ''}`} onClick={() => { setActivePinField('confirm'); setTimeout(() => pinInputRef.current?.focus(), 10); }}>
                                            {[...Array(6)].map((_, i) => (<span key={i} className={`pin-dot ${activePinField === 'confirm' && confirmPin.length === i ? 'current' : ''} ${confirmPin.length > i ? 'filled' : ''}`} />))}
                                        </div>
                                    </div>
                                    <input 
                                        ref={pinInputRef} 
                                        type="tel" 
                                        pattern="[0-9]*"
                                        inputMode="numeric" 
                                        className="hidden-controller" 
                                        maxLength={6} 
                                        autoComplete="one-time-code"
                                        value={activePinField === 'current' ? currentPin : activePinField === 'new' ? newPin : confirmPin} 
                                        onChange={(e) => { 
                                            if (activePinField === 'current') handlePinChange(e, setCurrentPin); 
                                            else if (activePinField === 'new') handlePinChange(e, setNewPin); 
                                            else handlePinChange(e, setConfirmPin); 
                                        }} 
                                    />
                                    {pinError && <div className="text-danger" style={{ textAlign: 'center', marginTop: '1rem', color: 'var(--expense-red)' }}>{pinError}</div>}
                                </div>
                            )}
                        </div>
                        {!pinSuccess && (
                            <div className="modal-actions">
                                <button className="btn btn-primary" onClick={handleChangePin} style={{ width: '100%' }} disabled={pinLoading}>
                                    {pinLoading ? <Loader2 size={18} className="spin" /> : 'Update PIN'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {showImportConfirm && (
                <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && !importLoading && setShowImportConfirm(false)}>
                    <div className="modal">
                        <div className="modal-header">
                            <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--warning-yellow)' }}>
                                <AlertTriangle /> Warning
                            </h2>
                        </div>
                        <div className="modal-body">
                            <p>This will <strong>OVERWRITE</strong> all existing data. This action cannot be undone.</p>
                        </div>
                        <div className="modal-actions">
                            <button className="btn btn-ghost" onClick={() => setShowImportConfirm(false)} disabled={importLoading} style={{ flex: 1 }}>Cancel</button>
                            <button className="btn btn-primary" onClick={confirmImport} disabled={importLoading} style={{ flex: 1, background: 'var(--expense-red)', boxShadow: '0 0 20px var(--expense-red-glow)' }}>
                                {importLoading ? <Loader2 size={18} className="spin" /> : 'Yes, Overwrite'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Bulk Insert Results Modal */}
            {bulkResults && (
                <div className="modal-overlay" onClick={() => { if (bulkResults.summary.isDryRun) { setBulkResults(null); setPendingBulkData(null); } else { setBulkResults(null); } }}>
                    <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <div className="header-with-status">
                                <div className={`status-indicator ${bulkResults.summary.isDryRun ? 'warning' : 'success'}`}></div>
                                <h2>{bulkResults.summary.isDryRun ? 'Review Transactions' : 'Import Successful'}</h2>
                            </div>
                            <button className="btn-close" onClick={() => { setBulkResults(null); setPendingBulkData(null); }}>
                                <X size={18} />
                            </button>
                        </div>
                        <div className="modal-body results-container">
                            <div className="bulk-stats-banner">
                                <div className="stat-pill">
                                    <span className="label">Total</span>
                                    <span className="value">{bulkResults.summary.total}</span>
                                </div>
                                <div className="stat-pill success">
                                    <span className="label">{bulkResults.summary.isDryRun ? 'To Add' : 'Added'}</span>
                                    <span className="value">{bulkResults.summary.added}</span>
                                </div>
                                <div className="stat-pill muted">
                                    <span className="label">Skipped</span>
                                    <span className="value">{bulkResults.summary.skipped}</span>
                                </div>
                            </div>

                            <div className="results-scroll-area">
                                {bulkResults.results.map((res, i) => (
                                    <div key={i} className={`review-item ${res.status} ${res.type}`}>
                                        <div className="item-type-icon">
                                            {res.type === 'income' ? <TrendingUp size={16} /> : <TrendingUp size={16} style={{ transform: 'rotate(180deg)' }} />}
                                        </div>
                                        <div className="item-main">
                                            <div className="item-top">
                                                <span className="merchant">{res.merchant || 'Unnamed'}</span>
                                                <span className={`amount ${res.type}`}>
                                                    {res.type === 'expense' ? '-' : '+'}{formatCurrency(res.amount)}
                                                </span>
                                            </div>
                                            <div className="item-bottom">
                                                <span className="date">{res.date.split('T')[0]}</span>
                                                <span className="dot">·</span>
                                                <span className="category">{res.category_name || res.category_id || 'No Category'}</span>
                                                {res.status === 'skipped' && (
                                                    <>
                                                        <span className="dot">·</span>
                                                        <span className="skip-reason">Duplicate</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        {bulkResults.summary.isDryRun && (
                                            <div className="item-review-actions">
                                                <button className="btn-icon-xs" onClick={() => handleOpenEditReview(res, i)}>
                                                    <Edit2 size={12} />
                                                </button>
                                                <button className="btn-icon-xs danger" onClick={() => handleDiscardReviewItem(i)}>
                                                    <Trash2 size={12} />
                                                </button>
                                            </div>
                                        )}
                                        {res.status === 'skipped' && !bulkResults.summary.isDryRun && (
                                            <div className="item-status-badge">
                                                <AlertTriangle size={14} />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="modal-actions">
                            {bulkResults.summary.isDryRun ? (
                                <>
                                    <button className="btn btn-ghost" onClick={() => {
                                        setBulkResults(null);
                                        setPendingBulkData(null);
                                    }} style={{ flex: 1 }}>Discard</button>
                                    <button
                                        className="btn btn-primary"
                                        onClick={handleFinalBulkMerge}
                                        style={{ flex: 2 }}
                                        disabled={bulkLoading || bulkResults.summary.added === 0}
                                    >
                                        {bulkLoading ? <Loader2 size={18} className="spin" /> : `Import ${bulkResults.summary.added} Items`}
                                    </button>
                                </>
                            ) : (
                                <button className="btn btn-primary" onClick={() => { setBulkResults(null); window.location.reload(); }} style={{ width: '100%' }}>Done</button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Bulk Insert Guide */}
            {showBulkGuide && (
                <div className="modal-overlay" onClick={() => setShowBulkGuide(false)}>
                    <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div className="icon-circle" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10B981' }}><FileJson size={20} /></div>
                                <h2>Bulk Insert Guide</h2>
                            </div>
                            <button className="btn-close" onClick={() => setShowBulkGuide(false)}>
                                <X size={18} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>Upload a JSON file with an array of transaction objects.</p>
                            <div className="format-example-container">
                                <pre className="code-block">
{`[
  {
    "type": "expense",
    "amount": 50000,
    "date": "2026-03-22T10:00:00Z",
    "merchant": "Starbucks",
    "category_name": "Food & Drinks"
  },
  ...
]`}
                                </pre>
                            </div>
                        </div>
                        <div className="modal-actions">
                            <button className="btn btn-ghost" onClick={() => setShowBulkGuide(false)} style={{ flex: 1 }}>Cancel</button>
                            <button className="btn btn-primary" onClick={triggerBulkFileSelect} style={{ flex: 2 }}>Select File</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Bulk Review Item Edit Modal */}
            {editingReviewItem && (
                <div className="modal-overlay" style={{ zIndex: 2000 }} onClick={() => setEditingReviewItem(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Edit Item</h2>
                            <button className="btn-close" onClick={() => setEditingReviewItem(null)}>
                                <X size={18} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="input-label">Type</label>
                                <div className="type-switcher-v2">
                                    <button
                                        className={`type-btn ${editingReviewItem.type === 'expense' ? 'active expense' : ''}`}
                                        onClick={() => setEditingReviewItem({...editingReviewItem, type: 'expense'})}
                                    >Expense</button>
                                    <button
                                        className={`type-btn ${editingReviewItem.type === 'income' ? 'active income' : ''}`}
                                        onClick={() => setEditingReviewItem({...editingReviewItem, type: 'income'})}
                                    >Income</button>
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="input-label">Merchant</label>
                                <input
                                    type="text"
                                    className="input"
                                    value={editingReviewItem.merchant || ''}
                                    onChange={e => setEditingReviewItem({...editingReviewItem, merchant: e.target.value})}
                                />
                            </div>
                            <div className="form-row-v2">
                                <div className="form-group">
                                    <label className="input-label">Amount</label>
                                    <input
                                        type="number"
                                        className="input"
                                        value={editingReviewItem.amount}
                                        onChange={e => setEditingReviewItem({...editingReviewItem, amount: e.target.value})}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="input-label">Date</label>
                                    <input
                                        type="date"
                                        className="input"
                                        value={(editingReviewItem.date || '').split('T')[0]}
                                        onChange={e => setEditingReviewItem({...editingReviewItem, date: e.target.value})}
                                    />
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="input-label">Category</label>
                                <select
                                    className="select"
                                    value={editingReviewItem.category_id || ''}
                                    onChange={e => setEditingReviewItem({...editingReviewItem, category_id: e.target.value, category_name: e.target.options[e.target.selectedIndex].text})}
                                >
                                    <option value="">No Category</option>
                                    {data.categories.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="input-label">Group</label>
                                <select
                                    className="select"
                                    value={editingReviewItem.group_id || ''}
                                    onChange={e => setEditingReviewItem({...editingReviewItem, group_id: e.target.value})}
                                >
                                    <option value="">No Group</option>
                                    {data.groups.map(g => (
                                        <option key={g.id} value={g.id}>{g.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="input-label">Payment Method</label>
                                <select
                                    className="select"
                                    value={editingReviewItem.payment_method_id || ''}
                                    onChange={e => setEditingReviewItem({...editingReviewItem, payment_method_id: e.target.value})}
                                >
                                    <option value="">No Payment Method</option>
                                    {data.paymentMethods.map(pm => (
                                        <option key={pm.id} value={pm.id}>{pm.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="input-label">Note</label>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="Optional note"
                                    value={editingReviewItem.note || ''}
                                    onChange={e => setEditingReviewItem({...editingReviewItem, note: e.target.value})}
                                />
                            </div>
                        </div>
                        <div className="modal-actions">
                            <button className="btn btn-ghost" onClick={() => setEditingReviewItem(null)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleSaveReviewEdit}>Update Item</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
