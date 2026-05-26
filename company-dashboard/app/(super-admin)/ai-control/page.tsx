import React from "react";
import { BrainCircuit, Zap, SlidersHorizontal, FlaskConical } from "lucide-react";

export default function AIControlPage() {
  return (
    <div className="space-y-8 max-w-7xl">
      <div>
        <h2 className="text-2xl font-bold text-white">AI Orchestration Control</h2>
        <p className="mt-1 text-sm text-neutral-400">Configure model routing, embedding weights, and run live experiments.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: "Active Model", value: "GPT-4o", sub: "Primary inference", icon: BrainCircuit },
          { label: "Inference (24h)", value: "845k calls", sub: "Avg 124ms latency", icon: Zap },
          { label: "Active Experiments", value: "2", sub: "A/B model splits running", icon: FlaskConical },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6">
            <p className="text-xs text-neutral-400">{stat.label}</p>
            <p className="mt-2 text-2xl font-semibold text-white">{stat.value}</p>
            <p className="mt-1 text-xs text-neutral-500">{stat.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Search Weight Tuning */}
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6">
          <div className="flex items-center gap-2 mb-5">
            <SlidersHorizontal className="h-4 w-4 text-neutral-400" />
            <h3 className="text-sm font-semibold text-white">Hybrid Search Weights</h3>
          </div>
          <div className="space-y-5">
            {[
              { label: "Semantic (pgvector)", key: "semanticWeight", value: 0.50 },
              { label: "Keyword (BM25)", key: "bm25Weight", value: 0.30 },
              { label: "Recency Signal", key: "keywordWeight", value: 0.20 },
            ].map((w) => (
              <div key={w.key}>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-neutral-300">{w.label}</span>
                  <span className="text-neutral-400 font-mono">{(w.value * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  defaultValue={w.value}
                  className="w-full accent-blue-500"
                />
              </div>
            ))}
          </div>
          <button className="mt-6 w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 transition-colors">
            Apply Weights
          </button>
        </div>

        {/* Model Routing */}
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6">
          <h3 className="text-sm font-semibold text-white mb-5">Model Routing Config</h3>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-neutral-400 block mb-1.5">Primary Model</label>
              <select className="w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500">
                <option>gpt-4o</option>
                <option>gpt-4o-mini</option>
                <option>claude-3-5-sonnet-20241022</option>
                <option>gemini-1.5-pro</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-neutral-400 block mb-1.5">Fallback Model</label>
              <select className="w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500">
                <option>gpt-4o-mini</option>
                <option>claude-3-haiku-20240307</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-neutral-400 block mb-1.5">Embedding Model</label>
              <select className="w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500">
                <option>text-embedding-3-large</option>
                <option>text-embedding-3-small</option>
              </select>
            </div>
          </div>
          <button className="mt-6 w-full rounded-md bg-neutral-700 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-600 transition-colors">
            Save Routing Config
          </button>
        </div>
      </div>
    </div>
  );
}
