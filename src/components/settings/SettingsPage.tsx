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
    ToggleLeft,
    Key,
    Settings as SettingsIcon,
    Eye,
    EyeOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useSecrets } from '../../hooks/useSecrets';

type Tab = 'account' | 'appearance' | 'system' | 'integrations' | 'developer' | 'secrets';

export const SettingsPage = () => {
    const [activeTab, setActiveTab] = useState<Tab>('developer');
    const { settings, loading, error, updateSetting } = useSettings();

    const tabs = [
        { id: 'account', label: 'Account', icon: User },
        { id: 'appearance', label: 'Appearance', icon: Palette },
        { id: 'system', label: 'System', icon: Monitor },
        { id: 'integrations', label: 'Integrations', icon: LinkIcon },
        { id: 'developer', label: 'Developer Tools', icon: Wrench },
        { id: 'secrets', label: 'Secrets', icon: Key },
    ];

    return (
        <div className="flex-1 flex flex-col h-full bg-[#181818] overflow-hidden">
            <div className="p-8 border-b border-[#333333] shrink-0 bg-[#121212]">
                <h2 className="text-3xl font-bold uppercase tracking-tight text-[#E4E3E0] flex items-center gap-3">
                    <SettingsIcon className="text-[#D95D39]" size={28} />
                    Settings
                </h2>
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
                            ) : activeTab === 'secrets' ? (
                                <SecretsPanel />
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

const SecretsPanel = () => {
    const { secrets, loading, createSecret, deleteSecret, revealSecret } = useSecrets();
    const [name, setName] = useState('');
    const [value, setValue] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [revealedSecrets, setRevealedSecrets] = useState<Record<string, string>>({});
    const [revealingStates, setRevealingStates] = useState<Record<string, boolean>>({});

    const systemSecrets = secrets.filter(s => s.name === 'QUARRY_MINER_API_KEY');
    const userSecrets = secrets.filter(s => s.name !== 'QUARRY_MINER_API_KEY');

    const toggleReveal = async (id: string) => {
        if (revealedSecrets[id]) {
            setRevealedSecrets(prev => {
                const next = { ...prev };
                delete next[id];
                return next;
            });
        } else {
            try {
                setRevealingStates(prev => ({ ...prev, [id]: true }));
                const val = await revealSecret(id);
                setRevealedSecrets(prev => ({ ...prev, [id]: val }));
            } catch (err: any) {
                console.error(err);
            } finally {
                setRevealingStates(prev => ({ ...prev, [id]: false }));
            }
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !value) {
            setError('Name and Value are required');
            return;
        }
        setIsSubmitting(true);
        setError(null);
        try {
            await createSecret(name, value);
            setName('');
            setValue('');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-8">
            <div>
                <h3 className="text-xl font-bold uppercase tracking-tight text-[#E4E3E0]">Secrets Management</h3>
                <p className="text-xs font-mono text-[#A1A1AA] mt-1">Manage API keys and sensitive tokens for your environments</p>
            </div>

            <div className="bg-[#121212] border border-[#333333] rounded-lg overflow-hidden">
                <div className="p-4 border-b border-[#333333] bg-[#1A1A1A] flex items-center gap-2">
                    <Key size={16} className="text-[#D95D39]" />
                    <h4 className="text-sm font-bold uppercase tracking-widest text-[#E4E3E0]">Add New Secret</h4>
                </div>
                <form onSubmit={handleCreate} className="p-6 space-y-4">
                    {error && (
                        <div className="text-rose-500 text-xs font-mono bg-rose-500/10 p-3 rounded border border-rose-500/20">
                            {error}
                        </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-mono uppercase text-[#A1A1AA] mb-2 block">Secret Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={e => {
                                    // uppercase and replace space with underscore
                                    setName(e.target.value.toUpperCase().replace(/\s+/g, '_'));
                                }}
                                placeholder="e.g. STRIPE_API_KEY"
                                className="w-full bg-[#181818] border border-[#333333] p-2.5 text-sm focus:outline-none focus:border-[#D95D39] text-[#E4E3E0] rounded-md transition-colors font-mono"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-mono uppercase text-[#A1A1AA] mb-2 block">Value</label>
                            <input
                                type="password"
                                value={value}
                                onChange={e => setValue(e.target.value)}
                                placeholder="sk_test_..."
                                className="w-full bg-[#181818] border border-[#333333] p-2.5 text-sm focus:outline-none focus:border-[#D95D39] text-[#E4E3E0] rounded-md transition-colors font-mono"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end pt-2">
                        <button
                            type="submit"
                            disabled={isSubmitting || !name || !value}
                            className="px-4 py-2 bg-gradient-to-r from-[#D95D39] to-[#E87A5D] text-white rounded-md text-[10px] font-mono uppercase tracking-widest font-bold hover:opacity-90 transition-opacity shadow-lg shadow-[#D95D39]/20 disabled:opacity-50"
                        >
                            {isSubmitting ? 'Saving...' : 'Save Secret'}
                        </button>
                    </div>
                </form>
            </div>

            <div className="bg-[#121212] border border-[#333333] rounded-lg overflow-hidden">
                <div className="p-4 border-b border-[#333333] bg-[#1A1A1A]">
                    <h4 className="text-sm font-bold uppercase tracking-widest text-[#E4E3E0]">System Secrets</h4>
                </div>
                {loading && systemSecrets.length === 0 ? (
                    <div className="p-8 flex justify-center text-[#A1A1AA]">
                        <Loader2 size={24} className="animate-spin" />
                    </div>
                ) : systemSecrets.length === 0 ? (
                    <div className="p-8 text-center text-[#A1A1AA] font-mono text-sm">
                        No system secrets available.
                    </div>
                ) : (
                    <div className="divide-y divide-[#333333]">
                        {systemSecrets.map(secret => (
                            <div key={secret.id} className="p-4 flex items-center justify-between hover:bg-[#181818] transition-colors">
                                <div>
                                    <p className="text-sm font-bold font-mono text-[#E4E3E0] flex items-center gap-2">
                                        {secret.name}
                                        <span className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2 py-0.5 rounded-full text-[10px] uppercase tracking-widest">Core</span>
                                    </p>
                                    <p className="text-[10px] text-[#A1A1AA] font-mono mt-1">
                                        Used for internal and consumer API calls
                                    </p>
                                    {revealingStates[secret.id] && (
                                        <p className="text-[10px] text-[#A1A1AA] font-mono mt-2 animate-pulse">Revealing...</p>
                                    )}
                                    {revealedSecrets[secret.id] && (
                                        <div className="mt-2 bg-[#222222] border border-[#333333] px-3 py-1.5 rounded-md inline-block">
                                            <code className="text-emerald-400 font-mono text-sm tracking-tight">{revealedSecrets[secret.id]}</code>
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <button
                                        onClick={() => toggleReveal(secret.id)}
                                        disabled={revealingStates[secret.id]}
                                        className="p-2 bg-[#222222] hover:bg-[#333333] text-[#A1A1AA] hover:text-[#E4E3E0] rounded-md transition-colors disabled:opacity-50"
                                        title={revealedSecrets[secret.id] ? "Hide Secret" : "Reveal Secret"}
                                    >
                                        {revealedSecrets[secret.id] ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="bg-[#121212] border border-[#333333] rounded-lg overflow-hidden">
                <div className="p-4 border-b border-[#333333] bg-[#1A1A1A]">
                    <h4 className="text-sm font-bold uppercase tracking-widest text-[#E4E3E0]">Custom Secrets</h4>
                </div>
                {loading && userSecrets.length === 0 ? (
                    <div className="p-8 flex justify-center text-[#A1A1AA]">
                        <Loader2 size={24} className="animate-spin" />
                    </div>
                ) : userSecrets.length === 0 ? (
                    <div className="p-8 text-center text-[#A1A1AA] font-mono text-sm">
                        No custom secrets stored yet.
                    </div>
                ) : (
                    <div className="divide-y divide-[#333333]">
                        {userSecrets.map(secret => (
                            <div key={secret.id} className="p-4 flex items-center justify-between hover:bg-[#181818] transition-colors">
                                <div>
                                    <p className="text-sm font-bold font-mono text-[#E4E3E0]">{secret.name}</p>
                                    <p className="text-[10px] text-[#A1A1AA] font-mono mt-1">
                                        Added {new Date(secret.created_at).toLocaleDateString()}
                                    </p>
                                    {revealingStates[secret.id] && (
                                        <p className="text-[10px] text-[#A1A1AA] font-mono mt-2 animate-pulse">Revealing...</p>
                                    )}
                                    {revealedSecrets[secret.id] && (
                                        <div className="mt-2 bg-[#222222] border border-[#333333] px-3 py-1.5 rounded-md inline-block">
                                            <code className="text-emerald-400 font-mono text-sm tracking-tight">{revealedSecrets[secret.id]}</code>
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => toggleReveal(secret.id)}
                                        disabled={revealingStates[secret.id]}
                                        className="p-2 bg-[#222222] hover:bg-[#333333] text-[#A1A1AA] hover:text-[#E4E3E0] rounded-md transition-colors disabled:opacity-50"
                                        title={revealedSecrets[secret.id] ? "Hide Secret" : "Reveal Secret"}
                                    >
                                        {revealedSecrets[secret.id] ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (window.confirm(`Delete secret ${secret.name}?`)) {
                                                deleteSecret(secret.id);
                                            }
                                        }}
                                        className="text-[10px] font-mono uppercase text-rose-500 hover:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 px-3 py-1.5 rounded transition-colors"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
