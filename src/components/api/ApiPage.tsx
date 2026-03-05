import React, { useState } from 'react';
import { Plus, Code2, Copy, Check, Globe } from 'lucide-react';
import { useApiEndpoints, ApiEndpoint } from '../../hooks/useApiEndpoints';
import { EndpointModal } from './EndpointModal';
import { EndpointGrid } from './EndpointGrid';

export const ApiPage = () => {
    const { endpoints, loading, fetchEndpoints, createEndpoint, updateEndpoint, deleteEndpoint, rotateKey } = useApiEndpoints();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');
    const [selectedEndpoint, setSelectedEndpoint] = useState<ApiEndpoint | null>(null);
    const [currentKey, setCurrentKey] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'endpoints'>('endpoints');

    const handleSave = async (data: Partial<ApiEndpoint>) => {
        if (modalMode === 'edit' && selectedEndpoint) {
            await updateEndpoint(selectedEndpoint.id, data);
        } else if (modalMode === 'create') {
            const res = await createEndpoint(data);
            if (res.apiKey) {
                setCurrentKey(res.apiKey);
            }
        }
    };

    const handleOpenCreate = () => {
        setSelectedEndpoint(null);
        setModalMode('create');
        setCurrentKey(null);
        setIsModalOpen(true);
    };

    const handleOpenView = (endpoint: ApiEndpoint) => {
        setSelectedEndpoint(endpoint);
        setModalMode('view');
        setCurrentKey(null);
        setIsModalOpen(true);
    };

    const handleOpenEdit = (endpoint: ApiEndpoint) => {
        setSelectedEndpoint(endpoint);
        setModalMode('edit');
        setCurrentKey(null);
        setIsModalOpen(true);
    };

    const handleRotateKey = async (id: string) => {
        if (window.confirm("Are you sure you want to rotate the key? All consumers using the old key will be denied access immediately.")) {
            const apiKey = await rotateKey(id);
            if (apiKey) {
                setCurrentKey(apiKey);
                alert("Key Rotated! See the top of the screen for the new key.");
            }
        }
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-[#181818] overflow-hidden">
            <div className="p-8 border-b border-[#333333] shrink-0 bg-[#121212]">
                <h2 className="text-3xl font-bold uppercase tracking-tight text-[#E4E3E0] flex items-center gap-3">
                    <Code2 className="text-[#D95D39]" size={28} />
                    API Manager
                </h2>
                <p className="text-xs font-mono text-[#A1A1AA] uppercase tracking-widest mt-1">
                    Manage Cache-Backed Data Endpoints
                </p>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Sidebar */}
                <div className="w-64 border-r border-[#333333] shrink-0 bg-[#121212] flex flex-col pt-4">
                    <button
                        onClick={() => setActiveTab('endpoints')}
                        className={`flex items-center gap-3 px-6 py-4 w-full text-left transition-colors border-l-2 ${activeTab === 'endpoints'
                            ? 'bg-[#222222] border-[#D95D39] text-[#E4E3E0]'
                            : 'border-transparent text-[#A1A1AA] hover:bg-[#222222] hover:text-[#E4E3E0]'
                            }`}
                    >
                        <Globe size={16} className={activeTab === 'endpoints' ? 'text-[#D95D39]' : ''} />
                        <span className="text-xs font-mono uppercase font-bold tracking-wider">Endpoints</span>
                    </button>
                    {/* Future tabs can go here */}
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-auto p-8 relative">
                    {activeTab === 'endpoints' && (
                        <div className="max-w-6xl mx-auto space-y-8">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h3 className="text-xl font-bold uppercase tracking-tight text-[#E4E3E0]">API Endpoints</h3>
                                    <p className="text-xs font-mono text-[#A1A1AA] mt-1">Create and manage consumer APIs for your data.</p>
                                </div>
                                <button
                                    onClick={handleOpenCreate}
                                    className="px-4 py-2 bg-gradient-to-r from-[#D95D39] to-[#E87A5D] text-white rounded-md text-[10px] font-mono uppercase tracking-widest font-bold hover:opacity-90 transition-opacity shadow-lg shadow-[#D95D39]/20 flex items-center gap-2"
                                >
                                    <Plus size={14} /> Add Endpoint
                                </button>
                            </div>

                            {currentKey && (
                                <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-xl mb-6 relative overflow-hidden group">
                                    <div className="flex flex-col gap-2 relative z-10">
                                        <h3 className="text-emerald-500 font-bold uppercase tracking-widest text-xs">New API Key Generated!</h3>
                                        <p className="text-[#E4E3E0] text-sm">Please copy this API key now. You won't be able to see it again.</p>
                                        <div className="flex items-center gap-3 mt-2">
                                            <code className="bg-[#121212] px-3 py-1.5 rounded-md text-emerald-400 font-mono text-sm border border-[#333333] select-all">
                                                {currentKey}
                                            </code>
                                            <button
                                                onClick={() => { navigator.clipboard.writeText(currentKey); }}
                                                className="p-1.5 bg-[#222222] rounded hover:bg-[#333333] transition-colors text-[#A1A1AA] hover:text-[#E4E3E0]"
                                            >
                                                <Copy size={14} />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-emerald-500/10 to-transparent pointer-events-none" />
                                </div>
                            )}

                            {loading ? (
                                <div className="text-[#A1A1AA] font-mono text-xs uppercase animate-pulse">Loading endpoints...</div>
                            ) : (
                                <EndpointGrid
                                    endpoints={endpoints}
                                    onDelete={deleteEndpoint}
                                    onRotateKey={handleRotateKey}
                                    onView={handleOpenView}
                                    onEdit={handleOpenEdit}
                                />
                            )}
                        </div>
                    )}
                </div>
            </div>

            {isModalOpen && (
                <EndpointModal
                    onClose={() => setIsModalOpen(false)}
                    onSave={handleSave}
                    initialData={selectedEndpoint || undefined}
                    mode={modalMode}
                />
            )}
        </div>
    );
};
