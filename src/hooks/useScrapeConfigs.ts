import { useState, useCallback, useEffect } from 'react';
import { Environment } from './useEnvironments';

export interface ScrapeConfiguration {
    id: string;
    user_id: string;
    environment_id?: string | null;
    name: string;
    example_url?: string | null;
    wait_selector?: string | null;
    scroll_count?: number | null;
    formats?: string[] | null;
    extract_schema_id?: string | null;
    webhook_id?: string | null;
    options?: any | null;
    is_favorite: boolean;
    created_at: string;
    updated_at: string;

    // Joined fields from Supabase
    environment?: { id: string; name: string } | null;
    extract_schema?: { id: string; name: string } | null;
    webhook?: { id: string; name: string } | null;
}

export function useScrapeConfigs() {
    const [configs, setConfigs] = useState<ScrapeConfiguration[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchConfigs = useCallback(async (searchQuery: string = '') => {
        setLoading(true);
        setError(null);
        try {
            const url = new URL('/api/scrape_configs', window.location.origin);
            if (searchQuery) url.searchParams.append('search', searchQuery);

            const res = await fetch(url.toString());
            const data = await res.json();

            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Failed to fetch scrape configurations');
            }

            setConfigs(data.data || []);
        } catch (err: any) {
            console.error(err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    const createConfig = async (configData: Partial<ScrapeConfiguration>) => {
        try {
            const res = await fetch('/api/scrape_configs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(configData)
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.error);

            setConfigs(prev => [data.data, ...prev]);
            return data.data;
        } catch (err: any) {
            setError(err.message);
            throw err;
        }
    };

    const updateConfig = async (id: string, configData: Partial<ScrapeConfiguration>) => {
        try {
            const res = await fetch(`/api/scrape_configs/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(configData)
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.error);

            setConfigs(prev => prev.map(c => c.id === id ? data.data : c));
            return data.data;
        } catch (err: any) {
            setError(err.message);
            throw err;
        }
    };

    const deleteConfig = async (id: string) => {
        try {
            const res = await fetch(`/api/scrape_configs/${id}`, {
                method: 'DELETE'
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.error);

            setConfigs(prev => prev.filter(c => c.id !== id));
        } catch (err: any) {
            setError(err.message);
            throw err;
        }
    };

    // Initial fetch
    useEffect(() => {
        fetchConfigs();
    }, [fetchConfigs]);

    return {
        configs,
        loading,
        error,
        fetchConfigs,
        createConfig,
        updateConfig,
        deleteConfig
    };
}
