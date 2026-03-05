import { useState, useEffect, useCallback } from 'react';

export interface Secret {
    id: string;
    name: string;
    created_at: string;
    updated_at: string;
}

export function useSecrets() {
    const [secrets, setSecrets] = useState<Secret[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchSecrets = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await fetch('/api/secrets');

            if (!response.ok) {
                throw new Error('Failed to fetch secrets');
            }

            const json = await response.json();
            if (json.success) {
                setSecrets(json.data || []);
            } else {
                throw new Error(json.error || 'Failed to fetch secrets');
            }
        } catch (err: any) {
            setError(err.message);
            console.error('Error fetching secrets:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSecrets();
    }, [fetchSecrets]);

    const createSecret = async (name: string, value: string) => {
        try {
            const response = await fetch('/api/secrets', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name, value })
            });

            const json = await response.json();
            if (!response.ok || !json.success) {
                throw new Error(json.error || 'Failed to create secret');
            }

            await fetchSecrets();
            return json.data;
        } catch (err: any) {
            console.error('Error creating secret:', err);
            throw err;
        }
    };

    const deleteSecret = async (id: string) => {
        try {
            const response = await fetch(`/api/secrets/${id}`, {
                method: 'DELETE'
            });
            const data = await response.json();
            if (!response.ok || !data.success) throw new Error(data.error || 'Failed to delete secret');

            setSecrets(secrets.filter(s => s.id !== id));
        } catch (err: any) {
            console.error('Error deleting secret:', err);
            throw err;
        }
    };

    const revealSecret = async (id: string): Promise<string> => {
        try {
            const response = await fetch(`/api/secrets/${id}/reveal`);
            const data = await response.json();
            if (!response.ok || !data.success) throw new Error(data.error || 'Failed to reveal secret');
            return data.value;
        } catch (err: any) {
            console.error('Error revealing secret:', err);
            throw err;
        }
    };

    return { secrets, loading, error, fetchSecrets, createSecret, deleteSecret, revealSecret };
}
