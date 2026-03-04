import React, { useState } from 'react';
import { useSettings } from '../../hooks/useSettings';
import {
    User,
    Palette,
    Monitor,
    Link as LinkIcon,
    Wrench,
    Loader2,
    Bug,
    ToggleRight,
    ToggleLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type Tab = 'account' | 'appearance' | 'system' | 'integrations' | 'developer';

export const SettingsPage = () => {
    const [activeTab, setActiveTab] = useState<Tab>('developer');
    const { settings, loading, error, updateSetting } = useSettings();

    const tabs = [
        { id: 'account', label: 'Account', icon: User },
        { id: 'appearance', label: 'Appearance', icon: Palette },
        { id: 'system', label: 'System', icon: Monitor },
        { id: 'integrations', label: 'Integrations', icon: LinkIcon },
        { id: 'developer', label: 'Developer Tools', icon: Wrench },
    ];

    return (
        <div className="flex-1 flex flex-col h-full bg-[#181818] overflow-hidden">
            <div className="p-8 border-b border-[#333333] shrink-0 bg-[#121212]">
                <h2 className="text-3xl font-bold uppercase tracking-tight text-[#E4E3E0]">Settings</h2>
                <p className="text-xs font-mono text-[#A1A1AA] uppercase tracking-widest mt-1">Configure system parameters & preferences</p>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Settings Sidebar */}
                <div className="w-64 border-r border-[#333333] shrink-0 bg-[#121212] flex flex-col pt-4">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as Tab)}
                            className={`flex items-center gap-3 px-6 py-4 w-full text-left transition-colors border-l-2 ${activeTab === tab.id
                                    ? 'bg-[#222222] border-[#D95D39] text-[#E4E3E0]'
                                    : 'border-transparent text-[#A1A1AA] hover:bg-[#222222] hover:text-[#E4E3E0]'
                                }`}
                        >
                            <tab.icon size={16} className={activeTab === tab.id ? 'text-[#D95D39]' : ''} />
                            <span className="text-xs font-mono uppercase font-bold tracking-wider">{tab.label}</span>
                        </button>
                    ))}
                </div>

                {/* Settings Content Area */}
                <div className="flex-1 overflow-auto p-8 relative">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="max-w-4xl"
                        >
                            {activeTab === 'developer' ? (
                                <div className="space-y-8">
                                    <div>
                                        <h3 className="text-xl font-bold uppercase tracking-tight text-[#E4E3E0]">Developer Tools</h3>
                                        <p className="text-xs font-mono text-[#A1A1AA] mt-1">Configure low-level engine parameters</p>
                                    </div>

                                    <div className="bg-[#121212] border border-[#333333] rounded-lg overflow-hidden">
                                        <div className="p-4 border-b border-[#333333] bg-[#1A1A1A] flex items-center gap-2">
                                            <Bug size={16} className="text-[#D95D39]" />
                                            <h4 className="text-sm font-bold uppercase tracking-widest text-[#E4E3E0]">Debug Settings</h4>
                                        </div>

                                        <div className="p-6">
                                            {loading && !settings ? (
                                                <div className="flex items-center gap-2 text-[#A1A1AA] text-sm font-mono uppercase">
                                                    <Loader2 size={16} className="animate-spin text-[#D95D39]" /> Loading parameters...
                                                </div>
                                            ) : error ? (
                                                <div className="text-rose-500 text-xs font-mono bg-rose-500/10 p-4 rounded border border-rose-500/20">
                                                    [ERROR] Failed to load settings: {error}
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-between group">
                                                    <div>
                                                        <p className="text-sm font-bold text-[#E4E3E0]">Include Intercepted Responses</p>
                                                        <p className="text-[10px] font-mono uppercase text-[#A1A1AA] mt-1">
                                                            When enabled, adds all intercepted raw JSON payloads into the final Scrape JSON payload.
                                                        </p>
                                                    </div>

                                                    <button
                                                        onClick={() => {
                                                            if (settings) {
                                                                updateSetting(!settings.include_intercepted_responses);
                                                            }
                                                        }}
                                                        className={`flex items-center gap-2 transition-all p-2 rounded-md hover:bg-[#222222] ${settings?.include_intercepted_responses ? 'text-emerald-500' : 'text-[#A1A1AA]'}`}
                                                        disabled={loading}
                                                    >
                                                        <AnimatePresence mode="wait">
                                                            {loading ? (
                                                                <Loader2 size={24} className="animate-spin text-[#D95D39]" />
                                                            ) : settings?.include_intercepted_responses ? (
                                                                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                                                                    <ToggleRight size={32} />
                                                                </motion.div>
                                                            ) : (
                                                                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                                                                    <ToggleLeft size={32} />
                                                                </motion.div>
                                                            )}
                                                        </AnimatePresence>
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-24 text-[#A1A1AA] opacity-50">
                                    <Wrench size={48} className="mb-4" />
                                    <p className="text-sm font-mono uppercase tracking-widest">Module not yet implemented</p>
                                    <p className="text-[10px] uppercase font-mono mt-2">Section: {activeTab}</p>
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};
