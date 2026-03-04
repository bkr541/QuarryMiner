import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Environment, MatchType } from '../../hooks/useEnvironments';

interface EnvironmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: Partial<Environment>) => Promise<void>;
    initialData?: Environment | null;
}

export const EnvironmentModal: React.FC<EnvironmentModalProps> = ({
    isOpen,
    onClose,
    onSubmit,
    initialData
}) => {
    const isEdit = !!initialData;
    const [formData, setFormData] = useState<Partial<Environment>>({
        name: '',
        slug: '',
        match_host: '',
        match_type: 'exact',
        match_path_regex: '',
        priority: 100,
        default_scroll_count: 0,
        default_wait_selector: '',
        default_formats: ['markdown', 'html', 'json'],
        default_headers: {},
        cookie_jar: null,
        proxy_profile_id: '',
        notes: ''
    });

    const [headersJsonStr, setHeadersJsonStr] = useState('{\n  \n}');
    const [cookieJarJsonStr, setCookieJarJsonStr] = useState('{\n  \n}');

    // Formats multiselect state
    const toggleFormat = (format: string) => {
        setFormData(prev => {
            const current = prev.default_formats || [];
            if (current.includes(format)) {
                return { ...prev, default_formats: current.filter(f => f !== format) };
            } else {
                return { ...prev, default_formats: [...current, format] };
            }
        });
    };

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setFormData(initialData);
                setHeadersJsonStr(JSON.stringify(initialData.default_headers || {}, null, 2));
                setCookieJarJsonStr(initialData.cookie_jar ? JSON.stringify(initialData.cookie_jar, null, 2) : '{\n  \n}');
            } else {
                setFormData({
                    name: '',
                    slug: '',
                    match_host: '',
                    match_type: 'exact',
                    match_path_regex: '',
                    priority: 100,
                    default_scroll_count: 0,
                    default_wait_selector: '',
                    default_formats: ['markdown', 'html', 'json'],
                    default_headers: {},
                    cookie_jar: null,
                    proxy_profile_id: '',
                    notes: ''
                });
                setHeadersJsonStr('{\n  \n}');
                setCookieJarJsonStr('{\n  \n}');
            }
        }
    }, [isOpen, initialData]);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        try {
            // Validate JSON fields before submit
            let headersObj = {};
            let cookieObj = null;

            try {
                if (headersJsonStr.trim() !== '') headersObj = JSON.parse(headersJsonStr);
            } catch (e) { throw new Error('Invalid JSON in Default Headers'); }

            try {
                if (cookieJarJsonStr.trim() !== '' && cookieJarJsonStr.trim() !== '{}' && cookieJarJsonStr !== '{\n  \n}') {
                    cookieObj = JSON.parse(cookieJarJsonStr);
                }
            } catch (e) { throw new Error('Invalid JSON in Cookie Jar'); }

            await onSubmit({
                ...formData,
                default_headers: headersObj,
                cookie_jar: cookieObj
            });
            onClose();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div
                className="bg-[#121212] border border-[#333333] rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden shadow-black/50"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center p-6 border-b border-[#252525] shrink-0">
                    <h2 className="text-xl font-bold tracking-tight text-[#E4E3E0]">
                        {isEdit ? 'Edit Scrape Environment' : 'Create New Scrape Environment'}
                    </h2>
                    <button type="button" onClick={onClose} className="p-2 text-[#A1A1AA] hover:text-[#E4E3E0] hover:bg-[#222222] rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden">
                    <div className="p-6 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
                        {error && (
                            <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-500 text-sm font-mono rounded">
                                {error}
                            </div>
                        )}

                        {/* Row 1 */}
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className="text-xs font-mono uppercase mb-2 block text-[#A1A1AA] tracking-wider font-bold">Environment Name</label>
                                <input
                                    required
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full bg-[#1A1A1A] border border-[#333333] p-3 text-sm focus:outline-none focus:border-[#D95D39] text-[#E4E3E0] rounded-xl transition-colors"
                                    placeholder="Prod Webapp - US-East"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-mono uppercase mb-2 block text-[#A1A1AA] tracking-wider font-bold">Environment Slug</label>
                                <input
                                    required
                                    type="text"
                                    maxLength={10}
                                    value={formData.slug || ''}
                                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                                    className="w-full bg-[#1A1A1A] border border-[#333333] p-3 text-sm focus:outline-none focus:border-[#D95D39] text-[#E4E3E0] rounded-xl transition-colors"
                                    placeholder="prod-us"
                                />
                            </div>
                        </div>

                        {/* Row 1.5 */}
                        <div className="grid grid-cols-1 gap-6">
                            <div>
                                <label className="text-xs font-mono uppercase mb-2 block text-[#A1A1AA] tracking-wider font-bold">Match Host</label>
                                <input
                                    required
                                    type="text"
                                    value={formData.match_host}
                                    onChange={(e) => setFormData({ ...formData, match_host: e.target.value })}
                                    className="w-full bg-[#1A1A1A] border border-[#333333] p-3 text-sm focus:outline-none focus:border-[#D95D39] text-[#E4E3E0] rounded-xl transition-colors"
                                    placeholder="api.example.com"
                                />
                            </div>
                        </div>

                        {/* Row 2 */}
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className="text-xs font-mono uppercase mb-2 block text-[#A1A1AA] tracking-wider font-bold">Match Type</label>
                                <select
                                    value={formData.match_type}
                                    onChange={(e) => setFormData({ ...formData, match_type: e.target.value as MatchType })}
                                    className="w-full bg-[#1A1A1A] border border-[#333333] p-3 text-sm focus:outline-none focus:border-[#D95D39] text-[#E4E3E0] rounded-xl transition-colors appearance-none"
                                >
                                    <option value="exact">exact</option>
                                    <option value="suffix">suffix</option>
                                    <option value="wildcard">wildcard</option>
                                    <option value="regex">regex</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-mono uppercase mb-2 block text-[#A1A1AA] tracking-wider font-bold">Path Regex <span className="text-[#666] normal-case tracking-normal">(Optional)</span></label>
                                <input
                                    type="text"
                                    value={formData.match_path_regex || ''}
                                    onChange={(e) => setFormData({ ...formData, match_path_regex: e.target.value })}
                                    className="w-full bg-[#1A1A1A] border border-[#333333] p-3 text-sm focus:outline-none focus:border-[#D95D39] text-[#E4E3E0] rounded-xl transition-colors"
                                    placeholder="/v1/api/users"
                                />
                            </div>
                        </div>

                        {/* Row 3 */}
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className="text-xs font-mono uppercase mb-2 block text-[#A1A1AA] tracking-wider font-bold">Priority</label>
                                <input
                                    required
                                    type="number"
                                    value={formData.priority}
                                    onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                                    className="w-full bg-[#1A1A1A] border border-[#333333] p-3 text-sm focus:outline-none focus:border-[#D95D39] text-[#E4E3E0] rounded-xl transition-colors"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-mono uppercase mb-2 block text-[#A1A1AA] tracking-wider font-bold">Default Scroll Count</label>
                                <input
                                    required
                                    type="number"
                                    min="0"
                                    value={formData.default_scroll_count}
                                    onChange={(e) => setFormData({ ...formData, default_scroll_count: parseInt(e.target.value) || 0 })}
                                    className="w-full bg-[#1A1A1A] border border-[#333333] p-3 text-sm focus:outline-none focus:border-[#D95D39] text-[#E4E3E0] rounded-xl transition-colors"
                                />
                            </div>
                        </div>

                        {/* Row 4 */}
                        <div>
                            <label className="text-xs font-mono uppercase mb-2 block text-[#A1A1AA] tracking-wider font-bold">Default Wait Selector</label>
                            <input
                                type="text"
                                value={formData.default_wait_selector || ''}
                                onChange={(e) => setFormData({ ...formData, default_wait_selector: e.target.value })}
                                className="w-full bg-[#1A1A1A] border border-[#333333] p-3 text-sm focus:outline-none focus:border-[#D95D39] text-[#E4E3E0] rounded-xl transition-colors"
                                placeholder=".loading-complete"
                            />
                        </div>

                        {/* Row 5 - Formats */}
                        <div>
                            <label className="text-xs font-mono uppercase mb-2 block text-[#A1A1AA] tracking-wider font-bold">Default Formats</label>
                            <div className="flex flex-wrap gap-2 w-full bg-[#1A1A1A] border border-[#333333] p-2 min-h-[50px] rounded-xl items-center">
                                {['markdown', 'html', 'json'].map((f) => {
                                    const isSelected = (formData.default_formats || []).includes(f);
                                    return (
                                        <button
                                            type="button"
                                            key={f}
                                            onClick={() => toggleFormat(f)}
                                            className={`px-3 py-1 text-sm font-mono tracking-wide rounded border transition-colors flex items-center gap-2
                      ${isSelected ? 'bg-[#D95D39]/10 text-[#D95D39] border-[#D95D39]/50' : 'bg-transparent text-[#666] border-[#333] hover:text-[#A1A1AA]'}`}
                                        >
                                            {f}
                                            {isSelected && <X size={12} className="opacity-70" />}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Row 6 - JSON */}
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className="text-xs font-mono uppercase mb-2 block text-[#A1A1AA] tracking-wider font-bold">Default Headers (JSON)</label>
                                <textarea
                                    value={headersJsonStr}
                                    onChange={(e) => setHeadersJsonStr(e.target.value)}
                                    className="w-full bg-[#1A1A1A] border border-[#333333] p-3 text-xs font-mono focus:outline-none focus:border-[#D95D39] text-[#E4E3E0] rounded-xl transition-colors h-32 resize-none"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-mono uppercase mb-2 block text-[#A1A1AA] tracking-wider font-bold">Cookie Jar (JSON)</label>
                                <textarea
                                    value={cookieJarJsonStr}
                                    onChange={(e) => setCookieJarJsonStr(e.target.value)}
                                    className="w-full bg-[#1A1A1A] border border-[#333333] p-3 text-xs font-mono focus:outline-none focus:border-[#D95D39] text-[#E4E3E0] rounded-xl transition-colors h-32 resize-none"
                                    placeholder='{\n  "key": "value"\n}'
                                />
                            </div>
                        </div>

                        {/* Row 7 */}
                        <div className="grid grid-cols-2 gap-6 pb-4">
                            <div>
                                <label className="text-xs font-mono uppercase mb-2 block text-[#A1A1AA] tracking-wider font-bold">Proxy Profile</label>
                                <select
                                    value={formData.proxy_profile_id || ''}
                                    onChange={(e) => setFormData({ ...formData, proxy_profile_id: e.target.value })}
                                    className="w-full bg-[#1A1A1A] border border-[#333333] p-3 text-sm focus:outline-none focus:border-[#D95D39] text-[#E4E3E0] rounded-xl transition-colors appearance-none"
                                >
                                    <option value="">Select Proxy Profile (Optional)</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-mono uppercase mb-2 block text-[#A1A1AA] tracking-wider font-bold">Notes</label>
                                <textarea
                                    value={formData.notes || ''}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    className="w-full bg-[#1A1A1A] border border-[#333333] p-3 text-sm focus:outline-none focus:border-[#D95D39] text-[#E4E3E0] rounded-xl transition-colors h-[50px] resize-none pt-3"
                                    placeholder="Optional notes for this environment"
                                />
                            </div>
                        </div>

                    </div>

                    {/* Footer Actions */}
                    <div className="flex justify-end gap-3 p-6 border-t border-[#252525] shrink-0 bg-[#121212]">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2.5 rounded-lg text-sm font-semibold tracking-wide text-[#A1A1AA] hover:text-[#E4E3E0] hover:bg-[#222222] transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-6 py-2.5 rounded-lg text-sm font-semibold tracking-wide bg-[#D95D39] text-white hover:bg-[#c44c2a] transition-colors disabled:opacity-50"
                        >
                            {isSubmitting ? 'Saving...' : (isEdit ? 'Save Changes' : 'Create Environment')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
