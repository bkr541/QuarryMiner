import { useState, useCallback, useEffect } from 'react';

export interface ScrapingRun {
    id: string;
    user_id: string;
    scrape_configuration_id?: string | null;
    url: string;
    status: 'success' | 'failed';
    error_message?: string | null;
    metadata?: any;
    created_at: string;
    updated_at: string;
}

export function useScrapingRuns() {
    const [runs, setRuns] = useState<ScrapingRun[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchRuns = useCallback(async (limit: number = 50) => {
        setLoading(true);
        setError(null);
        try {
            const url = new URL('/api/scraping_runs', window.location.origin);
            url.searchParams.append('limit', limit.toString());

            const res = await fetch(url.toString());
            const data = await res.json();

            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Failed to fetch scraping runs');
            }

            setRuns(data.data || []);
        } catch (err: any) {
            console.error(err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    // Initial fetch
    useEffect(() => {
        fetchRuns();
    }, [fetchRuns]);

    return {
        runs,
        loading,
        error,
        fetchRuns
    };
}
