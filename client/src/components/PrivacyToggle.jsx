import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';
import { usePrivacy } from '../context/PrivacyContext';
import { useHaptics } from '../hooks/useHaptics';
import './PrivacyToggle.css';

export default function PrivacyToggle({ className = '', style = {} }) {
    const { isPrivacyMode, togglePrivacy } = usePrivacy();
    const { triggerImpact } = useHaptics();

    const handleToggle = () => {
        triggerImpact('medium');
        togglePrivacy();
    };

    return (
        <motion.button
            type="button"
            className={`privacy-toggle ${isPrivacyMode ? 'active' : ''} ${className}`}
            onClick={handleToggle}
            title={isPrivacyMode ? "Show Amounts" : "Hide Amounts"}
            style={style}
            whileTap={{ scale: 0.9 }}
        >
            <AnimatePresence mode="wait" initial={false}>
                {isPrivacyMode ? (
                    <motion.div
                        key="off"
                        initial={{ scale: 0, rotate: -90 }}
                        animate={{ scale: 1, rotate: 0 }}
                        exit={{ scale: 0, rotate: 90 }}
                        transition={{ duration: 0.15 }}
                        className="privacy-icon"
                    >
                        <EyeOff size={18} />
                    </motion.div>
                ) : (
                    <motion.div
                        key="on"
                        initial={{ scale: 0, rotate: 90 }}
                        animate={{ scale: 1, rotate: 0 }}
                        exit={{ scale: 0, rotate: -90 }}
                        transition={{ duration: 0.15 }}
                        className="privacy-icon"
                    >
                        <Eye size={18} />
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.button>
    );
}
