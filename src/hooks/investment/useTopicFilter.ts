'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

export interface UseTopicFilterResult {
    activeTopic: string | null;
    setTopic: (topicId: string) => void;
    clearTopic: () => void;
}

export function useTopicFilter(): UseTopicFilterResult {
    const router = useRouter();
    const searchParams = useSearchParams();
    const activeTopic = searchParams.get('topic');

    const setTopic = useCallback((topicId: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('topic', topicId);
        router.push(`?${params.toString()}`);
    }, [router, searchParams]);

    const clearTopic = useCallback(() => {
        const params = new URLSearchParams(searchParams.toString());
        params.delete('topic');
        router.push(`?${params.toString()}`);
    }, [router, searchParams]);

    return { activeTopic, setTopic, clearTopic };
}
