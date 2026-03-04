import React from 'react';
import { MoreVertical, Layers, Hash } from 'lucide-react';
import { Environment } from '../../hooks/useEnvironments';

interface EnvironmentGridProps {
    environments: Environment[];
    onEdit: (env: Environment) => void;
    onDelete: (env: Environment) => void;
    loading: boolean;
}

export const EnvironmentGrid: React.FC<EnvironmentGridProps> = ({ environments, onEdit, onDelete, loading }) => {
    const [openKebabMenu, setOpenKebabMenu] = React.useState<string | null>(null);

    // Close menu on outside click
    React.useEffect(() => {
        const handleOutsideClick = (e: MouseEvent) => {
            setOpenKebabMenu(null);
        };
        document.addEventListener('click', handleOutsideClick);
        return () => document.removeEventListener('click', handleOutsideClick);
    }, []);

    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-6">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                    <div key={i} className="bg-[#1C1C1C] border border-[#2E2E2E] rounded-xl p-5 h-40 animate-pulse flex flex-col justify-between">
                        <div className="flex justify-between items-start">
                            <div className="w-16 h-4 bg-[#2A2A2A] rounded"></div>
                            <div className="w-4 h-4 bg-[#2A2A2A] rounded"></div>
                        </div>
                        <div className="space-y-2">
                            <div className="w-3/4 h-5 bg-[#2A2A2A] rounded"></div>
                            <div className="w-1/2 h-3 bg-[#2A2A2A] rounded"></div>
                        </div>
                        <div className="flex justify-between items-center mt-4">
                            <div className="w-24 h-6 bg-[#2A2A2A] rounded-full"></div>
                            <div className="w-16 h-4 bg-[#2A2A2A] rounded"></div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (environments.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#181818]">
                <Layers className="text-[#333333] w-16 h-16 mb-4" />
                <h3 className="text-xl font-bold text-[#E4E3E0] mb-2 tracking-tight">No Environments Found</h3>
                <p className="text-sm font-mono text-[#A1A1AA] uppercase tracking-widest text-center max-w-sm mb-6">
                    You haven't configured any extraction environments for this view.
                </p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-6">
            {environments.map((env) => (
                <div
                    key={env.id}
                    className="bg-[#1C1C1C] border border-[#2E2E2E] hover:border-[#444444] rounded-xl p-5 group flex flex-col transition-all relative overflow-hidden"
                    onClick={() => { /* Could select here */ }}
                >
                    {/* Card subtle grain / glow if desired could overlay here */}

                    <div className="flex justify-between items-start mb-3">
                        <span className="text-[10px] font-mono text-[#A1A1AA] uppercase tracking-wider font-semibold">
                            ENV-{env.id.substring(0, 4).toUpperCase()}
                        </span>
                        <div className="relative">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenKebabMenu(openKebabMenu === env.id ? null : env.id);
                                }}
                                className="text-[#A1A1AA] hover:text-[#E4E3E0] p-1 -mr-1 rounded-md hover:bg-[#2A2A2A] transition-colors"
                            >
                                <MoreVertical size={16} />
                            </button>

                            {openKebabMenu === env.id && (
                                <div
                                    className="absolute right-0 top-full mt-1 w-36 bg-[#181818] border border-[#333] rounded-md shadow-2xl z-10 py-1"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <button
                                        onClick={() => { onEdit(env); setOpenKebabMenu(null); }}
                                        className="w-full text-left px-4 py-2 text-xs font-mono uppercase tracking-wide text-[#E4E3E0] hover:bg-[#222] transition-colors"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => { onDelete(env); setOpenKebabMenu(null); }}
                                        className="w-full text-left px-4 py-2 text-xs font-mono uppercase tracking-wide text-rose-500 hover:bg-[#222] transition-colors"
                                    >
                                        Delete
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="mb-4 flex-1">
                        <h4 className="text-[15px] font-semibold text-[#E4E3E0] mb-1 line-clamp-1 flex items-center gap-2">
                            {env.name}
                            {env.priority >= 200 && (
                                <span className="text-[8px] px-1.5 py-0.5 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded font-mono uppercase font-bold tracking-widest whitespace-nowrap">
                                    At Risk
                                </span>
                            )}
                        </h4>
                        <div className="text-[11px] font-mono text-[#A1A1AA] mb-3 flex items-center gap-1.5 line-clamp-1">
                            <span className="shrink-0">Host:</span>
                            <span className="text-[#E4E3E0] truncate">{env.match_host}</span>
                        </div>

                        <div className="flex flex-col gap-2 mt-auto">
                            <div className="text-[10px] font-mono tracking-wide text-[#A1A1AA] flex items-center gap-1.5">
                                Match Type:
                                <span className="text-[#D95D39] capitalize px-1.5 py-0.5 bg-[#D95D39]/10 rounded border border-[#D95D39]/20 font-semibold">{env.match_type}</span>
                            </div>
                            <div className="flex items-center justify-between text-[10px] font-mono tracking-wide text-[#A1A1AA]">
                                <div className="flex items-center gap-1.5">
                                    Status:
                                    <span className="text-emerald-500 font-bold capitalize">
                                        {/* Assuming Active since nothing in DB tracks it, dummy Active */}
                                        Active
                                    </span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Hash size={10} className="text-[#A1A1AA]/70" /> {env.priority}
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            ))}
        </div>
    );
};
