import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Plus, Edit2, Archive, LogOut, ChevronRight, X, Loader2, Lock,
    Users, Database, Download, Upload, AlertTriangle, Shield, CreditCard,
    Layers, Wallet, TrendingUp, FileJson, Info, Copy
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
    const fileInputRef = useRef(null);
    const bulkInputRef = useRef(null);

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
            case 'preferences': return 'App Preferences';
            default: return '';
        }
    }

    const handlePreferenceChange = (key, value) => {
        localStorage.setItem(key, value);
        if (key === 'ft_locale') setLocale(value);
        if (key === 'ft_currency') setCurrency(value);
        // Page reload to apply formatting everywhere (simplest way without complex context)
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

        // Auto-advance to next field if current one is filled
        if (value.length === 6) {
            if (activePinField === 'current') {
                setActivePinField('new');
            } else if (activePinField === 'new') {
                setActivePinField('confirm');
            }
        }
    }

    // Reset PIN state on modal close
    useEffect(() => {
        if (!showChangePin) {
            setCurrentPin('');
            setNewPin('');
            setConfirmPin('');
            setPinError('');
            setPinSuccess(false);
            setActivePinField('current');
        }
    }, [showChangePin]);

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
            <>
                {[...Array(maxLength)].map((_, i) => (
                    <span
                        key={i}
                        className={`pin-dot ${value.length > i ? 'filled' : ''} ${value.length === i ? 'current' : ''}`}
                    />
                ))}
            </>
        );
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
            alert('Failed to export data');
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
                console.error('Invalid JSON:', error);
                alert('Invalid file format');
            }
        };
        reader.readAsText(file);
    }

    async function confirmImport() {
        if (!pendingImportData) return;

        setImportLoading(true);
        try {
            await dataApi.import(pendingImportData);
            setShowImportConfirm(false);
            setPendingImportData(null);
            alert('Data imported successfully! The page will now reload.');
            window.location.reload();
        } catch (error) {
            console.error('Import failed:', error);
            alert('Failed to import data: ' + (error.message || 'Unknown error'));
        } finally {
            setImportLoading(false);
        }
    }

    function handleBulkClick() {
        setShowBulkGuide(true);
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
                // The input might be a raw array or a full export. 
                // If it's a full export, we only want the transactions.
                const txList = Array.isArray(json) ? json : (json.transactions || []);

                if (!txList.length) {
                    alert('No transactions found in file');
                    return;
                }

                setBulkLoading(true);
                setPendingBulkData(txList);
                // First do a dry run to check for duplicates
                const result = await transactionsApi.bulk(txList, { dryRun: true });
                setBulkResults(result);
            } catch (error) {
                console.error('Bulk preview failed:', error);
                alert('Failed to process file: ' + (error.message || 'Invalid format'));
            } finally {
                setBulkLoading(false);
            }
        };
        reader.readAsText(file);
    }

    async function handleFinalBulkMerge() {
        if (!pendingBulkData) return;

        setBulkLoading(true);
        try {
            const result = await transactionsApi.bulk(pendingBulkData);
            setBulkResults(result);
            setPendingBulkData(null);
        } catch (error) {
            console.error('Bulk merge failed:', error);
            alert('Failed to merge transactions');
        } finally {
            setBulkLoading(false);
        }
    }

    // --- RENDERERS ---

    const renderMenuGrid = () => (
        <div className="settings-grid animate-slide-up">

            <section className="settings-section">
                <h3 className="section-title">App Configuration</h3>
                <div className="card-grid">
                    <button className="settings-card" onClick={() => setActiveSection('categories')}>
                        <div className="card-icon" style={{ background: 'var(--gradient-accent)' }}>
                            <Layers size={24} color="#fff" />
                        </div>
                        <span className="card-label">Categories</span>
                        <span className="card-meta">{data.categories.filter(c => c.is_active).length} Active</span>
                    </button>

                    <button className="settings-card" onClick={() => setActiveSection('groups')}>
                        <div className="card-icon" style={{ background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)' }}>
                            <Users size={24} color="#fff" />
                        </div>
                        <span className="card-label">Groups</span>
                        <span className="card-meta">{data.groups.filter(c => c.is_active).length} Active</span>
                    </button>

                    <button className="settings-card" onClick={() => setActiveSection('paymentMethods')}>
                        <div className="card-icon" style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}>
                            <Wallet size={24} color="#fff" />
                        </div>
                        <span className="card-label">Payment Methods</span>
                        <span className="card-meta">{data.paymentMethods.filter(c => c.is_active).length} Active</span>
                    </button>

                    <button className="settings-card" onClick={() => setActiveSection('incomeSources')}>
                        <div className="card-icon" style={{ background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)' }}>
                            <TrendingUp size={24} color="#fff" />
                        </div>
                        <span className="card-label">Income Sources</span>
                        <span className="card-meta">{data.incomeSources.filter(c => c.is_active).length} Active</span>
                    </button>

                    <button className="settings-card" onClick={() => setActiveSection('preferences')}>
                        <div className="card-icon" style={{ background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)' }}>
                            <Database size={24} color="#fff" />
                        </div>
                        <span className="card-label">Preferences</span>
                        <span className="card-meta">{currency} / {locale}</span>
                    </button>
                </div>
            </section>

            <section className="settings-section">
                <h3 className="section-title">Account & Data</h3>
                <div className="list-group">
                    <button className="list-group-item" onClick={() => navigate('/split')}>
                        <div className="list-icon" style={{ background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)', color: 'white' }}>
                            <CreditCard size={20} />
                        </div>
                        <div className="list-content">
                            <span className="list-label">Repayments</span>
                            <span className="list-desc">Manage shared expenses</span>
                        </div>
                        <ChevronRight size={18} className="list-arrow" />
                    </button>

                    <button className="list-group-item" onClick={openChangePin}>
                        <div className="list-icon" style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', color: 'white' }}>
                            <Shield size={20} />
                        </div>
                        <div className="list-content">
                            <span className="list-label">Security</span>
                            <span className="list-desc">Change your PIN code</span>
                        </div>
                        <ChevronRight size={18} className="list-arrow" />
                    </button>

                    <button className="list-group-item" onClick={handleExport} disabled={exportLoading}>
                        <div className="list-icon" style={{ background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)', color: 'white' }}>
                            <Download size={20} />
                        </div>
                        <div className="list-content">
                            <span className="list-label">Backup Data</span>
                            <span className="list-desc">Export as JSON</span>
                        </div>
                        {exportLoading ? <Loader2 size={18} className="spin list-arrow" /> : <ChevronRight size={18} className="list-arrow" />}
                    </button>

                    <button className="list-group-item" onClick={handleBulkClick} disabled={bulkLoading}>
                        <div className="list-icon" style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', color: 'white' }}>
                            <Plus size={20} />
                        </div>
                        <div className="list-content">
                            <span className="list-label">Bulk Insert</span>
                            <span className="list-desc">Merge transactions from JSON</span>
                        </div>
                        <input
                            type="file"
                            ref={bulkInputRef}
                            onChange={handleBulkFileChange}
                            accept=".json"
                            style={{ display: 'none' }}
                        />
                        {bulkLoading ? <Loader2 size={18} className="spin list-arrow" /> : <ChevronRight size={18} className="list-arrow" />}
                    </button>

                    <button className="list-group-item" onClick={handleImportClick} disabled={importLoading}>
                        <div className="list-icon" style={{ background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)', color: 'white' }}>
                            <Upload size={20} />
                        </div>
                        <div className="list-content">
                            <span className="list-label">Restore Data</span>
                            <span className="list-desc">Import and overwrite ALL data</span>
                        </div>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept=".json"
                            style={{ display: 'none' }}
                        />
                        {importLoading ? <Loader2 size={18} className="spin list-arrow" /> : <ChevronRight size={18} className="list-arrow" />}
                    </button>
                </div>
            </section>

            <button className="btn-logout" onClick={handleLogout}>
                <LogOut size={18} />
                Log Out
            </button>

            {/* Bulk Insert Results Modal */}
            {bulkResults && (
                <div className="modal-overlay" onClick={() => {
                    if (bulkResults.summary.isDryRun) {
                        setBulkResults(null);
                        setPendingBulkData(null);
                    } else {
                        setBulkResults(null);
                    }
                }}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{bulkResults.summary.isDryRun ? 'Review Transactions' : 'Import Results'}</h2>
                            <button className="btn-icon btn-ghost" onClick={() => {
                                setBulkResults(null);
                                setPendingBulkData(null);
                            }}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-body">
                            {bulkResults.summary.isDryRun && (
                                <p style={{ color: 'var(--text-secondary)', marginBottom: '16px', fontSize: '14px' }}>
                                    Found {bulkResults.summary.total} transactions. Review the breakdown below before merging.
                                </p>
                            )}
                            <div className="import-summary-grid">
                                <div className="summary-stat">
                                    <span className="stat-label">Total</span>
                                    <span className="stat-value">{bulkResults.summary.total}</span>
                                </div>
                                <div className="summary-stat">
                                    <span className="stat-label">New</span>
                                    <span className="stat-value text-success">{bulkResults.summary.added}</span>
                                </div>
                                <div className="summary-stat">
                                    <span className="stat-label">Skipped</span>
                                    <span className="stat-value text-muted">{bulkResults.summary.skipped}</span>
                                </div>
                            </div>

                            <div className="results-list">
                                {bulkResults.results.slice(0, 100).map((res, i) => (
                                    <div key={i} className={`result-item ${res.status}`}>
                                        <div className="result-info">
                                            <div className="result-merchant">{res.merchant || 'Unnamed'}</div>
                                            <div className="result-meta">
                                                {res.date.split('T')[0]} · {formatCurrency(res.amount)}
                                            </div>
                                        </div>
                                        <div className="result-status">
                                            {res.status === 'added' ? (
                                                <span className="badge success">{bulkResults.summary.isDryRun ? 'Will Add' : 'New'}</span>
                                            ) : (
                                                <span className="badge muted">Already in DB</span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {bulkResults.results.length > 100 && (
                                    <div className="results-more">...and {bulkResults.results.length - 100} more</div>
                                )}
                            </div>
                        </div>
                        <div className="modal-actions">
                            {bulkResults.summary.isDryRun ? (
                                <>
                                    <button className="btn btn-ghost" onClick={() => {
                                        setBulkResults(null);
                                        setPendingBulkData(null);
                                    }} style={{ flex: 1 }}>Cancel</button>
                                    <button
                                        className="btn btn-primary"
                                        onClick={handleFinalBulkMerge}
                                        style={{ flex: 2 }}
                                        disabled={bulkLoading || bulkResults.summary.added === 0}
                                    >
                                        {bulkLoading ? <Loader2 size={18} className="spin" /> : `Merge ${bulkResults.summary.added} Transactions`}
                                    </button>
                                </>
                            ) : (
                                <button className="btn btn-primary" onClick={() => setBulkResults(null)} style={{ width: '100%' }}>Done</button>
                            )}
                        </div>
                    </div>
                </div>
            )}
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
                    <div className="pref-info-box" style={{ marginTop: '32px', padding: '16px', borderRadius: '12px', background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)' }}>
                        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                            <AlertTriangle size={14} style={{ marginRight: '6px', verticalAlign: 'middle', color: 'var(--warning-yellow)' }} />
                            Changing these will refresh the page to apply new formatting.
                        </p>
                    </div>
                </div>
            );
        } else {
            content = getSectionData().map((item) => (
                <div key={item.id} className={`detail-item ${!item.is_active ? 'archived' : ''}`}>
                    <div className="item-info">
                        <span className="item-name">{item.name}</span>
                        {!item.is_active && <span className="badge-archived">Archived</span>}
                    </div>
                    <div className="item-actions">
                        <button className="btn-icon-sm" onClick={() => openEdit(item)}>
                            <Edit2 size={18} />
                        </button>
                        {item.is_active && (
                            <button className="btn-icon-sm danger" onClick={() => handleArchive(item)}>
                                <Archive size={18} />
                            </button>
                        )}
                    </div>
                </div>
            ));
        }

        return (
            <div className="settings-detail animate-slide-up">
                <div className="detail-header-bar">
                    <button className="btn-back" onClick={() => setActiveSection(null)}>
                        <ChevronRight size={24} style={{ transform: 'rotate(180deg)' }} />
                    </button>
                    <h2>{getSectionTitle()}</h2>
                    {activeSection !== 'preferences' && (
                        <button className="btn-add-circle" onClick={openAdd}>
                            <Plus size={24} />
                        </button>
                    )}
                </div>

                <div className="items-list-container">
                    {content}
                </div>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="page settings-page centered">
                <div className="loader-spinner"></div>
            </div>
        );
    }

    return (
        <div className="page settings-page">
            {!activeSection && (
                <header className="settings-header">
                    <div className="header-greeting">
                        <div className="user-avatar-lg">{user?.username?.[0]?.toUpperCase() || '?'}</div>
                        <div>
                            <h1>Settings</h1>
                            <p className="text-gradient">Personalize your experience</p>
                        </div>
                    </div>
                </header>
            )}

            {activeSection ? renderDetailView() : renderMenuGrid()}

            {/* --- MODALS --- */}

            {showForm && (
                <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowForm(false)}>
                    <div className="modal">
                        <div className="modal-header">
                            <h2>{editingItem ? 'Edit' : 'New'} {getSectionTitle().slice(0, -1)}</h2>
                            <button className="btn-icon btn-ghost" onClick={() => setShowForm(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <label className="input-label">Name</label>
                            <input
                                type="text"
                                className="input"
                                value={formName}
                                onChange={(e) => setFormName(e.target.value)}
                                placeholder={`Enter ${getSectionTitle().slice(0, -1).toLowerCase()} name...`}
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
                            <button className="btn-icon btn-ghost" onClick={() => setShowChangePin(false)}>
                                <X size={20} />
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
                                    {/* Current PIN */}
                                    <div className="pin-group">
                                        <label className="input-label">Current PIN</label>
                                        <div
                                            className={`pin-dots-input ${activePinField === 'current' ? 'active' : ''}`}
                                            onClick={() => { setActivePinField('current'); pinInputRef.current?.focus(); }}
                                        >
                                            {renderPinDots(currentPin)}
                                        </div>
                                    </div>

                                    {/* New PIN */}
                                    <div className="pin-group">
                                        <label className="input-label">New PIN</label>
                                        <div
                                            className={`pin-dots-input ${activePinField === 'new' ? 'active' : ''}`}
                                            onClick={() => { setActivePinField('new'); pinInputRef.current?.focus(); }}
                                        >
                                            {renderPinDots(newPin)}
                                        </div>
                                    </div>

                                    {/* Confirm PIN */}
                                    <div className="pin-group">
                                        <label className="input-label">Confirm New PIN</label>
                                        <div
                                            className={`pin-dots-input ${activePinField === 'confirm' ? 'active' : ''}`}
                                            onClick={() => { setActivePinField('confirm'); pinInputRef.current?.focus(); }}
                                        >
                                            {renderPinDots(confirmPin)}
                                        </div>
                                    </div>

                                    {/* Hidden Input Controller */}
                                    <input
                                        ref={pinInputRef}
                                        type="password"
                                        inputMode="numeric"
                                        className="hidden-controller"
                                        maxLength={6}
                                        value={
                                            activePinField === 'current' ? currentPin :
                                                activePinField === 'new' ? newPin : confirmPin
                                        }
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
                            <button
                                className="btn btn-primary"
                                onClick={confirmImport}
                                disabled={importLoading}
                                style={{ flex: 1, background: 'var(--expense-red)', boxShadow: '0 0 20px var(--expense-red-glow)' }}
                            >
                                {importLoading ? <Loader2 size={18} className="spin" /> : 'Yes, Overwrite'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Bulk Insert Guide Modal */}
            {showBulkGuide && (
                <div className="modal-overlay" onClick={() => setShowBulkGuide(false)}>
                    <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div className="icon-circle" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10B981' }}>
                                    <FileJson size={20} />
                                </div>
                                <h2>Bulk Insert Guide</h2>
                            </div>
                            <button className="btn-icon btn-ghost" onClick={() => setShowBulkGuide(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
                                To merge transactions, upload a JSON file containing an array of objects. 
                                You can use <strong>internal IDs</strong> or <strong>readable names</strong> for categories and groups.
                            </p>

                            <div className="format-example-container">
                                <div className="example-header">
                                    <span>JSON Format Example</span>
                                    <button className="btn-copy-example" onClick={() => {
                                        const example = [
                                            {
                                                "type": "expense",
                                                "amount": 50000,
                                                "date": new Date().toISOString(),
                                                "merchant": "Starbucks",
                                                "category_name": "Food & Drinks",
                                                "group_name": "Personal",
                                                "payment_method_name": "Cash",
                                                "note": "Morning coffee"
                                            }
                                        ];
                                        navigator.clipboard.writeText(JSON.stringify(example, null, 2));
                                        alert('Copied to clipboard!');
                                    }}>
                                        <Copy size={14} /> Copy
                                    </button>
                                </div>
                                <pre className="code-block">
{`[
  {
    "type": "expense",
    "amount": 50000,
    "date": "2026-03-22T10:00:00Z",
    "merchant": "Starbucks",
    "category_name": "Food & Drinks",
    "group_name": "Personal",
    "payment_method_name": "Cash",
    "note": "Morning coffee"
  },
  ...
]`}
                                </pre>
                            </div>

                            <div className="info-box-v2" style={{ marginTop: '20px' }}>
                                <Info size={18} />
                                <div>
                                    <strong>Safe Merge</strong>
                                    <p>The system automatically skips transactions that already exist in your database to prevent duplicates.</p>
                                </div>
                            </div>
                        </div>
                        <div className="modal-actions">
                            <button className="btn btn-ghost" onClick={() => setShowBulkGuide(false)} style={{ flex: 1 }}>Cancel</button>
                            <button className="btn btn-primary" onClick={triggerBulkFileSelect} style={{ flex: 2 }}>
                                Select JSON File
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
