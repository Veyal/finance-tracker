// API client for finance tracker

const API_BASE = '';

async function request(endpoint, options = {}) {
    const config = {
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
        ...options,
    };

    if (config.body && typeof config.body === 'object') {
        config.body = JSON.stringify(config.body);
    }

    const response = await fetch(`${API_BASE}${endpoint}`, config);

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'unknown_error' }));
        throw { status: response.status, ...error };
    }

    return response.json();
}

// Auth API
export const auth = {
    register: (username, pin) => request('/auth/register', {
        method: 'POST',
        body: { username, pin },
    }),

    login: (username, pin) => request('/auth/login', {
        method: 'POST',
        body: { username, pin },
    }),

    logout: () => request('/auth/logout', { method: 'POST' }),

    me: () => request('/me'),

    changePin: (currentPin, newPin) => request('/auth/change-pin', {
        method: 'POST',
        body: { currentPin, newPin },
    }),
};

// Transactions API
export const transactions = {
    list: (params = {}) => {
        const query = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                query.append(key, value);
            }
        });
        return request(`/transactions?${query}`);
    },

    create: (data) => request('/transactions', {
        method: 'POST',
        body: data,
    }),

    update: (id, data) => request(`/transactions/${id}`, {
        method: 'PATCH',
        body: data,
    }),

    delete: (id) => request(`/transactions/${id}`, { method: 'DELETE' }),

    summary: (params = {}) => {
        const query = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                query.append(key, value);
            }
        });
        return request(`/transactions/summary?${query}`);
    },

    insights: (params = {}) => {
        const query = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                query.append(key, value);
            }
        });
        return request(`/transactions/insights?${query}`);
    },

    reorder: (updates) => request('/transactions/reorder', {
        method: 'POST',
        body: { updates },
    }),
};

// Categories API
export const categories = {
    list: (active) => request(`/categories${active !== undefined ? `?active=${active}` : ''}`),
    create: (data) => request('/categories', { method: 'POST', body: data }),
    update: (id, data) => request(`/categories/${id}`, { method: 'PATCH', body: data }),
    delete: (id) => request(`/categories/${id}`, { method: 'DELETE' }),
};

// Groups API
export const groups = {
    list: (active) => request(`/groups${active !== undefined ? `?active=${active}` : ''}`),
    create: (data) => request('/groups', { method: 'POST', body: data }),
    update: (id, data) => request(`/groups/${id}`, { method: 'PATCH', body: data }),
    delete: (id) => request(`/groups/${id}`, { method: 'DELETE' }),
};

// Payment Methods API
export const paymentMethods = {
    list: (active) => request(`/payment-methods${active !== undefined ? `?active=${active}` : ''}`),
    create: (data) => request('/payment-methods', { method: 'POST', body: data }),
    update: (id, data) => request(`/payment-methods/${id}`, { method: 'PATCH', body: data }),
    delete: (id) => request(`/payment-methods/${id}`, { method: 'DELETE' }),
};

// Income Sources API
export const incomeSources = {
    list: (active) => request(`/income-sources${active !== undefined ? `?active=${active}` : ''}`),
    create: (data) => request('/income-sources', { method: 'POST', body: data }),
    update: (id, data) => request(`/income-sources/${id}`, { method: 'PATCH', body: data }),
    delete: (id) => request(`/income-sources/${id}`, { method: 'DELETE' }),
};

// Lending Sources API
export const lendingSources = {
    list: () => request('/lending'),
    create: (data) => request('/lending', { method: 'POST', body: data }),
    update: (id, data) => request(`/lending/${id}`, { method: 'PUT', body: data }),
    delete: (id) => request(`/lending/${id}`, { method: 'DELETE' }),
};
