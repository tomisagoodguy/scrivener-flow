'use client';

import { AccessibilityContext, useAccessibilityProvider } from '@/hooks/useAccessibility';

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
    const value = useAccessibilityProvider();
    return <AccessibilityContext.Provider value={value}>{children}</AccessibilityContext.Provider>;
}
