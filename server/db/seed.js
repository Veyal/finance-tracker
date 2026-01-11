import db from './database.js';
import { randomUUID } from 'crypto';

// Get the first user (or create a demo user if none exists)
let user = db.prepare('SELECT id FROM users LIMIT 1').get();

if (!user) {
    console.log('No user found. Please register a user first via the app.');
    process.exit(1);
}

const userId = user.id;
console.log(`Using user ID: ${userId}`);

// Get existing categories or create new ones
let existingCategories = db.prepare('SELECT id, name FROM categories WHERE user_id = ?').all(userId);
const categoryIds = {};

if (existingCategories.length === 0) {
    const categories = [
        { name: 'Food & Dining', type: 'expense' },
        { name: 'Transportation', type: 'expense' },
        { name: 'Shopping', type: 'expense' },
        { name: 'Entertainment', type: 'expense' },
        { name: 'Utilities', type: 'expense' },
        { name: 'Healthcare', type: 'expense' },
        { name: 'Salary', type: 'income' },
        { name: 'Freelance', type: 'income' },
    ];

    const insertCategory = db.prepare(`
        INSERT INTO categories (id, user_id, name, type, is_active)
        VALUES (?, ?, ?, ?, 1)
    `);

    for (const cat of categories) {
        const id = randomUUID();
        insertCategory.run(id, userId, cat.name, cat.type);
        categoryIds[cat.name] = id;
    }
    console.log('✓ Categories created');
} else {
    for (const cat of existingCategories) {
        categoryIds[cat.name] = cat.id;
    }
    console.log('✓ Using existing categories');
}

// Get existing groups or create new ones
let existingGroups = db.prepare('SELECT id, name FROM groups WHERE user_id = ?').all(userId);
const groupIds = {};

if (existingGroups.length === 0) {
    const groups = ['Personal', 'Work', 'Family'];
    const insertGroup = db.prepare(`
        INSERT INTO groups (id, user_id, name, is_active)
        VALUES (?, ?, ?, 1)
    `);

    for (const name of groups) {
        const id = randomUUID();
        insertGroup.run(id, userId, name);
        groupIds[name] = id;
    }
    console.log('✓ Groups created');
} else {
    for (const group of existingGroups) {
        groupIds[group.name] = group.id;
    }
    console.log('✓ Using existing groups');
}

// Get existing payment methods or create new ones
let existingPaymentMethods = db.prepare('SELECT id, name FROM payment_methods WHERE user_id = ?').all(userId);
const paymentMethodIds = {};

if (existingPaymentMethods.length === 0) {
    const paymentMethods = ['Cash', 'Credit Card', 'Debit Card', 'E-Wallet', 'Bank Transfer'];
    const insertPaymentMethod = db.prepare(`
        INSERT INTO payment_methods (id, user_id, name, is_active)
        VALUES (?, ?, ?, 1)
    `);

    for (const name of paymentMethods) {
        const id = randomUUID();
        insertPaymentMethod.run(id, userId, name);
        paymentMethodIds[name] = id;
    }
    console.log('✓ Payment methods created');
} else {
    for (const pm of existingPaymentMethods) {
        paymentMethodIds[pm.name] = pm.id;
    }
    console.log('✓ Using existing payment methods');
}

// Create sample transactions for the past 7 days including today
const today = new Date();
const insertTransaction = db.prepare(`
    INSERT INTO transactions (id, user_id, type, amount, date, category_id, group_id, payment_method_id, merchant, note)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const expenseTemplates = [
    { merchant: 'Warung Makan', category: 'Food & Dining', amount: [25000, 50000], note: 'Lunch' },
    { merchant: 'Indomaret', category: 'Shopping', amount: [15000, 75000], note: 'Groceries' },
    { merchant: 'Grab', category: 'Transportation', amount: [20000, 45000], note: 'Ride to office' },
    { merchant: 'GoFood', category: 'Food & Dining', amount: [30000, 80000], note: 'Dinner delivery' },
    { merchant: 'Starbucks', category: 'Food & Dining', amount: [45000, 85000], note: 'Coffee' },
    { merchant: 'Cinema XXI', category: 'Entertainment', amount: [50000, 100000], note: 'Movie night' },
    { merchant: 'Apotek', category: 'Healthcare', amount: [25000, 150000], note: 'Medicine' },
    { merchant: 'PLN', category: 'Utilities', amount: [200000, 400000], note: 'Electricity bill' },
    { merchant: 'Tokopedia', category: 'Shopping', amount: [50000, 300000], note: 'Online shopping' },
    { merchant: 'Gojek', category: 'Transportation', amount: [15000, 35000], note: 'Ojek' },
];

const incomeTemplates = [
    { category: 'Salary', amount: [5000000, 8000000], merchant: 'Company', note: 'Monthly salary' },
    { category: 'Freelance', amount: [500000, 2000000], merchant: 'Client', note: 'Freelance project' },
];

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomElement(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function formatDate(date) {
    return date.toISOString().split('T')[0] + ' ' +
        date.toTimeString().split(' ')[0];
}

const groupNames = Object.keys(groupIds);
const paymentMethodNames = Object.keys(paymentMethodIds);

let transactionCount = 0;

// Generate transactions for the past 7 days including today
for (let daysAgo = 6; daysAgo >= 0; daysAgo--) {
    const date = new Date(today);
    date.setDate(date.getDate() - daysAgo);

    // Generate 3-6 expense transactions per day
    const numExpenses = randomInt(3, 6);
    for (let i = 0; i < numExpenses; i++) {
        const template = randomElement(expenseTemplates);
        const amount = randomInt(template.amount[0], template.amount[1]);
        const group = randomElement(groupNames);
        const paymentMethod = randomElement(paymentMethodNames);

        // Set random time during the day
        date.setHours(randomInt(7, 22), randomInt(0, 59), 0, 0);

        const catId = categoryIds[template.category];
        if (!catId) {
            console.log(`Skipping expense: category "${template.category}" not found`);
            continue;
        }

        insertTransaction.run(
            randomUUID(),
            userId,
            'expense',
            amount,
            formatDate(date),
            catId,
            groupIds[group],
            paymentMethodIds[paymentMethod],
            template.merchant,
            template.note
        );
        transactionCount++;
    }

    // Generate 0-1 income transaction per day (more likely on certain days)
    if (daysAgo === 0 || Math.random() < 0.2) {
        const template = randomElement(incomeTemplates);
        const amount = randomInt(template.amount[0], template.amount[1]);

        date.setHours(randomInt(9, 17), randomInt(0, 59), 0, 0);

        const catId = categoryIds[template.category];
        if (!catId) {
            console.log(`Skipping income: category "${template.category}" not found`);
            continue;
        }

        insertTransaction.run(
            randomUUID(),
            userId,
            'income',
            amount,
            formatDate(date),
            catId,
            null, // group_id
            paymentMethodIds['Bank Transfer'] || randomElement(Object.values(paymentMethodIds)),
            template.merchant,
            template.note
        );
        transactionCount++;
    }
}

console.log(`✓ ${transactionCount} transactions created`);
console.log('\n🎉 Sample data generated successfully!');
console.log('Refresh your browser to see the data.');
