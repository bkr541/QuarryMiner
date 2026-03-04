import React, { useState, useEffect } from 'react';
import { Search, LayoutGrid, List as ListIcon, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEnvironments, Environment, MatchType } from '../../hooks/useEnvironments';
import { EnvironmentGrid } from './EnvironmentGrid';
import { EnvironmentModal } from './EnvironmentModal';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

export const EnvironmentPage: React.FC = () => {
    const {
        environments,
        loading,
        fetchEnvironments,
        createEnvironment,
        updateEnvironment,
        deleteEnvironment
    } = useEnvironments();

    // State
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState<MatchType | 'All'>('All');

    // Modals
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEnv, setEditingEnv] = useState<Environment | null>(null);

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [envToDelete, setEnvToDelete] = useState<Environment | null>(null);

    // Pagination (Client Side for now)
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 12;

    // Search Debounce & Fetching
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchEnvironments(searchQuery, activeFilter);
            setCurrentPage(1); // Reset page on filter/search change
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery, activeFilter, fetchEnvironments]);

    // Derived state for pagination
    const totalPages = Math.max(1, Math.ceil(environments.length / pageSize));
    const paginatedEnvironments = environments.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    // Toast System (Simple text for now)
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    // Handlers
    const handleCreateOrUpdate = async (data: Partial<Environment>) => {
        if (editingEnv) {
            await updateEnvironment(editingEnv.id, data);
            showToast('Environment updated successfully');
        } else {
            await createEnvironment(data);
            showToast('Environment created successfully');
        }
    };

    const handleSelectDelete = async () => {
        if (envToDelete) {
            await deleteEnvironment(envToDelete.id);
            showToast('Environment deleted');
            setEnvToDelete(null);
        }
    };

    const filters: (MatchType | 'All')[] = ['All', 'exact', 'suffix', 'wildcard', 'regex'];

    return (
        <div className="flex-1 flex flex-col bg-[#181818] overflow-hidden relative">
            {/* Toast Notification */}
            {toast && (
                <div className={`absolute top-4 right-1/2 translate-x-1/2 z-[200] px-4 py-2 rounded shadow-2xl font-mono text-sm tracking-wide text-white border ${toast.type === 'success' ? 'bg-[#D95D39] border-[#e87a5d]' : 'bg-rose-500 border-rose-400'
                    } slide-in-top`}>
                    {toast.message}
                </div>
            )}

            {/* Header Area */}
            <div className="p-8 pb-0 shrink-0">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h2 className="text-3xl font-bold uppercase tracking-tight text-[#E4E3E0]">Environments</h2>
                    </div>
                    <button
                        onClick={() => { setEditingEnv(null); setIsModalOpen(true); }}
                        className="flex items-center gap-2 px-4 py-2.5 bg-[#D95D39] hover:bg-[#c44c2a] text-white rounded-lg text-xs font-mono font-bold tracking-widest uppercase transition-colors shadow-lg shadow-[#D95D39]/20"
                    >
                        <Plus size={16} /> Add Environment
                    </button>
                </div>

                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-4 border-b border-[#333] pb-6">
                    <div className="flex items-center gap-6">
                        {/* View Toggles */}
                        <div className="flex p-0.5 bg-[#222222] rounded-lg border border-[#333]">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`p-2 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-[#D95D39] text-white' : 'text-[#A1A1AA] hover:text-[#E4E3E0]'}`}
                            >
                                <LayoutGrid size={16} />
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`p-2 rounded-md transition-colors ${viewMode === 'list' ? 'bg-[#D95D39] text-white' : 'text-[#A1A1AA] hover:text-[#E4E3E0]'}`}
                            >
                                <ListIcon size={16} />
                            </button>
                        </div>

                        {/* Filter Chips */}
                        <div className="flex gap-2">
                            {filters.map((f) => (
                                <button
                                    key={f}
                                    onClick={() => setActiveFilter(f)}
                                    className={`px-4 py-1.5 rounded-full text-xs font-mono capitalize tracking-wide border transition-all ${activeFilter === f
                                            ? 'bg-white text-black border-white font-bold'
                                            : 'bg-transparent text-[#A1A1AA] border-[#333] hover:border-[#666] hover:text-[#E4E3E0]'
                                        }`}
                                >
                                    {f}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Search Bar */}
                    <div className="relative w-full xl:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A1A1AA]" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search project"
                            className="w-full bg-[#121212] border border-[#333] py-2 pl-9 pr-4 text-sm focus:outline-none focus:border-[#D95D39] text-[#E4E3E0] rounded-full transition-colors"
                        />
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-auto bg-[#181818]">
                {viewMode === 'grid' ? (
                    <EnvironmentGrid
                        environments={paginatedEnvironments}
                        loading={loading}
                        onEdit={(env) => { setEditingEnv(env); setIsModalOpen(true); }}
                        onDelete={(env) => { setEnvToDelete(env); setIsDeleteModalOpen(true); }}
                    />
                ) : (
                    <div className="p-6">
                        <div className="bg-[#1C1C1C] border border-[#2E2E2E] rounded-xl overflow-hidden">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-[#121212] border-b border-[#333] text-[10px] font-mono text-[#A1A1AA] uppercase tracking-wider">
                                        <th className="p-4 font-semibold">Name</th>
                                        <th className="p-4 font-semibold">Host</th>
                                        <th className="p-4 font-semibold">Match Type</th>
                                        <th className="p-4 font-semibold">Priority</th>
                                        <th className="p-4 font-semibold">Status</th>
                                        <th className="p-4 font-semibold text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedEnvironments.map(env => (
                                        <tr key={env.id} className="border-b border-[#333]/50 hover:bg-[#222] transition-colors group">
                                            <td className="p-4">
                                                <div className="font-semibold text-sm text-[#E4E3E0]">{env.name}</div>
                                                <div className="text-[10px] text-[#A1A1AA] font-mono">ENV-{env.id.substring(0, 4).toUpperCase()}</div>
                                            </td>
                                            <td className="p-4 text-sm text-[#E4E3E0]">{env.match_host}</td>
                                            <td className="p-4">
                                                <span className="text-[10px] font-mono text-[#D95D39] capitalize px-2 py-1 bg-[#D95D39]/10 rounded border border-[#D95D39]/20 font-semibold">
                                                    {env.match_type}
                                                </span>
                                            </td>
                                            <td className="p-4 text-sm text-[#A1A1AA]">{env.priority}</td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-1.5 text-xs text-emerald-500 font-bold">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                    Active
                                                </div>
                                            </td>
                                            <td className="p-4 text-right">
                                                <button onClick={() => { setEditingEnv(env); setIsModalOpen(true); }} className="text-[#A1A1AA] hover:text-[#E4E3E0] text-xs font-mono uppercase mr-4 transition-colors">Edit</button>
                                                <button onClick={() => { setEnvToDelete(env); setIsDeleteModalOpen(true); }} className="text-[#A1A1AA] hover:text-rose-500 text-xs font-mono uppercase transition-colors">Delete</button>
                                            </td>
                                        </tr>
                                    ))}
                                    {paginatedEnvironments.length === 0 && !loading && (
                                        <tr>
                                            <td colSpan={6} className="p-8 text-center text-[#A1A1AA] font-mono text-sm">No environments found.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* Pagination Footer */}
            <div className="p-6 border-t border-[#333] shrink-0 flex justify-between items-center bg-[#181818]">
                <div className="text-xs font-mono text-[#A1A1AA] tracking-wide">
                    Page {currentPage} of {totalPages}
                </div>
                <div className="flex gap-2">
                    <button
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        className="p-1.5 rounded bg-[#222] border border-[#333] text-[#A1A1AA] hover:text-white hover:border-[#555] disabled:opacity-50 transition-colors"
                    >
                        <ChevronLeft size={16} />
                    </button>
                    <button
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        className="p-1.5 rounded bg-[#222] border border-[#333] text-[#A1A1AA] hover:text-[#D95D39] hover:border-[#D95D39]/50 hover:bg-[#D95D39]/10 disabled:opacity-50 disabled:hover:text-[#A1A1AA] disabled:hover:bg-[#222] disabled:hover:border-[#333] transition-colors"
                    >
                        <ChevronRight size={16} />
                    </button>
                </div>
            </div>

            {/* Modals */}
            <EnvironmentModal
                isOpen={isModalOpen}
                onClose={() => { setIsModalOpen(false); setEditingEnv(null); }}
                onSubmit={handleCreateOrUpdate}
                initialData={editingEnv}
            />

            <ConfirmDeleteModal
                isOpen={isDeleteModalOpen}
                onClose={() => setEnvToDelete(null)}
                onConfirm={handleSelectDelete}
                environment={envToDelete}
            />

            <style>{`
        .slide-in-top {
          animation: slide-in-top 0.3s cubic-bezier(0.250, 0.460, 0.450, 0.940) both;
        }
        @keyframes slide-in-top {
          0% { transform: translate(-50%, -20px); opacity: 0; }
          100% { transform: translate(-50%, 0); opacity: 1; }
        }
      `}</style>
        </div>
    );
};
