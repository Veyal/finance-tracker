import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';
import useLockBodyScroll from '../hooks/useLockBodyScroll';
import './ConfirmDialog.css';

export default function ConfirmDialog({
    isOpen,
    title = 'Confirm Action',
    message = 'Are you sure?',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    variant = 'default', // 'default' | 'destructive'
    onConfirm,
    onCancel,
}) {
    // Handle escape key
    useEffect(() => {
        function handleKeyDown(e) {
            if (e.key === 'Escape' && isOpen) {
                onCancel();
            }
        }

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onCancel]);

    // Lock body scroll when open
    useLockBodyScroll(isOpen);

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="confirm-dialog-overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onCancel}
                >
                    <motion.div
                        className={`confirm-dialog ${variant}`}
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 400 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {variant === 'destructive' && (
                            <div className="confirm-dialog-icon">
                                <AlertTriangle size={28} />
                            </div>
                        )}

                        <h3 className="confirm-dialog-title">{title}</h3>
                        <p className="confirm-dialog-message">{message}</p>

                        <div className="confirm-dialog-actions">
                            <button
                                type="button"
                                className="confirm-dialog-btn cancel"
                                onClick={onCancel}
                            >
                                {cancelText}
                            </button>
                            <button
                                type="button"
                                className={`confirm-dialog-btn confirm ${variant}`}
                                onClick={onConfirm}
                            >
                                {confirmText}
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
