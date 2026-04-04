'use client';

import { createContext, useContext, useEffect, useState } from 'react';

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
    document.documentElement.style.fontSize = scale === 1 ? '' : `${scale * 100}%`;
}

export function useAccessibilityProvider(): AccessibilityContextValue {
    const [fontScale, setFontScaleState] = useState<number>(1);
    const [isHighContrast, setIsHighContrast] = useState(false);

    useEffect(() => {
        const raw = localStorage.getItem('accessibility-font-scale');
        const stored = raw !== null ? parseFloat(raw) : NaN;
        const scale = Number.isFinite(stored) && stored >= 0.6 && stored <= 1.2 ? stored : 1;
        setFontScaleState(scale);
        applyFontScale(scale);

        const hc = localStorage.getItem('accessibility-high-contrast') === 'true';
        setIsHighContrast(hc);
        if (hc) document.documentElement.classList.add('high-contrast');
    }, []);

    const setFontScale = (scale: number) => {
        setFontScaleState(scale);
        localStorage.setItem('accessibility-font-scale', String(scale));
        applyFontScale(scale);
    };

    const toggleHighContrast = () => {
        setIsHighContrast((prev) => {
            const next = !prev;
            localStorage.setItem('accessibility-high-contrast', String(next));
            document.documentElement.classList.toggle('high-contrast', next);
            return next;
        });
    };

    return { fontScale, isHighContrast, setFontScale, toggleHighContrast };
}
