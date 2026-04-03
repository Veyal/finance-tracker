// ─── Helpers ────────────────────────────────────────────────────────────────

export function cleanAmount(str) {
    if (!str || str === 'Unknown') return 0;
    let s = str.replace(/[^\d,.]/g, '');
    if (s.includes('.') && s.includes(',')) {
        s = s.lastIndexOf('.') > s.lastIndexOf(',')
            ? s.replace(/,/g, '')
            : s.replace(/\./g, '').replace(',', '.');
    } else if (s.includes(',')) {
        const parts = s.split(',');
        s = parts[parts.length - 1].length === 2
            ? s.replace(/\./g, '').replace(',', '.')
            : s.replace(/,/g, '');
    } else if (s.includes('.')) {
        const last = s.split('.').pop();
        if (last.length !== 2) s = s.replace(/\./g, '');
    }
    return parseFloat(s) || 0;
}

export function normalizeDate(dateStr, bank) {
    if (!dateStr || dateStr === 'Unknown') {
        return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
    }
    try {
        let dt;
        if (bank === 'MAYBANK') {
            // "25 Mar 26 14:30"
            dt = new Date(dateStr.replace(
                /^(\d{2}) (\w{3}) (\d{2}) (\d{2}:\d{2})$/,
                (_, d, m, y, t) => `20${y}-${m}-${d}T${t}:00`
            ));
        } else if (bank === 'CIMB') {
            // "2026-03-25/14:30:00"
            dt = new Date(dateStr.replace('/', 'T'));
        } else if (bank === 'MEGA') {
            // "25/03/26 14:30"
            const [dp, tp] = dateStr.split(' ');
            const [d, m, y] = dp.split('/');
            dt = new Date(`20${y}-${m}-${d}T${tp}:00`);
        } else if (bank === 'BCA') {
            // "25 Mar 2026 14:30:00"
            dt = new Date(dateStr);
        } else if (bank === 'SEABANK') {
            // "25 Mar 2026 14:30"
            dt = new Date(`${dateStr}:00`);
        } else {
            return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
        }
        if (isNaN(dt.getTime())) throw new Error('invalid');
        return dt.toISOString().replace(/\.\d{3}Z$/, 'Z');
    } catch {
        return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
    }
}

const MERCHANT_RENAMES = {
    'PAPER.ID': 'member hotel tentrem',
    '9441 ESB Restaurant OM On Us QRD 081666': 'tai ho jiak',
    '9441 VENUE STADION  OM On Us QRS 969715': 'tiket kolam',
    '9441 A Chai - Kweti OM On Us QRS 655203': 'kwetiau achai',
};

export function applyMerchantRenames(merchant) {
    return MERCHANT_RENAMES[merchant] ?? merchant;
}

// ─── Body extraction ────────────────────────────────────────────────────────

function extractBody(payload) {
    if (payload.parts) {
        for (const part of payload.parts) {
            const b = extractBody(part);
            if (b) return b;
        }
    }
    if (['text/plain', 'text/html'].includes(payload.mimeType) && payload.body?.data) {
        return atob(payload.body.data.replace(/-/g, '+').replace(/_/g, '/'));
    }
    return '';
}

function bodyToText(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const walker = document.createTreeWalker(doc.body || doc.documentElement, NodeFilter.SHOW_TEXT);
    const parts = [];
    let node;
    while ((node = walker.nextNode())) {
        const t = node.textContent.trim();
        if (t) parts.push(t);
    }
    return parts.join('|');
}

// ─── Bank parsers ────────────────────────────────────────────────────────────

function parseMaybank(text) {
    const d = { bank: 'MAYBANK', card: 'Unknown', merchant: 'Unknown', time: 'Unknown', currency: 'IDR', amount: 'Unknown', type: 'expense' };
    const parts = text.split('|').map(p => p.trim()).filter(Boolean);
    for (let i = 0; i < parts.length; i++) {
        if (i + 3 >= parts.length) continue;
        if (parts[i] === 'Nomor Kartu')        d.card     = parts[i + 3];
        else if (parts[i] === 'Merchant')       d.merchant = parts[i + 3];
        else if (parts[i] === 'Waktu Transaksi') d.time    = parts[i + 3];
        else if (parts[i] === 'Mata Uang')      d.currency = parts[i + 3];
        else if (parts[i] === 'Jumlah')         d.amount   = parts[i + 3].replace(/\n/g, '').trim();
    }
    return d;
}

function parseCimb(text) {
    const d = { bank: 'CIMB', card: 'Unknown', merchant: 'Unknown', time: 'Unknown', currency: 'IDR', amount: 'Unknown', type: 'expense' };
    const parts = text.split('|').map(p => p.trim()).filter(Boolean);
    for (let i = 0; i < parts.length; i++) {
        if (i + 2 >= parts.length) continue;
        const val = parts[i + 2];
        if (parts[i].includes('No. Kartu Kredit'))           d.card = val;
        else if (parts[i].includes('Jumlah Transaksi')) {
            const m = val.match(/([\d,.]+)\s+([A-Z]{3})/);
            if (m) { d.amount = m[1]; d.currency = m[2]; } else d.amount = val;
        }
        else if (parts[i].includes('Tanggal/Waktu Transaksi')) d.time     = val;
        else if (parts[i].includes('Nama Merchant'))           d.merchant = val;
    }
    return d;
}

function parseMega(text) {
    const d = { bank: 'MEGA', card: 'Unknown', merchant: 'Unknown', time: 'Unknown', currency: 'Unknown', amount: 'Unknown', type: 'expense' };
    const parts = text.split('|').map(p => p.trim()).filter(Boolean);
    for (let i = 0; i < parts.length; i++) {
        if (i + 1 >= parts.length) continue;
        const val = parts[i + 1].replace(': ', '').trim();
        if (parts[i].includes('No. Kartu'))           d.card     = val;
        else if (parts[i].includes('Merchant'))        d.merchant = val;
        else if (parts[i].includes('Waktu Transaksi')) d.time     = val;
        else if (parts[i].includes('Total Transaksi')) {
            const m = val.match(/([A-Z]{3})\s+([\d,.]+)/);
            if (m) { d.currency = m[1]; d.amount = m[2]; } else d.amount = val;
        }
    }
    return d;
}

function parseBca(text) {
    const d = { bank: 'BCA', card: 'Unknown', merchant: 'Unknown', time: 'Unknown', currency: 'IDR', amount: 'Unknown', type: 'expense' };
    const parts = text.split('|').map(p => p.trim()).filter(Boolean);
    for (let i = 0; i < parts.length; i++) {
        if (i + 2 >= parts.length) continue;
        const val = parts[i + 2];
        if (parts[i].includes('Source of Fund'))                              d.card     = val;
        else if (parts[i].includes('Transaction Date'))                       d.time     = val;
        else if (parts[i] === 'Payment to')                                   d.merchant = val;
        else if (parts[i].includes('Transfer Type'))                          d.merchant = val;
        else if (parts[i].includes('Transaction Type') && d.merchant === 'Unknown') d.merchant = val;
        else if (parts[i].includes('Total Payment')) {
            const m = val.match(/([A-Z]{3})\s+([\d,.]+)/);
            if (m) { d.currency = m[1]; d.amount = m[2]; } else d.amount = val;
        }
        else if (parts[i].includes('Amount') && d.amount === 'Unknown') {
            const m = val.match(/([A-Z]{3})\s+([\d,.]+)/);
            if (m) { d.currency = m[1]; d.amount = m[2]; } else d.amount = val;
        }
    }
    if (d.merchant === 'Unknown') {
        for (let i = 0; i < parts.length; i++) {
            if (parts[i].includes('Beneficiary Name') && i + 2 < parts.length) {
                d.merchant = `Transfer to ${parts[i + 2]}`;
                break;
            }
        }
    }
    if (d.merchant === 'Unknown') d.merchant = 'BCA Transaction';
    return d;
}

function parseSeabank(text) {
    const d = { bank: 'SEABANK', card: 'Unknown', merchant: 'Unknown', time: 'Unknown', currency: 'IDR', amount: 'Unknown', type: 'expense' };
    const isIncoming = text.toLowerCase().includes('menerima transfer masuk');
    if (isIncoming) d.type = 'income';

    const parts = text.split('|').map(p => p.trim()).filter(Boolean);
    for (let i = 0; i < parts.length; i++) {
        if (i + 1 >= parts.length) continue;
        const val = parts[i + 1].replace(/^:\s*/, '').trim();
        if (parts[i].includes('Waktu Transaksi'))                     d.time     = val;
        else if (parts[i].includes('Nama Merchant'))                  d.merchant = val;
        else if (parts[i].includes('Nama Pengirim') && isIncoming)   d.merchant = val;
        else if (parts[i].includes('Nama Penerima') && !isIncoming)  d.merchant = val;
        else if (parts[i].includes('Jumlah')) {
            const m = val.match(/(?:Rp\s*)?([\d,.]+)/);
            if (m) d.amount = m[1];
        }
        else if (parts[i].includes('Transfer Dari')) {
            const m = val.match(/(\d{4})$/);
            d.card = m ? m[1] : val;
        }
    }
    return d;
}

// ─── Auto-matching ────────────────────────────────────────────────────────────

const KEYWORD_MAP = {
    food:          ['latteria', 'taeyang', 'seeng kee', 'roti o', 'harvest', 'borngalbi', 'boost juice', 'shaburi', 'kintan', 'lim kupi', 'bintang laut', 'richeese', 'hokben', 'baskin', 'tai ho jiak', 'kwetiau', 'kapitall'],
    shopping:      ['uniqlo', 'shopee'],
    health:        ['erha', 'boulder', 'cendana sehat'],
    transport:     ['grab'],
    entertainment: ['novotel', 'mercure', 'ibis', 'tentrem', 'tiket kolam'],
};

function matchCategory(merchant, categories) {
    const m = merchant.toLowerCase();
    for (const cat of categories) {
        const n = cat.name.toLowerCase();
        if (m.includes(n) || n.includes(m)) return cat.id;
    }
    for (const [keyword, merchants] of Object.entries(KEYWORD_MAP)) {
        if (merchants.some(kw => m.includes(kw))) {
            const cat = categories.find(c => c.name.toLowerCase().includes(keyword));
            if (cat) return cat.id;
        }
    }
    return null;
}

function matchPaymentMethod(bank, card, paymentMethods) {
    const bankLower = bank.toLowerCase();
    for (const pm of paymentMethods) {
        const n = pm.name.toLowerCase();
        if (!n.includes(bankLower)) continue;
        const digits = card.replace(/\D/g, '').slice(-4);
        if (digits && n.includes(digits)) return pm.id;
        if (card === 'Unknown') return pm.id;
    }
    return null;
}

function matchGroup(merchant, groups) {
    const m = merchant.toLowerCase();
    if (m.includes('kolam')) {
        const g = groups.find(g => g.name.toLowerCase().includes('hobby'));
        if (g) return g.id;
    }
    const personal = groups.find(g => g.name.toLowerCase().includes('personal'));
    return personal?.id ?? null;
}

// ─── Main export ─────────────────────────────────────────────────────────────

export function parseMessage(message, { categories = [], groups = [], paymentMethods = [] } = {}) {
    const headers = message.payload?.headers || [];
    const from = headers.find(h => h.name.toLowerCase() === 'from')?.value || '';
    const body = extractBody(message.payload || {});
    if (!body) return null;

    const text = bodyToText(body);

    let details;
    if (from.toLowerCase().includes('maybank.co.id'))        details = parseMaybank(text);
    else if (from.toLowerCase().includes('cimbniaga.co.id')) details = parseCimb(text);
    else if (from.toLowerCase().includes('bankmega.com'))    details = parseMega(text);
    else if (from.toLowerCase().includes('bca.co.id'))       details = parseBca(text);
    else if (from.toLowerCase().includes('seabank.co.id'))   details = parseSeabank(text);
    else return null;

    details.merchant = applyMerchantRenames(details.merchant);
    const amount = cleanAmount(details.amount);
    if (amount <= 0) return null;

    return {
        type: details.type,
        amount,
        date: normalizeDate(details.time, details.bank),
        merchant: details.merchant,
        note: `Imported from ${details.bank} email`,
        category_id:       matchCategory(details.merchant, categories),
        group_id:          matchGroup(details.merchant, groups),
        payment_method_id: matchPaymentMethod(details.bank, details.card, paymentMethods),
    };
}
