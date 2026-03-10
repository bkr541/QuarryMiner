import React, { useState } from "react";
import { Plane, Search, Loader2, Code2, AlertCircle, ShieldAlert } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function App() {
  const [origin, setOrigin] = useState("ATL");
  const [date, setDate] = useState("2026-03-10");
  const [maxWorkers, setMaxWorkers] = useState("3");
  const [token, setToken] = useState("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoyOTQ4LCJlbWFpbCI6ImtvZHlyb2JpbnNvbjAyQGdtYWlsLmNvbSIsImV4cCI6MTc3NDM0ODEwOCwiaWF0IjoxNzcxNzU2MTA4fQ.PfWc26pRP25u9SrX4MINas9BWMzxu8qZtNleqzm8kPY");

  const [isLoading, setIsLoading] = useState(false);
  const [rawJson, setRawJson] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!origin || !date || !maxWorkers || !token) return;

    setIsLoading(true);
    setError(null);
    setRawJson("");

    try {
      const resp = await fetch("/api/vercel-scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ origin, date, maxWorkers, token })
      });

      const data = await resp.json();

      if (!resp.ok) {
        throw new Error(data.error || "Failed to proxy fetch via Playwright");
      }

      setRawJson(JSON.stringify(data.data, null, 2));

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#181818] text-[#E4E3E0] font-sans selection:bg-[#D95D39] selection:text-white flex flex-col items-center py-12 px-4">

      <div className="w-full max-w-5xl space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold uppercase tracking-tight flex justify-center items-center gap-4">
            <ShieldAlert className="text-[#D95D39] w-10 h-10" />
            Vercel Edge Proxy Scraper
          </h1>
          <p className="text-sm font-mono text-[#A1A1AA] mt-3 uppercase tracking-widest max-w-2xl mx-auto">
            Utilizing Playwright Persistent Contexts to defeat Vercel Security Checkpoints
            and stream live API JSON data seamlessly.
          </p>
        </div>

        <div className="bg-[#222222] border border-[#333333] rounded-xl p-8 shadow-2xl">
          <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-mono uppercase text-[#A1A1AA]">Origin (IATA)</label>
              <input
                type="text"
                value={origin}
                onChange={e => setOrigin(e.target.value.toUpperCase())}
                maxLength={3}
                className="w-full bg-[#121212] border border-[#333333] px-4 py-3 text-sm font-bold text-[#E4E3E0] rounded focus:outline-none focus:border-[#D95D39] transition-colors"
                placeholder="ATL"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-mono uppercase text-[#A1A1AA]">Travel Date</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full bg-[#121212] border border-[#333333] px-4 py-3 text-sm font-bold text-[#E4E3E0] rounded focus:outline-none focus:border-[#D95D39] transition-colors [color-scheme:dark]"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-mono uppercase text-[#A1A1AA]">Max Workers</label>
              <input
                type="number"
                value={maxWorkers}
                onChange={e => setMaxWorkers(e.target.value)}
                min="1"
                className="w-full bg-[#121212] border border-[#333333] px-4 py-3 text-sm font-bold text-[#E4E3E0] rounded focus:outline-none focus:border-[#D95D39] transition-colors"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-mono uppercase text-[#A1A1AA]">Auth Token</label>
              <input
                type="password"
                value={token}
                onChange={e => setToken(e.target.value)}
                className="w-full bg-[#121212] border border-[#333333] px-4 py-3 text-sm font-bold text-[#E4E3E0] rounded focus:outline-none focus:border-[#D95D39] transition-colors"
                placeholder="eyJhbGciOi..."
                required
              />
            </div>

            <div className="md:col-span-2 lg:col-span-4 pt-4">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-3 bg-[#D95D39] hover:bg-[#c44f2e] text-white py-4 rounded-lg text-sm font-bold uppercase tracking-widest transition-colors shadow-lg shadow-[#D95D39]/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
                {isLoading ? 'Defeating Vercel Security Checkpoint...' : 'Bypass Vercel Edge Cache & Execute'}
              </button>
            </div>
          </form>
        </div>

        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="flex flex-col items-center justify-center py-20 text-[#D95D39] space-y-4"
            >
              <Loader2 size={48} className="animate-spin" />
              <p className="text-xs font-mono tracking-widest uppercase text-[#A1A1AA]">Organic Context Spawning...</p>
            </motion.div>
          ) : error ? (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-6 flex flex-col items-center justify-center text-center text-rose-500 gap-4"
            >
              <AlertCircle size={40} className="shrink-0" />
              <div>
                <h4 className="font-bold text-lg uppercase tracking-widest mb-2">Proxy Execution Failed</h4>
                <p className="text-sm border border-rose-500/30 bg-rose-500/10 p-4 rounded-md inline-block font-mono max-w-3xl overflow-auto">{error}</p>
              </div>
            </motion.div>
          ) : rawJson ? (
            <motion.div
              key="data"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between border-b border-[#333333] pb-4">
                <h3 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2 text-[#E4E3E0]">
                  <Code2 size={16} className="text-[#D95D39]" /> JSON Extraction Payload
                </h3>
                <span className="text-[10px] font-mono text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 uppercase">
                  Vercel Checkpoint Bypassed
                </span>
              </div>

              {/* Visual parsing helper for the nested flights stream format */}
              {(() => {
                try {
                  const parsed = JSON.parse(rawJson);
                  // The stream returns an array of events: { origin: ... } OR { destination: ..., flights: [...] } 
                  const flightsArrays = parsed.filter((p: any) => p.flights && p.flights.length > 0);
                  let totalFlights = 0;
                  flightsArrays.forEach((fa: any) => { totalFlights += fa.flights.length; });

                  return (
                    <div className="mb-4 text-xs font-mono text-[#A1A1AA] flex items-center justify-between bg-[#222222] p-3 rounded-lg border border-[#333333]">
                      <div><span className="text-[#E4E3E0] font-bold">{parsed.length - 1}</span> Destinations Scanned</div>
                      <div><span className="text-emerald-400 font-bold">{totalFlights}</span> Total Flights Found</div>
                    </div>
                  )
                } catch (e) { return null; }
              })()}

              <div className="bg-[#121212] border border-[#333333] rounded-xl p-6 overflow-auto max-h-[800px] shadow-inner relative">
                <pre className="text-[11px] font-mono text-[#E4E3E0] m-0">
                  {rawJson}
                </pre>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

    </div>
  );
}
