'use client';

import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';

interface AccessibilityContextValue {
    fontScale: number;
    isHighContrast: boolean;
    setFontScale: (scale: number) => void;
    toggleHighContrast: () => void;
}

export const AccessibilityContext = createContext<AccessibilityContextValue>({
    fontScale: 1,
    isHighContrast: false,
    setFontScale: () => {},
    toggleHighContrast: () => {},
});

export function useAccessibility() {
    return useContext(AccessibilityContext);
}

function applyFontScale(scale: number) {
    if (typeof document !== 'undefined') {
        document.documentElement.style.fontSize = scale === 1 ? '' : `${scale * 100}%`;
    }
}

export function useAccessibilityProvider(): AccessibilityContextValue {
    const [state, setState] = useState({
        fontScale: 1,
        isHighContrast: false
    });

    // Handle initialization from localStorage in a single Effect
    useEffect(() => {
        const rawScale = localStorage.getItem('accessibility-font-scale');
        const storedScale = rawScale !== null ? parseFloat(rawScale) : NaN;
        const scale = Number.isFinite(storedScale) && storedScale >= 0.6 && storedScale <= 1.2 ? storedScale : 1;
        
        const hc = localStorage.getItem('accessibility-high-contrast') === 'true';
        
        // Use a timeout to move the update to the next task, avoiding the synchronous cascading render warning
        const timer = setTimeout(() => {
            setState({
                fontScale: scale,
                isHighContrast: hc
            });

            // Apply visual side effects
            applyFontScale(scale);
            if (typeof document !== 'undefined') {
                if (hc) {
                    document.documentElement.classList.add('high-contrast');
                } else {
                    document.documentElement.classList.remove('high-contrast');
                }
            }
        }, 0);

        return () => clearTimeout(timer);
    }, []);

    const setFontScale = useCallback((scale: number) => {
        setState(prev => ({ ...prev, fontScale: scale }));
        localStorage.setItem('accessibility-font-scale', String(scale));
        applyFontScale(scale);
    }, []);

    const toggleHighContrast = useCallback(() => {
        setState(prev => {
            const next = !prev.isHighContrast;
            localStorage.setItem('accessibility-high-contrast', String(next));
            if (typeof document !== 'undefined') {
                document.documentElement.classList.toggle('high-contrast', next);
            }
            return { ...prev, isHighContrast: next };
        });
    }, []);

    // Memoize the context value to prevent unnecessary down-stream re-renders
    return useMemo(() => ({
        fontScale: state.fontScale,
        isHighContrast: state.isHighContrast,
        setFontScale,
        toggleHighContrast
    }), [state.fontScale, state.isHighContrast, setFontScale, toggleHighContrast]);
}
