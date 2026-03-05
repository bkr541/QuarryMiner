import React from 'react';
import { ApiEndpoint } from '../../hooks/useApiEndpoints';
import { Trash2, KeyRound, Globe, Server, CheckCircle2, XCircle, Eye, Edit2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface EndpointGridProps {
    endpoints: ApiEndpoint[];
    onDelete: (id: string) => void;
    onRotateKey: (id: string) => void;
    onView: (endpoint: ApiEndpoint) => void;
    onEdit: (endpoint: ApiEndpoint) => void;
}

export const EndpointGrid = ({ endpoints, onDelete, onRotateKey, onView, onEdit }: EndpointGridProps) => {
    if (endpoints.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 bg-[#222222] border border-[#333333] rounded-xl border-dashed">
                <Server size={48} className="text-[#A1A1AA] mb-4 opacity-50" />
                <h3 className="text-lg font-bold uppercase tracking-widest text-[#E4E3E0] mb-2">No Endpoints</h3>
                <p className="text-xs font-mono text-[#A1A1AA] text-center max-w-md">
                    Create an API Endpoint to start serving scraped data directly to your consumer applications with automatic caching and API key authentication.
                </p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {endpoints.map((endpoint) => (
                <div key={endpoint.id} className="bg-[#121212] border border-[#333333] rounded-xl p-5 hover:border-[#D95D39] transition-colors relative group">
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-[#222222] rounded-lg border border-[#333333] flex items-center justify-center">
                                <Globe className="text-[#D95D39]" size={20} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold font-mono text-[#E4E3E0] flex items-center gap-2">
                                    /{endpoint.env_slug}/{endpoint.resource}
                                </h3>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-full border flex items-center gap-1 ${endpoint.enabled ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-[#333333] text-[#A1A1AA] border-[#444444]'}`}>
                                        {endpoint.enabled ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
                                        {endpoint.enabled ? 'Active' : 'Disabled'}
                                    </span>
                                    <span className="text-[10px] font-mono text-[#A1A1AA]">TTL: {endpoint.cache_ttl_seconds}s</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-[#333333] pt-4 mt-4 grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-[10px] font-mono uppercase text-[#A1A1AA] mb-1">Auth Required</p>
                            <p className="text-xs font-bold text-[#E4E3E0]">{endpoint.require_api_key ? 'Yes (API Key)' : 'No'}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-mono uppercase text-[#A1A1AA] mb-1">Response Mode</p>
                            <p className="text-xs font-bold text-[#E4E3E0]">{endpoint.response_template?.mode === 'primary_only' ? 'Primary Data' : 'Full Output'}</p>
                        </div>
                        <div className="col-span-2">
                            <p className="text-[10px] font-mono uppercase text-[#A1A1AA] mb-1">Created</p>
                            <p className="text-xs font-bold text-[#E4E3E0]">{formatDistanceToNow(new Date(endpoint.created_at))} ago</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 pt-4 mt-4 border-t border-[#333333] opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                        <button
                            onClick={() => onView(endpoint)}
                            className="p-2 bg-[#222222] hover:bg-[#333333] text-[#A1A1AA] hover:text-[#E4E3E0] rounded-md transition-colors"
                            title="View Endpoint"
                        >
                            <Eye size={16} />
                        </button>
                        <button
                            onClick={() => onEdit(endpoint)}
                            className="p-2 bg-[#222222] hover:bg-[#333333] text-[#A1A1AA] hover:text-[#E4E3E0] rounded-md transition-colors"
                            title="Edit Endpoint"
                        >
                            <Edit2 size={16} />
                        </button>
                        <button
                            onClick={() => onRotateKey(endpoint.id)}
                            className="p-2 bg-[#222222] hover:bg-[#333333] text-[#A1A1AA] hover:text-[#E4E3E0] rounded-md transition-colors flex items-center justify-center group/btn"
                            title="Rotate API Key"
                        >
                            <KeyRound size={16} className="group-hover/btn:rotate-12 transition-transform" />
                        </button>
                        <div className="flex-1"></div>
                        <button
                            onClick={() => {
                                if (window.confirm('Are you sure you want to delete this endpoint?')) {
                                    onDelete(endpoint.id);
                                }
                            }}
                            className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded-md transition-colors"
                            title="Delete Endpoint"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
};
