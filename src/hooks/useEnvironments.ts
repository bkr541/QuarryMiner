import { useState, useCallback } from 'react';

export type MatchType = 'exact' | 'suffix' | 'wildcard' | 'regex';

export interface Environment {
    id: string;
    user_id: string;
    name: string;
    match_host: string;
    match_type: MatchType;
    match_path_regex: string | null;
    priority: number;
    default_wait_selector: string | null;
    default_scroll_count: number;
    default_formats: string[];
    default_headers: Record<string, any>;
    cookie_jar: Record<string, any> | null;
    proxy_profile_id: string | null;
    notes: string | null;
    created_at: string;
    updated_at: string;
}

export const useEnvironments = () => {
    const [environments, setEnvironments] = useState<Environment[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchEnvironments = useCallback(async (search = '', matchType = 'All') => {
        setLoading(true);
        setError(null);
        try {
            const query = new URLSearchParams();
            if (search) query.append('search', search);
            if (matchType !== 'All') query.append('matchType', matchType);

            const res = await fetch(`/api/environments?${query.toString()}`);
            if (!res.ok) throw new Error('Failed to fetch environments');
            const json = await res.json();
            if (!json.success) throw new Error(json.error);
            setEnvironments(json.data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    const createEnvironment = async (data: Partial<Environment>) => {
        const res = await fetch(`/api/environments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!res.ok) {
            const errJson = await res.json().catch(() => ({}));
            throw new Error(errJson.error || 'Failed to create environment');
        }
        const json = await res.json();
        await fetchEnvironments();
        return json.data;
    };

    const updateEnvironment = async (id: string, data: Partial<Environment>) => {
        const res = await fetch(`/api/environments/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!res.ok) {
            const errJson = await res.json().catch(() => ({}));
            throw new Error(errJson.error || 'Failed to update environment');
        }
        const json = await res.json();
        await fetchEnvironments();
        return json.data;
    };

    const deleteEnvironment = async (id: string) => {
        const res = await fetch(`/api/environments/${id}`, {
            method: 'DELETE',
        });
        if (!res.ok) {
            const errJson = await res.json().catch(() => ({}));
            throw new Error(errJson.error || 'Failed to delete environment');
        }
        await fetchEnvironments();
    };

    return {
        environments,
        loading,
        error,
        fetchEnvironments,
        createEnvironment,
        updateEnvironment,
        deleteEnvironment
    };
};
