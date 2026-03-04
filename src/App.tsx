import React, { useState } from "react";
import {
  Search,
  Loader2,
  Code,
  Globe,
  Shield,
  Zap,
  ChevronRight,
  Terminal,
  Copy,
  Check,
  Download,
  Plus,
  Trash2,
  Type as TypeIcon,
  Hash,
  ToggleLeft,
  Braces,
  Database,
  Layout,
  LayoutDashboard,
  Code2,
  Activity,
  Hammer,
  Menu,
  Settings,
  X,
  TrendingUp,
  Clock,
  Layers,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { extractStructuredData } from "./services/geminiService";
import { EnvironmentPage } from "./components/environments/EnvironmentPage";
import { SettingsPage } from "./components/settings/SettingsPage";
import { useScrapeConfigs } from "./hooks/useScrapeConfigs";
import { useEnvironments } from "./hooks/useEnvironments";
import { useScrapingRuns } from "./hooks/useScrapingRuns";

// --- Schema Visual Editor Components ---

type SchemaValue = string | number | boolean | SchemaObject | SchemaArray;
interface SchemaObject { [key: string]: SchemaValue }
interface SchemaArray extends Array<SchemaValue> { }

interface SchemaVisualNodeProps {
  key?: React.Key;
  name: string;
  value: SchemaValue;
  depth?: number;
  onUpdate: (newName: string, newValue: SchemaValue | null) => void;
}

const SchemaVisualNode = ({
  name,
  value,
  depth = 0,
  onUpdate
}: SchemaVisualNodeProps) => {
  const [isOpen, setIsOpen] = useState(true);

  const getValueType = (val: SchemaValue): string => {
    if (Array.isArray(val)) return 'array';
    if (typeof val === 'object' && val !== null) return 'object';
    if (typeof val === 'string') {
      const lower = val.toLowerCase();
      if (['string', 'number', 'boolean', 'integer'].includes(lower)) return lower;
      return 'string';
    }
    return typeof val;
  };

  const type = getValueType(value);

  const getTypeIcon = (t: string) => {
    switch (t) {
      case 'string': return <TypeIcon size={12} className="text-emerald-600" />;
      case 'number':
      case 'integer': return <Hash size={12} className="text-blue-600" />;
      case 'boolean': return <ToggleLeft size={12} className="text-orange-600" />;
      case 'object': return <Database size={12} className="text-purple-600" />;
      case 'array': return <Layout size={12} className="text-pink-600" />;
      default: return <Braces size={12} className="text-gray-600" />;
    }
  };

  const handleTypeChange = (newType: string) => {
    let newValue: SchemaValue;
    switch (newType) {
      case 'object': newValue = {}; break;
      case 'array': newValue = ['string']; break;
      case 'number': newValue = 'number'; break;
      case 'boolean': newValue = 'boolean'; break;
      default: newValue = 'string';
    }
    onUpdate(name, newValue);
  };

  const addField = () => {
    if (type === 'object') {
      const obj = value as SchemaObject;
      const newKey = `field_${Object.keys(obj).length + 1}`;
      onUpdate(name, { ...obj, [newKey]: 'string' });
    } else if (type === 'array') {
      const arr = value as SchemaArray;
      onUpdate(name, [...arr, 'string']);
    }
  };

  return (
    <div className="group">
      <div
        className="flex items-center gap-2 py-1.5 px-2 hover:bg-[#222222] rounded transition-colors"
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {(type === 'object' || type === 'array') ? (
          <button onClick={() => setIsOpen(!isOpen)} className="p-0.5 hover:bg-[#333333] text-[#A1A1AA] hover:text-[#E4E3E0] rounded">
            <ChevronRight size={12} className={`transition-transform ${isOpen ? 'rotate-90' : ''}`} />
          </button>
        ) : (
          <div className="w-4" />
        )}

        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="p-1 bg-[#121212] border border-[#333333] rounded shadow-sm">
            {getTypeIcon(type)}
          </div>

          {name !== 'root' && name !== 'items' && (
            <input
              value={name}
              onChange={(e) => onUpdate(e.target.value, value)}
              className="bg-transparent border-none focus:ring-0 p-0 text-[11px] font-mono font-bold w-24 truncate text-[#E4E3E0] placeholder-[#333333]"
              placeholder="key"
            />
          )}

          <select
            value={type}
            onChange={(e) => handleTypeChange(e.target.value)}
            className="bg-transparent border-none focus:ring-0 p-0 text-[10px] font-mono uppercase cursor-pointer text-[#A1A1AA] hover:text-[#E4E3E0] transition-colors"
          >
            <option value="string" className="bg-[#121212] text-[#E4E3E0]">string</option>
            <option value="number" className="bg-[#121212] text-[#E4E3E0]">number</option>
            <option value="boolean" className="bg-[#121212] text-[#E4E3E0]">boolean</option>
            <option value="object" className="bg-[#121212] text-[#E4E3E0]">object</option>
            <option value="array" className="bg-[#121212] text-[#E4E3E0]">array</option>
          </select>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {(type === 'object' || type === 'array') && (
            <button onClick={addField} className="p-1 hover:bg-emerald-500/10 text-emerald-500 rounded">
              <Plus size={12} />
            </button>
          )}
          {name !== 'root' && (
            <button onClick={() => onUpdate(name, null)} className="p-1 hover:bg-rose-500/10 text-rose-500 rounded">
              <Trash2 size={12} />
            </button>
          )}
        </div>
      </div>

      {isOpen && type === 'object' && (
        <div className="border-l border-[#333333] ml-4">
          {Object.entries(value as SchemaObject).map(([propName, propValue]) => (
            <SchemaVisualNode
              key={propName}
              name={propName}
              value={propValue}
              depth={depth + 1}
              onUpdate={(newName, newValue) => {
                const obj = { ...(value as SchemaObject) };
                if (newName !== propName) {
                  delete obj[propName];
                  if (newValue !== null) obj[newName] = newValue;
                } else {
                  if (newValue === null) delete obj[propName];
                  else obj[propName] = newValue;
                }
                onUpdate(name, obj);
              }}
            />
          ))}
          <div style={{ paddingLeft: `${(depth + 1) * 16 + 8}px` }} className="py-1">
            <button
              onClick={addField}
              className="flex items-center gap-1 text-[10px] font-mono text-[#A1A1AA] hover:text-[#E4E3E0] transition-colors"
            >
              <Plus size={10} /> ADD FIELD
            </button>
          </div>
        </div>
      )}

      {isOpen && type === 'array' && (
        <div className="border-l border-[#333333] ml-4">
          {(value as SchemaArray).map((item, idx) => (
            <SchemaVisualNode
              key={idx}
              name={`[${idx}]`}
              value={item}
              depth={depth + 1}
              onUpdate={(_, newValue) => {
                const arr = [...(value as SchemaArray)];
                if (newValue === null) arr.splice(idx, 1);
                else arr[idx] = newValue;
                onUpdate(name, arr);
              }}
            />
          ))}
          <div style={{ paddingLeft: `${(depth + 1) * 16 + 8}px` }} className="py-1">
            <button
              onClick={addField}
              className="flex items-center gap-1 text-[10px] font-mono text-[#A1A1AA] hover:text-[#E4E3E0] transition-colors"
            >
              <Plus size={10} /> ADD ITEM
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const SchemaVisualEditor = ({
  schema,
  onChange
}: {
  schema: string;
  onChange: (newSchema: string) => void;
}) => {
  let parsed: SchemaValue;
  try {
    parsed = JSON.parse(schema);
  } catch (e) {
    return (
      <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded text-rose-500 text-xs font-mono">
        Invalid JSON. Switch to JSON view to fix.
      </div>
    );
  }

  return (
    <div className="bg-[#121212] border border-[#333333] rounded-sm overflow-auto max-h-[350px]">
      <div className="p-2">
        <SchemaVisualNode
          name="root"
          value={parsed}
          onUpdate={(_, newValue) => {
            if (newValue !== null) onChange(JSON.stringify(newValue, null, 2));
          }}
        />
      </div>
    </div>
  );
};

interface ScrapeResult {
  url: string;
  title: string;
  html?: string;
  markdown?: string;
  json?: any;
}

// --- Dashboard Component ---

const Dashboard = () => {
  const stats = [
    { label: 'Total Scrapes', value: '1,284', change: '+12.5%', trend: 'up', icon: Zap },
    { label: 'Success Rate', value: '99.2%', change: '+0.4%', trend: 'up', icon: Shield },
    { label: 'Avg. Latency', value: '1.4s', change: '-150ms', trend: 'down', icon: Clock },
    { label: 'Data Extracted', value: '42.8 GB', change: '+8.2%', trend: 'up', icon: Database },
  ];

  const recentActivity = [
    { id: 1, target: 'amazon.com/products', status: 'success', time: '2 mins ago', size: '1.2 MB' },
    { id: 2, target: 'twitter.com/search', status: 'success', time: '15 mins ago', size: '450 KB' },
    { id: 3, target: 'github.com/trending', status: 'error', time: '45 mins ago', size: '0 KB' },
    { id: 4, target: 'news.ycombinator.com', status: 'success', time: '1 hour ago', size: '89 KB' },
  ];

  return (
    <div className="flex-1 overflow-auto bg-[#181818] p-8 space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold uppercase tracking-tight text-[#E4E3E0]">System Overview</h2>
          <p className="text-xs font-mono text-[#A1A1AA] uppercase tracking-widest mt-1">Real-time performance metrics & node status</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-gradient-to-r from-[#D95D39] to-[#E87A5D] text-white rounded-md text-[10px] font-mono uppercase tracking-widest font-bold hover:opacity-90 transition-opacity shadow-lg shadow-[#D95D39]/20">
            Export Report
          </button>
          <button className="px-4 py-2 border border-[#333333] text-[#E4E3E0] rounded-md text-[10px] font-mono uppercase tracking-widest font-bold hover:bg-[#222222] transition-colors">
            Refresh Data
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-[#222222] border border-[#333333] rounded-xl p-6 relative overflow-hidden group">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-[#121212] text-[#D95D39] rounded-md border border-[#333333]">
                <stat.icon size={18} />
              </div>
              <div className={`flex items-center gap-1 text-[10px] font-mono font-bold ${stat.trend === 'up' ? 'text-emerald-500' : 'text-rose-500'}`}>
                {stat.trend === 'up' ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                {stat.change}
              </div>
            </div>
            <p className="text-[10px] font-mono uppercase text-[#A1A1AA] mb-1">{stat.label}</p>
            <p className="text-2xl font-bold tracking-tight text-[#E4E3E0]">{stat.value}</p>

            {/* Decorative background element */}
            <div className="absolute -right-4 -bottom-4 opacity-[0.02] group-hover:scale-110 transition-transform duration-500 text-white">
              <stat.icon size={100} />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Activity Feed */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-[#333333] pb-2">
            <h3 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2 text-[#E4E3E0]">
              <Activity size={14} className="text-[#D95D39]" /> Recent Operations
            </h3>
            <button className="text-[10px] font-mono uppercase text-[#A1A1AA] hover:text-[#E4E3E0] transition-colors">View All</button>
          </div>

          <div className="space-y-2">
            {recentActivity.map((item) => (
              <div key={item.id} className="bg-[#222222] border border-[#333333] rounded-lg p-4 flex items-center justify-between group hover:border-[#D95D39] transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`w-2 h-2 rounded-full ${item.status === 'success' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                  <div>
                    <p className="text-sm font-bold font-mono text-[#E4E3E0]">{item.target}</p>
                    <p className="text-[10px] font-mono text-[#A1A1AA] uppercase">{item.time} • {item.size}</p>
                  </div>
                </div>
                <button className="p-2 opacity-0 group-hover:opacity-100 transition-opacity text-[#A1A1AA] hover:text-[#D95D39]">
                  <ChevronRight size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Node Status */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-[#333333] pb-2">
            <h3 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2 text-[#E4E3E0]">
              <Layers size={14} className="text-[#D95D39]" /> Node Distribution
            </h3>
          </div>

          <div className="bg-[#222222] border border-[#333333] rounded-xl p-6 space-y-6">
            {[
              { region: 'US-EAST-1', load: 65, status: 'Optimal' },
              { region: 'EU-WEST-1', load: 42, status: 'Optimal' },
              { region: 'AP-SOUTH-1', load: 89, status: 'High Load' },
            ].map((node) => (
              <div key={node.region} className="space-y-2">
                <div className="flex justify-between items-end">
                  <p className="text-[10px] font-mono font-bold uppercase text-[#E4E3E0]">{node.region}</p>
                  <p className={`text-[10px] font-mono uppercase ${node.load > 80 ? 'text-rose-500' : 'text-emerald-500'}`}>{node.status}</p>
                </div>
                <div className="h-2 bg-[#121212] rounded-full relative overflow-hidden border border-[#333333]">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${node.load}%` }}
                    className={`absolute top-0 left-0 bottom-0 rounded-full ${node.load > 80 ? 'bg-rose-500' : 'bg-[#D95D39]'}`}
                  />
                </div>
              </div>
            ))}

            <div className="pt-4 border-t border-[#333333]">
              <div className="flex items-center gap-3 p-3 bg-[#D95D39]/10 border border-[#D95D39]/30 rounded-lg">
                <AlertCircle className="text-[#D95D39] shrink-0" size={16} />
                <p className="text-[10px] font-mono text-[#E4E3E0] leading-tight">
                  <span className="font-bold uppercase text-[#D95D39]">Warning:</span> High traffic detected in AP-SOUTH-1. Scaling nodes...
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [url, setUrl] = useState("https://quotes.toscrape.com/js/");
  const [waitSelector, setWaitSelector] = useState(".quote");
  const [formats, setFormats] = useState<string[]>(["JSON", "HTML"]);
  const [schema, setSchema] = useState(JSON.stringify({
    quotes: [
      {
        text: "string",
        author: "string",
        tags: ["string"]
      }
    ]
  }, null, 2));

  const [isScraping, setIsScraping] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [result, setResult] = useState<ScrapeResult | null>(null);
  const [extractedData, setExtractedData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Hook for Scrape Configurations & Environments
  const { configs: scrapeConfigs, loading: configsLoading } = useScrapeConfigs();
  const { environments } = useEnvironments();
  const [activeConfigId, setActiveConfigId] = useState<string>('');

  // Handle Loading a Configuration
  const handleLoadConfig = (configId: string) => {
    setActiveConfigId(configId);
    if (!configId) return;

    const config = scrapeConfigs.find(c => c.id === configId);
    if (config) {
      if (config.example_url) setUrl(config.example_url);
      if (config.wait_selector) setWaitSelector(config.wait_selector);
      if (config.formats) setFormats(config.formats);

      const rt = config.options?.requestTemplate;
      if (rt) {
        if (rt.formats) setTemplateFormats(rt.formats);
        if (rt.capture?.primarySource) setTemplatePrimarySource(rt.capture.primarySource);
        if (rt.capture?.network?.urlIncludes) setTemplateUrlIncludes(rt.capture.network.urlIncludes);
      } else {
        // Reset to defaults if no template
        setTemplateFormats(["JSON"]);
        setTemplatePrimarySource("network");
        setTemplateUrlIncludes("/Flight/GetLowFareAvailability");
      }
    }
  };

  // New state for collapsible groups and raw output
  const [isResponseOpen, setIsResponseOpen] = useState(true);
  const [isRawOutputOpen, setIsRawOutputOpen] = useState(false);
  const [rawResponse, setRawResponse] = useState<any>(null);

  // Request Template states
  const [templateFormats, setTemplateFormats] = useState<string[]>(["JSON"]);
  const [templatePrimarySource, setTemplatePrimarySource] = useState<"auto" | "dom" | "network">("network");
  const [templateUrlIncludes, setTemplateUrlIncludes] = useState("/Flight/GetLowFareAvailability");

  // Left panel collapsible states
  const [isTargetConfigOpen, setIsTargetConfigOpen] = useState(true);
  const [isDevOptionsOpen, setIsDevOptionsOpen] = useState(true);
  const [isVisualSchema, setIsVisualSchema] = useState(false);

  // New features state
  const [activeTab, setActiveTab] = useState<"preview" | "data" | "history" | "export">("data");

  // Scrape history state
  const { runs: runHistory, fetchRuns } = useScrapingRuns();
  const [logs, setLogs] = useState<Array<{ timestamp: number, message: string, type: 'info' | 'error' | 'success' }>>([]);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [isSendingWebhook, setIsSendingWebhook] = useState(false);
  const [webhookStatus, setWebhookStatus] = useState<string | null>(null);

  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [saveConfigName, setSaveConfigName] = useState("");
  const { createConfig } = useScrapeConfigs();

  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});

  const handleCopyData = async (data: string, id: string) => {
    await navigator.clipboard.writeText(data);
    setCopiedStates(prev => ({ ...prev, [id]: true }));
    setTimeout(() => setCopiedStates(prev => ({ ...prev, [id]: false })), 2000);
  };

  const handleDownloadData = (data: string, filename: string, type: string) => {
    const blob = new Blob([data], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSaveConfig = async () => {
    try {
      await createConfig({
        name: saveConfigName,
        example_url: url,
        wait_selector: waitSelector,
        formats: formats,
        options: {
          requestTemplate: {
            formats: templateFormats,
            capture: {
              primarySource: templatePrimarySource,
              ...(templatePrimarySource === 'network' ? { network: { urlIncludes: templateUrlIncludes } } : {})
            }
          }
        },
        is_favorite: false
      });
      setIsSaveModalOpen(false);
      setSaveConfigName("");
      addLog(`Saved configuration '${saveConfigName}'`, 'success');
    } catch (err: any) {
      addLog(`Failed to save config: ${err.message}`, 'error');
    }
  };

  // Resizable Panel State
  const [leftPanelWidth, setLeftPanelWidth] = useState(450);
  const [isResizing, setIsResizing] = useState(false);
  const [isSideMenuOpen, setIsSideMenuOpen] = useState(false);
  const [activePage, setActivePage] = useState<'scrape' | 'dashboard' | 'environment' | 'settings'>('scrape');

  const startResizing = React.useCallback((e: React.MouseEvent) => {
    setIsResizing(true);
    e.preventDefault();
  }, []);

  const stopResizing = React.useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = React.useCallback((e: MouseEvent) => {
    if (isResizing) {
      const newWidth = e.clientX;
      // Constrain width between 300px and 800px
      if (newWidth > 300 && newWidth < 800) {
        setLeftPanelWidth(newWidth);
      }
    }
  }, [isResizing]);

  React.useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', resize);
      window.addEventListener('mouseup', stopResizing);
    } else {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    }
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [isResizing, resize, stopResizing]);

  const addLog = (message: string, type: 'info' | 'error' | 'success' = 'info') => {
    setLogs(prev => [...prev, { timestamp: Date.now(), message, type }]);
  };

  React.useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'ELEMENT_CLICKED') {
        const { text, tagName, className } = event.data;
        // Simple heuristic to add to schema
        try {
          const currentSchema = JSON.parse(schema);
          const suggestedKey = (tagName || 'field').toLowerCase() + '_' + Math.floor(Math.random() * 1000);

          if (typeof currentSchema === 'object' && currentSchema !== null && !Array.isArray(currentSchema)) {
            const newSchema = { ...currentSchema, [suggestedKey]: "string" };
            setSchema(JSON.stringify(newSchema, null, 2));
            addLog(`Added field '${suggestedKey}' from visual selection`, 'success');
          }
        } catch (e) {
          addLog('Could not add field to schema: invalid JSON', 'error');
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [schema]);

  const buildScrapeRequest = () => {
    // 4) System Defaults
    const payload: any = {
      scrollCount: 1,
      formats: ["JSON"],
      waitSelector: "",
    };

    const activeConfig = scrapeConfigs.find(c => c.id === activeConfigId);
    let activeEnv: any = null;

    if (activeConfig?.environment?.id) {
      activeEnv = environments.find(e => e.id === activeConfig.environment?.id);
    }

    // 3) Environment Defaults
    if (activeEnv) {
      if (activeEnv.default_formats) payload.formats = activeEnv.default_formats;
      if (activeEnv.default_wait_selector) payload.waitSelector = activeEnv.default_wait_selector;
      if (activeEnv.default_scroll_count !== undefined && activeEnv.default_scroll_count !== null) payload.scrollCount = activeEnv.default_scroll_count;
      if (activeEnv.default_headers) payload.headers = activeEnv.default_headers;
      if (activeEnv.cookie_jar) payload.cookies = activeEnv.cookie_jar;
    }

    // 2) Configuration Request Template
    const template = activeConfig?.options?.requestTemplate;
    if (template) {
      if (template.formats) payload.formats = template.formats;
      if (template.capture) payload.capture = template.capture;
    }

    // 1) UI Overrides (Highest Precedence)
    if (url) payload.url = url;
    if (formats && formats.length > 0) payload.formats = formats;
    if (waitSelector) payload.waitSelector = waitSelector;

    if (templateFormats && templateFormats.length > 0) payload.formats = templateFormats;
    if (templatePrimarySource) {
      payload.capture = {
        primarySource: templatePrimarySource,
        network: templatePrimarySource === 'network' ? { urlIncludes: templateUrlIncludes } : undefined
      };
    }

    // Explicit overrides based on instructions (for network intercept configs)
    if (payload.capture?.primarySource === 'network') {
      payload.waitSelector = ""; // Ignore wait selector
    }

    return payload;
  };

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const handleScrape = async () => {
    setIsScraping(true);
    setError(null);
    setResult(null);
    setExtractedData(null);
    setRawResponse(null);
    setWebhookStatus(null);

    const runId = Math.random().toString(36).substring(7);
    addLog(`Starting scrape for ${url}`, 'info');

    try {
      const payload = buildScrapeRequest();
      const response = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const headers: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });

      let data;
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      setRawResponse({
        status: response.status,
        statusText: response.statusText,
        headers,
        body: data,
        ok: response.ok
      });

      if (!response.ok) {
        const errorMessage = typeof data === 'object' ? (data.error || "Scrape failed") : "Scrape failed with non-JSON response";
        throw new Error(errorMessage);
      }

      if (data && typeof data === 'object' && data.ok === false) {
        setResult(data);
        addLog(`Scrape completed with diagnostic payload: ${data.errorType}`, 'error');
      } else {
        setResult(data.data);
        const contentToExtract = data.data?.markdown || data.data?.html || "";
        const size = contentToExtract.length;
        addLog(`Scrape successful. Content size: ${(size / 1024).toFixed(2)} KB`, 'success');

        setIsExtracting(true);
        addLog(`Starting AI extraction using Gemini...`, 'info');
        const extracted = await extractStructuredData(contentToExtract, JSON.parse(schema));
        setExtractedData(extracted);
        addLog(`AI extraction complete.`, 'success');
      }

      addLog(`Scraping completed for ${url}`, 'success');

      // Fetch the newly updated database records for Run History
      await fetchRuns();

      setActiveTab('data');
    } catch (err: any) {
      setError(err.message);

      addLog(`Scraping failed: ${err.message}`, 'error');

      // Fetch the newly updated database records to show the failed attempt
      await fetchRuns();

      if (!rawResponse) {
        setRawResponse(prev => prev || {
          status: 0,
          statusText: "Network Error",
          headers: {},
          body: err.message,
          ok: false
        });
      }
    } finally {
      setIsScraping(false);
      setIsExtracting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const sendToWebhook = async () => {
    if (!webhookUrl || !extractedData) return;
    setIsSendingWebhook(true);
    setWebhookStatus(null);
    addLog(`Sending data to webhook: ${webhookUrl}`, 'info');

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: result?.url,
          timestamp: new Date().toISOString(),
          data: extractedData
        })
      });

      if (response.ok) {
        setWebhookStatus('success');
        addLog(`Webhook sent successfully (${response.status})`, 'success');
      } else {
        setWebhookStatus(`error: ${response.status}`);
        addLog(`Webhook failed with status ${response.status}`, 'error');
      }
    } catch (err: any) {
      setWebhookStatus(`error: ${err.message}`);
      addLog(`Webhook error: ${err.message}`, 'error');
    } finally {
      setIsSendingWebhook(false);
    }
  };

  const navItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'scrape', icon: Zap, label: 'Scrape' },
    { id: 'api', icon: Code2, label: 'API' },
    { id: 'environment', icon: Globe, label: 'Environment' },
    { id: 'activity', icon: Activity, label: 'Activity' },
    { id: 'workbench', icon: Hammer, label: 'Workbench' },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="h-screen flex flex-col bg-[#181818] text-[#E4E3E0] font-sans selection:bg-[#D95D39] selection:text-white overflow-hidden relative">
      {/* Side Menu Overlay */}
      <AnimatePresence>
        {isSideMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSideMenuOpen(false)}
              className="absolute inset-0 bg-[#000000]/60 backdrop-blur-sm z-40"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute top-0 left-0 bottom-0 w-72 bg-[#121212] text-[#E4E3E0] z-50 flex flex-col shadow-2xl border-r border-[#333333]"
            >
              <div className="p-8 border-b border-[#333333] flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-[#D95D39] flex items-center justify-center rounded-md">
                    <Zap className="text-white w-5 h-5" />
                  </div>
                  <span className="font-bold tracking-tight uppercase text-lg">QuarryMiner</span>
                </div>
                <button
                  onClick={() => setIsSideMenuOpen(false)}
                  className="p-2 hover:bg-[#222222] rounded-full transition-colors text-[#A1A1AA] hover:text-[#E4E3E0]"
                >
                  <X size={20} />
                </button>
              </div>

              <nav className="flex-1 p-6 space-y-2">
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (item.id === 'dashboard' || item.id === 'scrape' || item.id === 'environment' || item.id === 'settings') {
                        setActivePage(item.id as any);
                        setIsSideMenuOpen(false);
                      }
                    }}
                    className={`w-full flex items-center gap-4 px-4 py-3 rounded-md transition-all group ${activePage === item.id
                      ? 'bg-[#222222] text-[#D95D39]'
                      : 'hover:bg-[#222222] text-[#A1A1AA] hover:text-[#E4E3E0]'
                      }`}
                  >
                    <item.icon size={18} className={activePage === item.id ? '' : 'group-hover:scale-110 transition-transform'} />
                    <span className="text-xs font-mono uppercase tracking-widest font-bold">{item.label}</span>
                  </button>
                ))}
              </nav>

              <div className="p-8 border-t border-[#333333]">
                <div className="flex items-center gap-3 opacity-60">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                  </div>
                  <div className="text-[10px] font-mono uppercase">
                    <p className="font-bold text-[#E4E3E0]">System Online</p>
                    <p className="text-[#A1A1AA]">Region: US-EAST-1</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="border-b border-[#333333] p-6 flex justify-between items-center bg-[#121212]">
        <div
          className="flex items-center gap-3 cursor-pointer group"
          onClick={() => setIsSideMenuOpen(true)}
        >
          <div className="w-10 h-10 bg-[#D95D39] flex items-center justify-center rounded-md group-hover:scale-105 transition-transform shadow-lg shadow-[#D95D39]/20">
            <Zap className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight uppercase group-hover:translate-x-1 transition-transform text-[#E4E3E0]">QuarryMiner</h1>
            <p className="text-[10px] font-mono text-[#A1A1AA] uppercase tracking-widest">Autonomous Scraping & Extraction</p>
          </div>
        </div>
        <div className="flex gap-4 text-[11px] font-mono uppercase text-[#A1A1AA]">
          <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#D95D39] mr-1" /> Stealth Active</div>
          <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#D95D39] mr-1" /> Proxy Ready</div>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {activePage === 'dashboard' ? (
          <Dashboard />
        ) : activePage === 'environment' ? (
          <EnvironmentPage />
        ) : activePage === 'settings' ? (
          <SettingsPage />
        ) : (
          <>
            {/* Left Panel: Configuration */}
            <div
              className="border-r border-[#333333] p-0 flex flex-col bg-[#121212] shrink-0 h-full"
              style={{ width: `${leftPanelWidth}px` }}
            >
              <div className="flex-1 overflow-auto">
                {/* Target Configuration Group */}
                <section className="border-b border-[#333333]">
                  <button
                    onClick={() => setIsTargetConfigOpen(!isTargetConfigOpen)}
                    className="w-full flex items-center justify-between p-4 bg-[#181818] hover:bg-[#222222] transition-colors border-b border-[#333333]"
                  >
                    <div className="flex items-center gap-2">
                      <ChevronRight className={`transition-transform duration-200 text-[#A1A1AA] ${isTargetConfigOpen ? 'rotate-90' : ''}`} size={14} />
                      <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#E4E3E0]">Target Configuration</h3>
                    </div>
                  </button>

                  <AnimatePresence initial={false}>
                    {isTargetConfigOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden bg-[#121212]"
                      >
                        <div className="p-6 space-y-4">

                          {/* Load Configuration Dropdown */}
                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <label className="text-[10px] font-mono uppercase block text-[#A1A1AA]">Load Saved Configuration</label>
                              {configsLoading && <Loader2 size={12} className="animate-spin text-[#D95D39]" />}
                            </div>
                            <select
                              value={activeConfigId}
                              onChange={(e) => handleLoadConfig(e.target.value)}
                              className="w-full bg-[#1A1A1A] border border-[#333333] p-2.5 text-sm focus:outline-none focus:border-[#D95D39] text-[#E4E3E0] rounded-md transition-colors appearance-none"
                            >
                              <option value="">-- Select a Saved Configuration --</option>
                              {scrapeConfigs.map(config => (
                                <option key={config.id} value={config.id}>
                                  {config.name} {config.environment?.name ? `(${config.environment.name})` : ''}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="border-t border-[#333333] pt-4">
                            <label className="text-[10px] font-mono uppercase mb-1 block text-[#A1A1AA]">Target URL</label>
                            <div className="relative">
                              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A1A1AA]" />
                              <input
                                type="text"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                className="w-full bg-[#181818] border border-[#333333] py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-[#D95D39] text-[#E4E3E0] rounded-md transition-colors"
                                placeholder="https://example.com"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="text-[10px] font-mono uppercase mb-1 block text-[#A1A1AA]">Wait Selector (Smart Wait)</label>
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A1A1AA]" />
                              <input
                                type="text"
                                value={waitSelector}
                                onChange={(e) => setWaitSelector(e.target.value)}
                                className="w-full bg-[#181818] border border-[#333333] py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-[#D95D39] text-[#E4E3E0] rounded-md transition-colors"
                                placeholder=".product-item"
                              />
                            </div>
                            {templatePrimarySource === 'network' && waitSelector && (
                              <p className="text-[9px] font-mono uppercase text-rose-500 mt-1.5 flex items-center gap-1">
                                <AlertCircle size={10} />
                                This parameter should be empty when Primary Source is Network Interception
                              </p>
                            )}
                          </div>
                          <div>
                            <label className="text-[10px] font-mono uppercase mb-1 block text-[#A1A1AA]">Output Formats</label>
                            <div className="flex flex-wrap gap-2">
                              {["Markdown", "HTML", "JSON"].map((f) => (
                                <button
                                  key={f}
                                  onClick={() => {
                                    setFormats(prev =>
                                      prev.includes(f)
                                        ? prev.filter(item => item !== f)
                                        : [...prev, f]
                                    )
                                  }}
                                  className={`px-3 py-1.5 text-[10px] font-mono uppercase border transition-all rounded-md ${formats.includes(f)
                                    ? 'bg-gradient-to-r from-[#D95D39] to-[#E87A5D] border-transparent text-white shadow-md shadow-[#D95D39]/20'
                                    : 'bg-[#181818] border-[#333333] text-[#A1A1AA] hover:border-[#D95D39] hover:text-[#E4E3E0]'
                                    }`}
                                >
                                  {f}
                                </button>
                              ))}
                            </div>
                          </div>
                          {formats.includes("JSON") && (
                            <div className="pt-2">
                              <div className="flex items-center justify-between mb-1">
                                <label className="text-[10px] font-mono uppercase text-[#A1A1AA]">Extraction Schema</label>
                                <div className="flex bg-[#181818] p-0.5 rounded-md border border-[#333333]">
                                  <button
                                    onClick={() => setIsVisualSchema(false)}
                                    className={`px-2 py-0.5 text-[9px] font-mono uppercase rounded-sm transition-all ${!isVisualSchema ? 'bg-[#333333] text-[#E4E3E0]' : 'text-[#A1A1AA] hover:text-[#E4E3E0]'}`}
                                  >
                                    JSON
                                  </button>
                                  <button
                                    onClick={() => setIsVisualSchema(true)}
                                    className={`px-2 py-0.5 text-[9px] font-mono uppercase rounded-sm transition-all ${isVisualSchema ? 'bg-[#333333] text-[#E4E3E0]' : 'text-[#A1A1AA] hover:text-[#E4E3E0]'}`}
                                  >
                                    Visual
                                  </button>
                                </div>
                              </div>
                              <div className="relative h-[350px]">
                                {isVisualSchema ? (
                                  <SchemaVisualEditor
                                    schema={schema}
                                    onChange={setSchema}
                                  />
                                ) : (
                                  <>
                                    <Code className="absolute right-3 top-3 w-4 h-4 text-[#A1A1AA] pointer-events-none" />
                                    <textarea
                                      value={schema}
                                      onChange={(e) => setSchema(e.target.value)}
                                      className="w-full h-full bg-[#181818] border border-[#333333] p-4 text-xs font-mono focus:outline-none focus:border-[#D95D39] text-[#E4E3E0] rounded-md resize-none transition-colors"
                                      spellCheck={false}
                                    />
                                  </>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Request Template Config Block */}
                          <div className="border-t border-[#333333] pt-4 mt-4">
                            <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#E4E3E0] mb-4 flex items-center gap-2">
                              <Code2 size={12} className="text-[#D95D39]" /> Request Template
                            </h4>
                            <div className="space-y-4">
                              <div>
                                <label className="text-[10px] font-mono uppercase mb-1 block text-[#A1A1AA]">Template Formats</label>
                                <div className="flex flex-wrap gap-2">
                                  {["Markdown", "HTML", "JSON"].map((f) => (
                                    <button
                                      key={`template-${f}`}
                                      onClick={() => {
                                        setTemplateFormats(prev =>
                                          prev.includes(f)
                                            ? prev.filter(item => item !== f)
                                            : [...prev, f]
                                        )
                                      }}
                                      className={`px-3 py-1.5 text-[10px] font-mono uppercase border transition-all rounded-md ${templateFormats.includes(f)
                                        ? 'bg-[#333333] border-transparent text-[#E4E3E0]'
                                        : 'bg-[#181818] border-[#333333] text-[#A1A1AA] hover:border-[#D95D39]'
                                        }`}
                                    >
                                      {f}
                                    </button>
                                  ))}
                                </div>
                              </div>
                              <div>
                                <label className="text-[10px] font-mono uppercase mb-1 block text-[#A1A1AA]">Primary Source</label>
                                <select
                                  value={templatePrimarySource}
                                  onChange={(e: any) => {
                                    const val = e.target.value;
                                    setTemplatePrimarySource(val);
                                    if (val === 'network') {
                                      setSchema(JSON.stringify({}, null, 2));
                                    }
                                  }}
                                  className="w-full bg-[#181818] border border-[#333333] p-2.5 text-sm focus:outline-none focus:border-[#D95D39] text-[#E4E3E0] rounded-md transition-colors appearance-none"
                                >
                                  <option value="auto">Auto</option>
                                  <option value="dom">DOM</option>
                                  <option value="network">Network Interception</option>
                                </select>
                              </div>
                              {templatePrimarySource === 'network' && (
                                <div>
                                  <label className="text-[10px] font-mono uppercase mb-1 block text-[#A1A1AA]">Network URL Includes</label>
                                  <input
                                    type="text"
                                    value={templateUrlIncludes}
                                    onChange={(e) => setTemplateUrlIncludes(e.target.value)}
                                    className="w-full bg-[#181818] border border-[#333333] py-2.5 px-4 text-sm focus:outline-none focus:border-[#D95D39] text-[#E4E3E0] rounded-md transition-colors"
                                    placeholder="/api/v1/data"
                                  />
                                </div>
                              )}
                            </div>
                          </div>

                        </div>
                        <div className="border-t border-[#333333] p-4 bg-[#181818] flex justify-end">
                          <button
                            onClick={() => setIsSaveModalOpen(true)}
                            className="text-[10px] font-mono uppercase tracking-widest text-[#D95D39] hover:text-[#E87A5D] transition-colors border border-[#D95D39]/30 px-3 py-1.5 rounded bg-[#D95D39]/5"
                          >
                            Save Configuration
                          </button>
                        </div>
                        <div className="border-t border-[#333333] p-4 bg-[#121212]">
                          <button
                            onClick={() => setIsPreviewOpen(!isPreviewOpen)}
                            className="w-full flex items-center justify-between text-[10px] font-mono uppercase tracking-widest text-[#A1A1AA] hover:text-[#E4E3E0] transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <ChevronRight className={`transition-transform duration-200 ${isPreviewOpen ? 'rotate-90' : ''}`} size={12} />
                              Request Preview
                            </div>
                          </button>
                          {isPreviewOpen && (
                            <div className="mt-4 p-3 bg-[#181818] border border-[#333333] rounded-md overflow-x-auto">
                              <pre className="text-[10px] font-mono text-[#E4E3E0]">
                                {JSON.stringify(buildScrapeRequest(), null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </section>
              </div>

              <div className="p-6 bg-[#121212]">
                <button
                  onClick={handleScrape}
                  disabled={isScraping || isExtracting}
                  className="w-full bg-gradient-to-r from-[#D95D39] to-[#E87A5D] text-white py-4 font-bold uppercase tracking-widest flex items-center justify-center gap-3 hover:opacity-90 disabled:opacity-50 transition-all shadow-lg shadow-[#D95D39]/20 active:scale-[0.98] rounded-md"
                >
                  {isScraping ? (
                    <>
                      <Loader2 className="animate-spin" />
                      Scraping...
                    </>
                  ) : isExtracting ? (
                    <>
                      <Loader2 className="animate-spin" />
                      Extracting...
                    </>
                  ) : (
                    <>
                      <Zap size={18} />
                      Scrape & Extract
                    </>
                  )}
                </button>
              </div>
            </div>
            {/* End of Left Side configuration wrappers */}
            <div
              onMouseDown={startResizing}
              className={`w-1 hover:w-1.5 bg-transparent cursor-col-resize transition-all hover:bg-[#D95D39] active:bg-[#D95D39] z-10 shrink-0 ${isResizing ? 'bg-[#D95D39] w-1.5' : ''}`}
            />

            {/* Right Panel: Output */}
            <div className="flex-1 bg-[#181818] overflow-hidden flex flex-col">
              <div className="border-b border-[#333333] flex bg-[#121212]">
                <button
                  onClick={() => setActiveTab('data')}
                  className={`px-6 py-4 text-[11px] font-bold uppercase tracking-wider border-r border-[#333333] transition-colors ${activeTab === 'data' ? 'bg-[#181818] text-[#D95D39] border-b-2 border-b-[#D95D39]' : 'text-[#A1A1AA] hover:bg-[#222222] hover:text-[#E4E3E0]'}`}
                >
                  Extracted Data
                </button>
                <button
                  onClick={() => setActiveTab('preview')}
                  className={`px-6 py-4 text-[11px] font-bold uppercase tracking-wider border-r border-[#333333] transition-colors ${activeTab === 'preview' ? 'bg-[#181818] text-[#D95D39] border-b-2 border-b-[#D95D39]' : 'text-[#A1A1AA] hover:bg-[#222222] hover:text-[#E4E3E0]'}`}
                >
                  Live Preview
                </button>
                <button
                  onClick={() => setActiveTab('history')}
                  className={`px-6 py-4 text-[11px] font-bold uppercase tracking-wider border-r border-[#333333] transition-colors ${activeTab === 'history' ? 'bg-[#181818] text-[#D95D39] border-b-2 border-b-[#D95D39]' : 'text-[#A1A1AA] hover:bg-[#222222] hover:text-[#E4E3E0]'}`}
                >
                  Run History & Logs
                </button>
                <button
                  onClick={() => setActiveTab('export')}
                  className={`px-6 py-4 text-[11px] font-bold uppercase tracking-wider border-r border-[#333333] transition-colors ${activeTab === 'export' ? 'bg-[#181818] text-[#D95D39] border-b-2 border-b-[#D95D39]' : 'text-[#A1A1AA] hover:bg-[#222222] hover:text-[#E4E3E0]'}`}
                >
                  Export
                </button>
                <div className="flex-1" />
                {extractedData && activeTab === 'data' && (
                  <button
                    onClick={() => copyToClipboard(JSON.stringify(extractedData, null, 2))}
                    className="px-6 py-4 text-[10px] font-mono uppercase flex items-center gap-2 hover:bg-[#222222] text-[#A1A1AA] hover:text-[#E4E3E0] transition-colors border-l border-[#333333]"
                  >
                    {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                    {copied ? <span className="text-emerald-500">Copied</span> : 'Copy JSON'}
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-auto p-0 relative">
                <AnimatePresence mode="wait">
                  {activeTab === 'data' && (
                    <motion.div
                      key="data"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="p-8 h-full overflow-auto"
                    >
                      {error && (
                        <div className="space-y-4 mb-6">
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-rose-500/10 border border-rose-500/20 p-4 text-rose-500 text-sm font-mono rounded-md"
                          >
                            [ERROR]: {error}
                          </motion.div>

                          {/* Show diagnostics on error too */}
                          {!result && rawResponse && (
                            <section className="border border-[#333333] overflow-hidden rounded-md">
                              <button
                                onClick={() => setIsRawOutputOpen(!isRawOutputOpen)}
                                className="w-full flex items-center justify-between p-4 bg-[#222222] hover:bg-[#333333] transition-colors"
                              >
                                <div className="flex items-center gap-2">
                                  <ChevronRight className={`transition-transform duration-200 text-[#A1A1AA] ${isRawOutputOpen ? 'rotate-90' : ''}`} size={16} />
                                  <h3 className="text-sm font-bold uppercase tracking-wider text-[#E4E3E0]">Raw Output & Diagnostics</h3>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${rawResponse.ok ? 'bg-emerald-500/20 text-emerald-500' : 'bg-rose-500/20 text-rose-500'}`}>
                                    {rawResponse.ok ? 'SUCCESS' : 'FAILED'} {rawResponse.status}
                                  </span>
                                </div>
                              </button>

                              <AnimatePresence>
                                {isRawOutputOpen && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden"
                                  >
                                    <div className="p-6 bg-[#181818] space-y-6">
                                      <div>
                                        <label className="text-[10px] font-mono uppercase text-[#A1A1AA] block mb-2">Response Headers</label>
                                        <div className="bg-[#121212] p-4 border border-[#333333] rounded-md">
                                          <pre className="text-[10px] font-mono overflow-auto max-h-[150px] text-[#E4E3E0]">
                                            {JSON.stringify(rawResponse.headers, null, 2)}
                                          </pre>
                                        </div>
                                      </div>
                                      <div>
                                        <div className="flex items-center justify-between mb-2">
                                          <label className="text-[10px] font-mono uppercase text-[#A1A1AA]">Response Body</label>
                                          <div className="flex gap-3">
                                            <button
                                              onClick={() => handleCopyData(typeof rawResponse.body === 'string' ? rawResponse.body : JSON.stringify(rawResponse.body, null, 2), 'error-body')}
                                              className="text-[#A1A1AA] hover:text-[#E4E3E0] transition-colors flex items-center gap-1 text-[9px] uppercase tracking-wider"
                                              title="Copy Response Body"
                                            >
                                              {copiedStates['error-body'] ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                                            </button>
                                            <button
                                              onClick={() => handleDownloadData(typeof rawResponse.body === 'string' ? rawResponse.body : JSON.stringify(rawResponse.body, null, 2), 'error_response_body.txt', 'text/plain')}
                                              className="text-[#A1A1AA] hover:text-[#E4E3E0] transition-colors flex items-center gap-1 text-[9px] uppercase tracking-wider"
                                              title="Download Response Body"
                                            >
                                              <Download size={12} />
                                            </button>
                                          </div>
                                        </div>
                                        <div className="bg-[#121212] p-4 border border-[#333333] rounded-md">
                                          <pre className="text-[10px] font-mono overflow-auto max-h-[300px] text-[#E4E3E0]">
                                            {typeof rawResponse.body === 'string'
                                              ? rawResponse.body.slice(0, 5000) + (rawResponse.body.length > 5000 ? '...' : '')
                                              : JSON.stringify(rawResponse.body, null, 2)}
                                          </pre>
                                        </div>
                                      </div>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </section>
                          )}
                        </div>
                      )}

                      {!result && !isScraping && !error && (
                        <div className="h-full flex flex-col items-center justify-center opacity-20">
                          <Terminal size={64} strokeWidth={1} className="text-[#E4E3E0]" />
                          <p className="mt-4 font-mono text-sm uppercase tracking-widest text-center text-[#E4E3E0]">
                            Awaiting target URL...<br />
                            Engine ready for deployment.
                          </p>
                        </div>
                      )}

                      {isScraping && (
                        <div className="h-full flex flex-col items-center justify-center">
                          <Loader2 className="animate-spin w-12 h-12 mb-4 text-[#D95D39] opacity-50" />
                          <div className="space-y-2 text-center text-[#E4E3E0]">
                            <p className="font-mono text-xs uppercase animate-pulse">Initializing Stealth Browser...</p>
                            <p className="font-mono text-[10px] text-[#A1A1AA] uppercase">Rotating Fingerprints & User-Agents...</p>
                          </div>
                        </div>
                      )}

                      {result && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="space-y-6"
                        >
                          {result.ok === false && (
                            <section className="border border-rose-900/50 overflow-hidden rounded-md bg-rose-950/20 mb-6">
                              <div className="p-4 border-b border-rose-900/50 flex justify-between items-center">
                                <div>
                                  <h3 className="text-sm font-bold uppercase tracking-wider text-rose-500 flex items-center gap-2">
                                    <AlertCircle size={16} /> Blocked / Diagnostic
                                  </h3>
                                  <p className="text-xs text-rose-400/80 mt-1">{result.message}</p>
                                </div>
                                <span className="text-[10px] uppercase font-mono bg-rose-900/30 text-rose-400 px-2 py-1 rounded border border-rose-900/50">
                                  {result.errorType}
                                </span>
                              </div>
                              <div className="p-4 flex flex-col md:flex-row gap-6">
                                {result.diagnostics?.screenshotBase64 && (
                                  <div className="w-full md:w-1/3">
                                    <label className="text-[10px] font-mono uppercase text-rose-400/80 mb-2 block">Screenshot</label>
                                    <img src={`data:image/png;base64,${result.diagnostics.screenshotBase64}`} alt="Diagnostic Screenshot" className="border border-rose-900/50 rounded-md object-contain w-full bg-black/50" />
                                  </div>
                                )}
                                <div className="w-full md:w-2/3 space-y-4">
                                  <div>
                                    <label className="text-[10px] font-mono uppercase text-rose-400/80 mb-1 block">Final URL</label>
                                    <p className="text-xs font-mono text-rose-200/90 break-all">{result.diagnostics?.finalUrl}</p>
                                  </div>
                                  <div>
                                    <label className="text-[10px] font-mono uppercase text-rose-400/80 mb-1 block">Page Title</label>
                                    <p className="text-xs font-mono text-rose-200/90">{result.diagnostics?.title}</p>
                                  </div>
                                  {result.diagnostics?.detectedMarkers?.length > 0 && (
                                    <div>
                                      <label className="text-[10px] font-mono uppercase text-rose-400/80 mb-1 block">Detected Markers</label>
                                      <div className="flex flex-wrap gap-2">
                                        {result.diagnostics.detectedMarkers.map((m: any, i: number) => (
                                          <span key={i} className="text-[10px] bg-rose-900/40 text-rose-300 px-2 py-0.5 rounded border border-rose-900/50 uppercase font-mono">{m}</span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  {result.diagnostics?.htmlSnippet && (
                                    <div>
                                      <div className="flex justify-between items-center mb-1">
                                        <label className="text-[10px] font-mono uppercase text-rose-400/80 block">HTML Snippet</label>
                                        <button onClick={() => navigator.clipboard.writeText(result.diagnostics?.htmlSnippet || "")} className="text-[10px] uppercase font-mono flex items-center gap-1 text-rose-400 hover:text-rose-300 transition-colors">
                                          <Copy size={12} /> Copy
                                        </button>
                                      </div>
                                      <pre className="text-[10px] font-mono text-rose-200/70 bg-black/40 p-3 rounded-md border border-rose-900/30 overflow-auto max-h-[150px] whitespace-pre-wrap break-all">
                                        {result.diagnostics?.htmlSnippet}
                                      </pre>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </section>
                          )}

                          {/* Metadata Section */}
                          <section className="grid grid-cols-2 gap-4">
                            <div className="border border-[#333333] p-4 bg-[#222222] rounded-md">
                              <label className="text-[9px] font-mono uppercase text-[#A1A1AA] block mb-1">Page Title</label>
                              <p className="text-sm font-medium truncate text-[#E4E3E0]">{result.title}</p>
                            </div>
                            <div className="border border-[#333333] p-4 bg-[#222222] rounded-md">
                              <label className="text-[9px] font-mono uppercase text-[#A1A1AA] block mb-1">Source URL</label>
                              <p className="text-sm font-medium truncate text-[#E4E3E0]">{result.url}</p>
                            </div>
                          </section>

                          {/* Collapsible Response Group */}
                          <section className="border border-[#333333] overflow-hidden rounded-md">
                            <button
                              onClick={() => setIsResponseOpen(!isResponseOpen)}
                              className="w-full flex items-center justify-between p-4 bg-[#222222] hover:bg-[#333333] transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                <ChevronRight className={`transition-transform duration-200 text-[#A1A1AA] ${isResponseOpen ? 'rotate-90' : ''}`} size={16} />
                                <h3 className="text-sm font-bold uppercase tracking-wider text-[#E4E3E0]">AI Extracted Data</h3>
                              </div>
                              <span className="text-[10px] font-mono text-[#A1A1AA] uppercase">
                                {isExtracting ? 'Extracting...' : 'Complete'}
                              </span>
                            </button>

                            <AnimatePresence>
                              {isResponseOpen && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="overflow-hidden"
                                >
                                  <div className="p-6 bg-[#181818]">
                                    {isExtracting ? (
                                      <div className="flex flex-col items-center justify-center py-8 bg-[#121212] border border-dashed border-[#333333] rounded-md">
                                        <Loader2 className="animate-spin w-8 h-8 mb-4 text-[#D95D39] opacity-50" />
                                        <p className="font-mono text-[10px] uppercase text-[#A1A1AA]">Gemini 3.1 analyzing DOM structure...</p>
                                      </div>
                                    ) : extractedData ? (
                                      <div className="bg-[#121212] text-[#E4E3E0] p-6 rounded-md border border-[#333333]">
                                        <pre className="text-xs font-mono overflow-auto max-h-[500px] scrollbar-hide">
                                          {JSON.stringify(extractedData, null, 2)}
                                        </pre>
                                      </div>
                                    ) : (
                                      <p className="text-xs font-mono text-[#A1A1AA] italic">No data extracted.</p>
                                    )}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </section>

                          {/* Collapsible Raw Output Group */}
                          <section className="border border-[#333333] overflow-hidden rounded-md">
                            <button
                              onClick={() => setIsRawOutputOpen(!isRawOutputOpen)}
                              className="w-full flex items-center justify-between p-4 bg-[#222222] hover:bg-[#333333] transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                <ChevronRight className={`transition-transform duration-200 text-[#A1A1AA] ${isRawOutputOpen ? 'rotate-90' : ''}`} size={16} />
                                <h3 className="text-sm font-bold uppercase tracking-wider text-[#E4E3E0]">Raw Output & Diagnostics</h3>
                              </div>
                              <div className="flex items-center gap-2">
                                {rawResponse && (
                                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${rawResponse.ok ? 'bg-emerald-500/20 text-emerald-500' : 'bg-rose-500/20 text-rose-500'}`}>
                                    {rawResponse.ok ? 'SUCCESS' : 'FAILED'} {rawResponse.status}
                                  </span>
                                )}
                              </div>
                            </button>

                            <AnimatePresence>
                              {isRawOutputOpen && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="overflow-hidden"
                                >
                                  <div className="p-6 bg-[#181818] space-y-6">
                                    {rawResponse ? (
                                      <>
                                        <div>
                                          <label className="text-[10px] font-mono uppercase text-[#A1A1AA] block mb-2">Response Headers</label>
                                          <div className="bg-[#121212] p-4 border border-[#333333] rounded-md">
                                            <pre className="text-[10px] font-mono overflow-auto max-h-[150px] text-[#E4E3E0]">
                                              {JSON.stringify(rawResponse.headers, null, 2)}
                                            </pre>
                                          </div>
                                        </div>
                                        <div>
                                          <div className="flex items-center justify-between mb-2">
                                            <label className="text-[10px] font-mono uppercase text-[#A1A1AA]">Response Body</label>
                                            <div className="flex gap-3">
                                              <button
                                                onClick={() => handleCopyData(typeof rawResponse.body === 'string' ? rawResponse.body : JSON.stringify(rawResponse.body, null, 2), 'success-body')}
                                                className="text-[#A1A1AA] hover:text-[#E4E3E0] transition-colors flex items-center gap-1 text-[9px] uppercase tracking-wider"
                                                title="Copy Response Body"
                                              >
                                                {copiedStates['success-body'] ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                                              </button>
                                              <button
                                                onClick={() => handleDownloadData(typeof rawResponse.body === 'string' ? rawResponse.body : JSON.stringify(rawResponse.body, null, 2), 'success_response_body.txt', 'text/plain')}
                                                className="text-[#A1A1AA] hover:text-[#E4E3E0] transition-colors flex items-center gap-1 text-[9px] uppercase tracking-wider"
                                                title="Download Response Body"
                                              >
                                                <Download size={12} />
                                              </button>
                                            </div>
                                          </div>
                                          <div className="bg-[#121212] p-4 border border-[#333333] rounded-md">
                                            <pre className="text-[10px] font-mono overflow-auto max-h-[300px] text-[#E4E3E0]">
                                              {typeof rawResponse.body === 'string'
                                                ? rawResponse.body.slice(0, 5000) + (rawResponse.body.length > 5000 ? '...' : '')
                                                : JSON.stringify(rawResponse.body, null, 2)}
                                            </pre>
                                          </div>
                                        </div>
                                        {result?.markdown && (
                                          <div>
                                            <label className="text-[10px] font-mono uppercase text-[#A1A1AA] block mb-2">Markdown Content</label>
                                            <div className="bg-[#121212] p-4 border border-[#333333] rounded-md">
                                              <pre className="text-[10px] font-mono overflow-auto max-h-[300px] whitespace-pre-wrap text-[#E4E3E0]">
                                                {result.markdown}
                                              </pre>
                                            </div>
                                          </div>
                                        )}
                                        {result?.json && Array.isArray(result.json) && result.json.length > 0 && (
                                          <div>
                                            <div className="flex items-center justify-between mb-2">
                                              <label className="text-[10px] font-mono uppercase text-[#A1A1AA]">Intercepted JSON API Responses ({result.json.length})</label>
                                              <div className="flex gap-3">
                                                <button
                                                  onClick={() => handleCopyData(JSON.stringify(result.json, null, 2), 'success-json')}
                                                  className="text-[#A1A1AA] hover:text-[#E4E3E0] transition-colors flex items-center gap-1 text-[9px] uppercase tracking-wider"
                                                  title="Copy Intercepted JSON"
                                                >
                                                  {copiedStates['success-json'] ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                                                </button>
                                                <button
                                                  onClick={() => handleDownloadData(JSON.stringify(result.json, null, 2), 'intercepted_api_responses.json', 'application/json')}
                                                  className="text-[#A1A1AA] hover:text-[#E4E3E0] transition-colors flex items-center gap-1 text-[9px] uppercase tracking-wider"
                                                  title="Download Intercepted JSON"
                                                >
                                                  <Download size={12} />
                                                </button>
                                              </div>
                                            </div>
                                            <div className="bg-[#121212] p-4 border border-[#333333] rounded-md">
                                              <pre className="text-[10px] font-mono overflow-auto max-h-[400px] text-[#E4E3E0]">
                                                {JSON.stringify(result.json, null, 2)}
                                              </pre>
                                            </div>
                                          </div>
                                        )}
                                      </>
                                    ) : (
                                      <p className="text-xs font-mono text-[#A1A1AA] italic">No diagnostic data available.</p>
                                    )}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </section>
                        </motion.div>
                      )}
                    </motion.div>
                  )}

                  {activeTab === 'preview' && (
                    <motion.div
                      key="preview"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="h-full flex flex-col"
                    >
                      <div className="p-4 border-b border-[#141414] bg-[#F5F5F3]">
                        <p className="text-xs font-mono">
                          Click elements in the preview to automatically add them to your extraction schema.
                        </p>
                      </div>
                      <div className="flex-1 relative bg-white">
                        {result ? (
                          <iframe
                            srcDoc={`
                          <html>
                            <head>
                              <base href="${result.url}">
                              <style>
                                * { cursor: crosshair !important; }
                                *:hover { outline: 2px solid #10b981 !important; outline-offset: -2px; background-color: rgba(16, 185, 129, 0.1) !important; }
                              </style>
                            </head>
                            <body>
                              ${result.html}
                              <script>
                                document.addEventListener('click', function(e) {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  const el = e.target;
                                  window.parent.postMessage({
                                    type: 'ELEMENT_CLICKED',
                                    tagName: el.tagName,
                                    className: el.className,
                                    text: el.innerText || el.textContent
                                  }, '*');
                                }, true);
                              </script>
                            </body>
                          </html>
                        `}
                            className="w-full h-full border-none"
                            title="Live Preview"
                            sandbox="allow-same-origin allow-scripts"
                          />
                        ) : (
                          <div className="h-full flex flex-col items-center justify-center opacity-20">
                            <Globe size={64} strokeWidth={1} />
                            <p className="mt-4 font-mono text-sm uppercase tracking-widest text-center">
                              No preview available.<br />
                              Run a scrape first.
                            </p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'history' && (
                    <motion.div
                      key="history"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="p-8 h-full flex flex-col gap-8"
                    >
                      <section>
                        <h3 className="text-sm font-bold uppercase tracking-wider mb-4 text-[#E4E3E0]">Run History</h3>
                        <div className="border border-[#333333] bg-[#121212] divide-y divide-[#333333] rounded-md overflow-hidden">
                          {runHistory.length === 0 ? (
                            <div className="p-8 text-center text-[#A1A1AA] font-mono text-xs">No runs yet.</div>
                          ) : (
                            runHistory.map((run) => (
                              <div key={run.id} className="p-4 flex items-center justify-between hover:bg-[#222222] transition-colors">
                                <div className="flex items-center gap-4">
                                  <div className={`w-2 h-2 rounded-full ${run.status === 'success' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                  <div>
                                    <div className="text-sm font-medium truncate max-w-[300px] text-[#E4E3E0]">{run.url}</div>
                                    <div className="text-[10px] font-mono text-[#A1A1AA]">{new Date(run.created_at).toLocaleString()}</div>
                                  </div>
                                </div>
                                <div className="text-[10px] font-mono uppercase">
                                  {run.status === 'success' ? (
                                    <span className="text-emerald-500">Success</span>
                                  ) : (
                                    <span className="text-rose-500">Failed</span>
                                  )}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </section>

                      <section className="flex-1 flex flex-col min-h-0">
                        <h3 className="text-sm font-bold uppercase tracking-wider mb-4 text-[#E4E3E0]">System Logs</h3>
                        <div className="flex-1 border border-[#333333] bg-[#121212] text-[#E4E3E0] p-4 overflow-auto font-mono text-xs rounded-md">
                          {logs.length === 0 ? (
                            <div className="text-[#A1A1AA]">Waiting for events...</div>
                          ) : (
                            logs.map((log, i) => (
                              <div key={i} className="mb-2 flex gap-4">
                                <span className="text-[#A1A1AA] shrink-0">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                                <span className={`${log.type === 'error' ? 'text-rose-500' : log.type === 'success' ? 'text-emerald-500' : 'text-blue-400'}`}>
                                  {log.message}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </section>
                    </motion.div>
                  )}

                  {activeTab === 'export' && (
                    <motion.div
                      key="export"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="p-8 h-full"
                    >
                      <div className="max-w-2xl mx-auto space-y-8">
                        <section className="border border-[#333333] bg-[#121212] p-6 rounded-md">
                          <h3 className="text-sm font-bold uppercase tracking-wider mb-2 text-[#E4E3E0]">Webhook Destination</h3>
                          <p className="text-xs font-mono text-[#A1A1AA] mb-6">Send extracted JSON data automatically to your server or automation tool (e.g., Zapier, Make).</p>

                          <div className="space-y-4">
                            <div>
                              <label className="text-[10px] font-mono uppercase mb-1 block text-[#A1A1AA]">Endpoint URL</label>
                              <input
                                type="text"
                                value={webhookUrl}
                                onChange={(e) => setWebhookUrl(e.target.value)}
                                className="w-full bg-[#181818] border border-[#333333] p-3 text-sm focus:outline-none focus:border-[#D95D39] text-[#E4E3E0] rounded-md transition-colors"
                                placeholder="https://hooks.zapier.com/..."
                              />
                            </div>

                            <button
                              onClick={sendToWebhook}
                              disabled={!webhookUrl || !extractedData || isSendingWebhook}
                              className="bg-gradient-to-r from-[#D95D39] to-[#E87A5D] text-white px-6 py-3 font-bold uppercase tracking-wider text-xs hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2 w-full rounded-md shadow-lg shadow-[#D95D39]/20"
                            >
                              {isSendingWebhook ? <Loader2 className="animate-spin w-4 h-4" /> : <Zap className="w-4 h-4" />}
                              {isSendingWebhook ? 'Sending...' : 'Test Webhook'}
                            </button>

                            {webhookStatus && (
                              <div className={`p-3 text-xs font-mono border rounded-md ${webhookStatus === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-rose-500/10 border-rose-500/20 text-rose-500'}`}>
                                Status: {webhookStatus}
                              </div>
                            )}
                          </div>
                        </section>

                        <section className="border border-[#333333] bg-[#121212] p-6 rounded-md">
                          <h3 className="text-sm font-bold uppercase tracking-wider mb-2 text-[#E4E3E0]">Payload Preview</h3>
                          <p className="text-xs font-mono text-[#A1A1AA] mb-4">This is the exact JSON structure that will be sent via POST request.</p>

                          <div className="bg-[#181818] text-[#E4E3E0] p-4 overflow-auto max-h-[300px] border border-[#333333] rounded-md">
                            <pre className="text-[10px] font-mono">
                              {JSON.stringify({
                                url: result?.url || "https://example.com",
                                timestamp: new Date().toISOString(),
                                data: extractedData || { example: "Run a scrape to see real data" }
                              }, null, 2)}
                            </pre>
                          </div>
                        </section>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </>
        )}
      </main>

      {/* Footer Status Bar */}
      < footer className="border-t border-[#333333] bg-[#121212] text-[#A1A1AA] px-6 py-2 flex justify-between items-center text-[9px] font-mono uppercase tracking-widest" >
        <div className="flex gap-6">
          <span className="text-[#D95D39]">Engine: Playwright 1.45</span>
          <span>Stealth: Enabled</span>
          <span className="text-[#D95D39]">AI: Gemini-3-Flash</span>
        </div>
        <div className="flex items-center gap-2 text-[#E4E3E0]">
          <div className="w-1.5 h-1.5 bg-[#D95D39] rounded-full animate-pulse" />
          System Operational
        </div>
      </footer >

      {/* Save Configuration Modal */}
      <AnimatePresence>
        {
          isSaveModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-[#121212] border border-[#333333] rounded-xl shadow-2xl w-full max-w-md overflow-hidden shadow-black/50"
              >
                <div className="flex justify-between items-center p-6 border-b border-[#252525]">
                  <h2 className="text-xl font-bold tracking-tight text-[#E4E3E0]">Save Scrape Configuration</h2>
                  <button onClick={() => setIsSaveModalOpen(false)} className="p-2 text-[#A1A1AA] hover:text-[#E4E3E0] hover:bg-[#222222] rounded-full transition-colors">
                    <X size={20} />
                  </button>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="text-xs font-mono uppercase mb-2 block text-[#A1A1AA] tracking-wider font-bold">Configuration Name</label>
                    <input
                      autoFocus
                      type="text"
                      value={saveConfigName}
                      onChange={(e) => setSaveConfigName(e.target.value)}
                      className="w-full bg-[#1A1A1A] border border-[#333333] p-3 text-sm focus:outline-none focus:border-[#D95D39] text-[#E4E3E0] rounded-xl transition-colors"
                      placeholder="e.g. Frontier Airlines Deals"
                    />
                  </div>
                  <div className="bg-[#181818] p-4 rounded-md border border-[#333333]">
                    <p className="text-[10px] font-mono uppercase text-[#A1A1AA] mb-2">Saving current settings:</p>
                    <ul className="text-xs text-[#E4E3E0] space-y-1 font-mono">
                      <li><span className="text-[#666]">URL:</span> {url || '(none)'}</li>
                      <li><span className="text-[#666]">Wait Selector:</span> {waitSelector || '(none)'}</li>
                      <li><span className="text-[#666]">Formats:</span> {formats.join(', ') || '(none)'}</li>
                    </ul>
                  </div>
                </div>
                <div className="flex justify-end gap-3 p-6 border-t border-[#252525] bg-[#181818]">
                  <button
                    onClick={() => setIsSaveModalOpen(false)}
                    className="px-6 py-2.5 rounded-lg text-sm font-semibold tracking-wide text-[#A1A1AA] hover:text-[#E4E3E0] hover:bg-[#222222] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveConfig}
                    disabled={!saveConfigName.trim()}
                    className="px-6 py-2.5 rounded-lg text-sm font-semibold tracking-wide bg-[#D95D39] text-white hover:bg-[#c44c2a] transition-colors disabled:opacity-50"
                  >
                    Save Configuration
                  </button>
                </div>
              </motion.div>
            </div>
          )
        }
      </AnimatePresence >
    </div >
  );
}
