import { useState, useEffect, useCallback } from 'react';

export interface ApiEndpoint {
    id: string;
    user_id: string;
    env_slug: string;
    resource: string;
    enabled: boolean;
    cache_ttl_seconds: number;
    require_api_key: boolean;
    request_template: any;
    response_template: any;
    created_at: string;
    updated_at: string;
}

export function useApiEndpoints() {
    const [endpoints, setEndpoints] = useState<ApiEndpoint[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchEndpoints = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await fetch('/api/v1/admin/endpoints');

            if (!response.ok) {
                throw new Error('Failed to fetch api endpoints');
            }

            const json = await response.json();
            if (json.success) {
                setEndpoints(json.data || []);
            } else {
                throw new Error(json.error || 'Failed to fetch api endpoints');
            }
        } catch (err: any) {
            setError(err.message);
            console.error('Error fetching api endpoints:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchEndpoints();
    }, [fetchEndpoints]);

    const createEndpoint = async (data: Partial<ApiEndpoint>) => {
        try {
            const response = await fetch('/api/v1/admin/endpoints', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            const json = await response.json();
            if (!response.ok || !json.success) {
                throw new Error(json.error || 'Failed to create endpoint');
            }

            await fetchEndpoints();
            return { data: json.data, apiKey: json.apiKey };
        } catch (err: any) {
            console.error('Error creating api endpoint:', err);
            throw err;
        }
    };

    const updateEndpoint = async (id: string, data: Partial<ApiEndpoint>) => {
        try {
            const response = await fetch(`/api/v1/admin/endpoints/${id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            const json = await response.json();
            if (!response.ok || !json.success) {
                throw new Error(json.error || 'Failed to update endpoint');
            }

            await fetchEndpoints();
            return json.data;
        } catch (err: any) {
            console.error('Error updating api endpoint:', err);
            throw err;
        }
    };

    const deleteEndpoint = async (id: string) => {
        try {
            const response = await fetch(`/api/v1/admin/endpoints/${id}`, {
                method: 'DELETE'
            });
            const data = await response.json();
            if (!response.ok || !data.success) throw new Error(data.error || 'Failed to delete endpoint');

            setEndpoints(endpoints.filter(e => e.id !== id));
        } catch (err: any) {
            console.error('Error deleting api endpoint:', err);
            throw err;
        }
    };

    const rotateKey = async (id: string) => {
        try {
            const response = await fetch(`/api/v1/admin/endpoints/${id}/rotate_key`, {
                method: 'POST'
            });

            const json = await response.json();
            if (!response.ok || !json.success) {
                throw new Error(json.error || 'Failed to rotate key');
            }

            return json.apiKey;
        } catch (err: any) {
            console.error('Error rotating api key:', err);
            throw err;
        }
    };

    return { endpoints, loading, error, fetchEndpoints, createEndpoint, updateEndpoint, deleteEndpoint, rotateKey };
}
