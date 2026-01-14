import { createContext, useContext, useState, useEffect } from 'react';

const PrivacyContext = createContext();

export function PrivacyProvider({ children }) {
    const [isPrivacyMode, setIsPrivacyMode] = useState(() => {
        return localStorage.getItem('privacy_mode') === 'true';
    });

    useEffect(() => {
        localStorage.setItem('privacy_mode', isPrivacyMode);
    }, [isPrivacyMode]);

    const togglePrivacy = () => setIsPrivacyMode(prev => !prev);

    return (
        <PrivacyContext.Provider value={{ isPrivacyMode, togglePrivacy }}>
            {children}
        </PrivacyContext.Provider>
    );
}

export function usePrivacy() {
    return useContext(PrivacyContext);
}
