import React, { useState } from 'react';
import { X, Save, AlertCircle, Check } from 'lucide-react';
import { ApiEndpoint } from '../../hooks/useApiEndpoints';
import { useEnvironments } from '../../hooks/useEnvironments';

interface EndpointModalProps {
    onClose: () => void;
    onSave: (data: Partial<ApiEndpoint>) => Promise<void>;
    initialData?: ApiEndpoint;
    mode?: 'create' | 'edit' | 'view';
}

export const EndpointModal = ({ onClose, onSave, initialData, mode = 'create' }: EndpointModalProps) => {
    const { environments, loading, fetchEnvironments } = useEnvironments();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    React.useEffect(() => {
        fetchEnvironments();
    }, [fetchEnvironments]);

    React.useEffect(() => {
        if (initialData) {
            setFormData({
                env_slug: initialData.env_slug || '',
                resource: initialData.resource || '',
                cache_ttl_seconds: initialData.cache_ttl_seconds || 3600,
                enabled: initialData.enabled ?? true,
                require_api_key: initialData.require_api_key ?? true,
                request_formats: initialData.request_template?.formats?.[0] || 'JSON',
                primary_source: initialData.request_template?.capture?.primarySource || 'network',
                url_includes: initialData.request_template?.capture?.network?.urlIncludes || '',
                response_mode: initialData.response_template?.mode || 'primary_only',
                response_pick: initialData.response_template?.pick || ''
            });
        }
    }, [initialData]);

    const [formData, setFormData] = useState({
        env_slug: '',
        resource: '',
        cache_ttl_seconds: 3600,
        enabled: true,
        require_api_key: true,
        request_formats: 'JSON',
        primary_source: 'network',
        url_includes: '',
        response_mode: 'primary_only',
        response_pick: ''
    });

    const validEnvironments = environments.filter(e => e.slug);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.env_slug || !formData.resource) {
            setError('Environment Slug and Resource are required.');
            return;
        }

        setIsSubmitting(true);
        setError(null);
        try {
            const data: Partial<ApiEndpoint> = {
                env_slug: formData.env_slug,
                resource: formData.resource,
                cache_ttl_seconds: formData.cache_ttl_seconds,
                enabled: formData.enabled,
                require_api_key: formData.require_api_key,
                request_template: {
                    formats: [formData.request_formats.toLowerCase()],
                    capture: {
                        primarySource: formData.primary_source,
                        ...(formData.primary_source === 'network' ? { network: { urlIncludes: formData.url_includes } } : {})
                    }
                },
                response_template: {
                    mode: formData.response_mode,
                    ...(formData.response_pick ? { pick: formData.response_pick } : {})
                }
            };

            await onSave(data);
            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to create endpoint');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-[#000000]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#121212] border border-[#333333] rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

                <div className="flex justify-between items-center p-6 border-b border-[#333333] bg-[#181818]">
                    <div>
                        <h2 className="text-xl font-bold uppercase tracking-tight text-[#E4E3E0]">
                            {mode === 'create' ? 'New Endpoint' : mode === 'edit' ? 'Edit Endpoint' : 'View Endpoint'}
                        </h2>
                        <p className="text-[10px] font-mono text-[#A1A1AA] uppercase mt-1">Configure Cache-Backed Route</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-[#222222] rounded-full transition-colors text-[#A1A1AA] hover:text-[#E4E3E0]">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-6">
                    {error && (
                        <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-md flex items-center gap-3">
                            <AlertCircle className="text-rose-500" size={16} />
                            <p className="text-xs font-mono text-rose-500">{error}</p>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="text-[10px] font-mono uppercase text-[#A1A1AA] mb-2 block">Environment Slug</label>
                            <select
                                value={formData.env_slug}
                                onChange={e => setFormData({ ...formData, env_slug: e.target.value })}
                                disabled={loading || mode === 'view'}
                                className="w-full bg-[#181818] border border-[#333333] p-2.5 text-sm focus:outline-none focus:border-[#D95D39] text-[#E4E3E0] rounded-md transition-colors appearance-none disabled:opacity-50"
                            >
                                <option value="">-- Select Environment --</option>
                                {validEnvironments.map(env => (
                                    <option key={env.id} value={env.slug!}>{env.name} ({env.slug})</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="text-[10px] font-mono uppercase text-[#A1A1AA] mb-2 block">Resource Name</label>
                            <input
                                type="text"
                                value={formData.resource}
                                onChange={e => setFormData({ ...formData, resource: e.target.value })}
                                disabled={mode === 'view'}
                                placeholder="e.g. lowfares"
                                className="w-full bg-[#181818] border border-[#333333] p-2.5 text-sm focus:outline-none focus:border-[#D95D39] text-[#E4E3E0] rounded-md transition-colors disabled:opacity-50"
                            />
                        </div>
                    </div>

                    <div className="bg-[#222222] border border-[#333333] p-4 rounded-lg flex items-center justify-between">
                        <h3 className="text-[11px] font-mono uppercase text-[#E4E3E0] flex items-center gap-1">
                            Final Route: <span className="font-bold text-[#D95D39]">/api/v1/data/{formData.env_slug || '[slug]'}/{formData.resource || '[resource]'}</span>
                        </h3>
                    </div>

                    <div>
                        <label className="text-[10px] font-mono uppercase text-[#A1A1AA] mb-2 block">Cache TTL (Seconds)</label>
                        <input
                            type="number"
                            value={formData.cache_ttl_seconds}
                            onChange={e => setFormData({ ...formData, cache_ttl_seconds: parseInt(e.target.value, 10) || 0 })}
                            disabled={mode === 'view'}
                            className="w-full bg-[#181818] border border-[#333333] p-2.5 text-sm focus:outline-none focus:border-[#D95D39] text-[#E4E3E0] rounded-md transition-colors disabled:opacity-50"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-6 pt-4 border-t border-[#333333]">
                        <div>
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.require_api_key}
                                    onChange={e => setFormData({ ...formData, require_api_key: e.target.checked })}
                                    disabled={mode === 'view'}
                                    className="w-4 h-4 rounded border-[#333333] text-[#D95D39] focus:ring-[#D95D39] bg-[#181818] disabled:opacity-50"
                                />
                                <span className="text-[11px] font-mono uppercase text-[#E4E3E0]">Require API Key</span>
                            </label>
                        </div>
                        <div>
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.enabled}
                                    onChange={e => setFormData({ ...formData, enabled: e.target.checked })}
                                    disabled={mode === 'view'}
                                    className="w-4 h-4 rounded border-[#333333] text-[#D95D39] focus:ring-[#D95D39] bg-[#181818] disabled:opacity-50"
                                />
                                <span className="text-[11px] font-mono uppercase text-[#E4E3E0]">Enabled</span>
                            </label>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-[#333333]">
                        <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#E4E3E0] mb-4">Request Template</h4>
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className="text-[10px] font-mono uppercase text-[#A1A1AA] mb-2 block">Primary Source</label>
                                <select
                                    value={formData.primary_source}
                                    onChange={e => setFormData({ ...formData, primary_source: e.target.value })}
                                    disabled={mode === 'view'}
                                    className="w-full bg-[#181818] border border-[#333333] p-2.5 text-sm focus:outline-none focus:border-[#D95D39] text-[#E4E3E0] rounded-md transition-colors appearance-none disabled:opacity-50"
                                >
                                    <option value="auto">Auto</option>
                                    <option value="network">Network Interception</option>
                                    <option value="dom">DOM</option>
                                </select>
                            </div>
                            {formData.primary_source === 'network' && (
                                <div>
                                    <label className="text-[10px] font-mono uppercase text-[#A1A1AA] mb-2 block">URL Includes</label>
                                    <input
                                        type="text"
                                        value={formData.url_includes}
                                        onChange={e => setFormData({ ...formData, url_includes: e.target.value })}
                                        disabled={mode === 'view'}
                                        placeholder="/Flight/GetLowFareAvailability"
                                        className="w-full bg-[#181818] border border-[#333333] p-2.5 text-sm focus:outline-none focus:border-[#D95D39] text-[#E4E3E0] rounded-md transition-colors disabled:opacity-50"
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="pt-4 border-t border-[#333333] pb-6">
                        <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#E4E3E0] mb-4">Response Template</h4>
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className="text-[10px] font-mono uppercase text-[#A1A1AA] mb-2 block">Response Mode</label>
                                <select
                                    value={formData.response_mode}
                                    onChange={e => setFormData({ ...formData, response_mode: e.target.value })}
                                    disabled={mode === 'view'}
                                    className="w-full bg-[#181818] border border-[#333333] p-2.5 text-sm focus:outline-none focus:border-[#D95D39] text-[#E4E3E0] rounded-md transition-colors appearance-none disabled:opacity-50"
                                >
                                    <option value="primary_only">Primary Data Only</option>
                                    <option value="full">Full Wrapper</option>
                                </select>
                            </div>
                            {formData.response_mode === 'primary_only' && (
                                <div>
                                    <label className="text-[10px] font-mono uppercase text-[#A1A1AA] mb-2 block">JSON Path Pick (Optional)</label>
                                    <input
                                        type="text"
                                        value={formData.response_pick}
                                        onChange={e => setFormData({ ...formData, response_pick: e.target.value })}
                                        disabled={mode === 'view'}
                                        placeholder="e.g. results"
                                        className="w-full bg-[#181818] border border-[#333333] p-2.5 text-sm focus:outline-none focus:border-[#D95D39] text-[#E4E3E0] rounded-md transition-colors disabled:opacity-50"
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </form>

                <div className="p-6 border-t border-[#333333] bg-[#181818] flex justify-end gap-3 sticky bottom-0">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 border border-[#333333] text-[#A1A1AA] rounded-md text-[10px] font-mono uppercase tracking-widest font-bold hover:bg-[#222222] hover:text-[#E4E3E0] transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={mode === 'view' ? onClose : handleSubmit}
                        disabled={isSubmitting}
                        className="px-6 py-2 bg-gradient-to-r from-[#D95D39] to-[#E87A5D] text-white rounded-md text-[10px] font-mono uppercase tracking-widest font-bold hover:opacity-90 transition-all shadow-lg shadow-[#D95D39]/20 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? (
                            <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        ) : mode === 'view' ? (
                            <Check size={14} />
                        ) : (
                            <Save size={14} />
                        )}
                        {isSubmitting ? "Saving..." : mode === 'view' ? "Done" : mode === 'create' ? "Create Endpoint" : "Save Changes"}
                    </button>
                </div>
            </div>
        </div>
    );
};
