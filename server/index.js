import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
import authRoutes from './routes/auth.js';
import transactionRoutes from './routes/transactions.js';
import categoryRoutes from './routes/categories.js';
import groupRoutes from './routes/groups.js';
import paymentMethodRoutes from './routes/payment-methods.js';
import incomeSourceRoutes from './routes/income-sources.js';
import lendingRoutes from './routes/lending.js';
import savingsRoutes from './routes/savings.js';
import dataRoutes from './routes/data.js';
import { authMiddleware } from './middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const isProduction = process.env.NODE_ENV === 'production';

// Middleware
app.use(cors({
    origin: isProduction ? false : 'http://localhost:5173',
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Public routes
app.use('/auth', authRoutes);

// Protected routes
app.use('/me', authMiddleware, (req, res) => {
    res.json({ id: req.user.id, username: req.user.username });
});
app.use('/transactions', authMiddleware, transactionRoutes);
app.use('/categories', authMiddleware, categoryRoutes);
app.use('/groups', authMiddleware, groupRoutes);
app.use('/payment-methods', authMiddleware, paymentMethodRoutes);
app.use('/income-sources', authMiddleware, incomeSourceRoutes);
app.use('/lending', authMiddleware, lendingRoutes);
app.use('/savings', authMiddleware, savingsRoutes);
app.use('/data', authMiddleware, dataRoutes);

// Error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'internal_error' });
});

// Serve static files in production
const clientDistPath = join(__dirname, '../client/dist');
if (isProduction) {
    app.use(express.static(clientDistPath));

    // Handle client-side routing - serve index.html for all non-API routes
    app.get('*', (req, res) => {
        res.sendFile(join(clientDistPath, 'index.html'));
    });
}

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    if (isProduction) {
        console.log('📦 Serving production build');
    }
});
