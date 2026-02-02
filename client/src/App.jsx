import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navigation from './components/Navigation';
import InstallPWA from './components/InstallPWA';
import PWAUpdater from './components/PWAUpdater';
import PageTransition from './components/PageTransition';
import LoginPage from './pages/LoginPage';
import TodayPage from './pages/TodayPage';
import TransactionsPage from './pages/TransactionsPage';
import CalendarPage from './pages/CalendarPage';
import InsightsPage from './pages/InsightsPage';
import LendingPage from './pages/LendingPage';
import SavingsPage from './pages/SavingsPage';
import SettingsPage from './pages/SettingsPage';

function ProtectedRoute({ children }) {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="loader" style={{ height: '100vh' }}>
                <div className="loader-spinner"></div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    return children;
}

function AppRoutes() {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div className="loader" style={{ height: '100vh' }}>
                <div className="loader-spinner"></div>
            </div>
        );
    }

    return (
        <>
            {user && <Navigation />}
            <InstallPWA />
            <PWAUpdater />
            <AnimatePresence mode="wait">
                <Routes location={location} key={location.pathname}>
                    <Route path="/login" element={user ? <Navigate to="/" replace /> : <PageTransition><LoginPage /></PageTransition>} />
                    <Route path="/" element={
                        <ProtectedRoute>
                            <PageTransition>
                                <TodayPage />
                            </PageTransition>
                        </ProtectedRoute>
                    } />
                    <Route path="/transactions" element={
                        <ProtectedRoute>
                            <PageTransition>
                                <TransactionsPage />
                            </PageTransition>
                        </ProtectedRoute>
                    } />
                    <Route path="/calendar" element={
                        <ProtectedRoute>
                            <PageTransition>
                                <CalendarPage />
                            </PageTransition>
                        </ProtectedRoute>
                    } />
                    <Route path="/insights" element={
                        <ProtectedRoute>
                            <PageTransition>
                                <InsightsPage />
                            </PageTransition>
                        </ProtectedRoute>
                    } />
                    <Route path="/split" element={
                        <ProtectedRoute>
                            <PageTransition>
                                <LendingPage />
                            </PageTransition>
                        </ProtectedRoute>
                    } />
                    <Route path="/savings" element={
                        <ProtectedRoute>
                            <PageTransition>
                                <SavingsPage />
                            </PageTransition>
                        </ProtectedRoute>
                    } />
                    <Route path="/settings" element={
                        <ProtectedRoute>
                            <PageTransition>
                                <SettingsPage />
                            </PageTransition>
                        </ProtectedRoute>
                    } />
                </Routes>
            </AnimatePresence>
        </>
    );
}

export default function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <AppRoutes />
            </AuthProvider>
        </BrowserRouter>
    );
}
