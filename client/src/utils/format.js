const DEFAULT_LOCALE = typeof window !== 'undefined' ? (localStorage.getItem('ft_locale') || 'id-ID') : 'id-ID';
const DEFAULT_CURRENCY = typeof window !== 'undefined' ? (localStorage.getItem('ft_currency') || 'IDR') : 'IDR';

export function formatCurrency(amount, options = {}) {
    const { 
        showSymbol = true, 
        compact = false, 
        abs = false,
        locale = DEFAULT_LOCALE,
        currency = DEFAULT_CURRENCY
    } = options;

    const value = abs ? Math.abs(amount) : amount;
    
    const formatter = new Intl.NumberFormat(locale, {
        style: showSymbol ? 'currency' : 'decimal',
        currency: currency,
        notation: compact ? 'compact' : 'standard',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    });

    return formatter.format(value);
}

export function formatNumber(amount, locale = DEFAULT_LOCALE) {
    return new Intl.NumberFormat(locale).format(amount);
}

export function getCurrencySymbol(locale = DEFAULT_LOCALE, currency = DEFAULT_CURRENCY) {
    return (0).toLocaleString(locale, {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).replace(/\d/g, '').trim();
}
