import { useState, useEffect } from 'react';

export interface SystemSettings {
    id: number;
    include_intercepted_responses: boolean;
    updated_at: string;
}

export function useSettings() {
    const [settings, setSettings] = useState<SystemSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchSettings = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/settings');
            if (!res.ok) throw new Error('Failed to fetch settings');
            const json = await res.json();
            if (!json.success) throw new Error(json.error);
            setSettings(json.data);
            setError(null);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const updateSetting = async (include_intercepted_responses: boolean) => {
        try {
            const res = await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ include_intercepted_responses })
            });
            if (!res.ok) throw new Error('Failed to update settings');
            const json = await res.json();
            if (!json.success) throw new Error(json.error);
            setSettings(json.data);
            return true;
        } catch (err: any) {
            setError(err.message);
            return false;
        }
    };

    useEffect(() => {
        fetchSettings();
    }, []);

    return { settings, loading, error, updateSetting, refetch: fetchSettings };
}
