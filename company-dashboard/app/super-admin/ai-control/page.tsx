/* eslint-disable @typescript-eslint/no-unused-vars */
// app/(super-admin)/ai-control/page.tsx
"use client";

import * as React from "react";
import { useAdminAuth } from "@/features/platform-core";
import { useAIConfigQuery, useAIExperimentsQuery, useAIInferenceLogsQuery, useUpdateWeightsMutation, useTriggerReindexMutation } from "@/features/ai";
import { 
  Cpu, Sliders, Play, Check, AlertTriangle, 
  HelpCircle, Sparkles, BarChart2, Activity, Terminal
} from "lucide-react";
import { toast } from "sonner";

export default function AIControlPage() {
  const { hasCapability, admin } = useAdminAuth();
  const { data: config } = useAIConfigQuery();
  const { data: experiments } = useAIExperimentsQuery();
  const { data: inferenceLogs } = useAIInferenceLogsQuery();

  const updateConfigMutation = useUpdateWeightsMutation();
  const triggerReindexMutation = useTriggerReindexMutation();

  // Local state for weights
  const [modelName, setModelName] = React.useState("");
  const [semanticWeight, setSemanticWeight] = React.useState(0.5);
  const [keywordWeight, setKeywordWeight] = React.useState(0.3);
  const [bm25Weight, setBm25Weight] = React.useState(0.2);

  React.useEffect(() => {
    if (config) {
      setModelName(config.active_model_name);
      setSemanticWeight(Number(config.semantic_weight));
      setKeywordWeight(Number(config.keyword_weight));
      setBm25Weight(Number(config.bm25_weight));
    }
  }, [config]);

  if (!hasCapability("configure_ml_weights")) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center border border-dashed border-red-500/40 bg-zinc-950 p-8 text-center font-mono text-xs">
        <AlertTriangle className="mb-4 h-8 w-8 text-red-500 animate-pulse" />
        <span className="text-red-500 font-bold uppercase tracking-wider">ERROR: ACCESS_DENIED</span>
        <p className="mt-2 text-zinc-400">
          Required Capability: <code className="bg-zinc-900 px-2 py-1 text-amber-500">configure_ml_weights</code> is missing.
        </p>
      </div>
    );
  }

  const handleWeightChange = (type: "semantic" | "keyword" | "bm25", val: number) => {
    if (type === "semantic") {
      setSemanticWeight(val);
    } else if (type === "keyword") {
      setKeywordWeight(val);
    } else if (type === "bm25") {
      setBm25Weight(val);
    }
  };

  const totalWeights = Number((semanticWeight + keywordWeight + bm25Weight).toFixed(2));
  const isWeightValid = Math.abs(totalWeights - 1.0) < 0.001;

  const handleDeployConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isWeightValid) {
      toast.error(`Invalid weights: Sum must be exactly 1.00 (Current sum: ${totalWeights})`);
      return;
    }
    if (!config) return;

    updateConfigMutation.mutate({
      adminId: admin?.id || "unknown_admin",
      semanticWeight,
      keywordWeight,
      bm25Weight
    });
  };

  return (
    <div className="space-y-6 font-mono text-xs">
      {/* Title Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border border-zinc-800 bg-zinc-950 p-4">
        <div className="space-y-1">
          <h2 className="text-sm font-bold text-zinc-100 uppercase tracking-widest">AI_GOVERNANCE_CONTROL</h2>
          <p className="text-[10px] text-zinc-500">Hyperparameter weight distribution and model experimentation plane</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* LEFT COLUMN: Weight Slider Form */}
        <div className="border border-zinc-800 bg-zinc-950 p-4 space-y-4 lg:col-span-2">
          <div className="flex items-center space-x-2 border-b border-zinc-800 pb-2">
            <Sliders className="h-4 w-4 text-amber-500" />
            <span className="font-bold text-zinc-200 uppercase">Search Tuning Weights</span>
          </div>

          <form onSubmit={handleDeployConfig} className="space-y-6">
            <div>
              <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Active Index Model</label>
              <input 
                type="text" 
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                className="w-full border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-zinc-200 outline-none focus:border-amber-500"
              />
            </div>

            <div className="space-y-4">
              {/* Semantic Weight Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <span className="font-bold text-zinc-300">SEMANTIC_SEARCH_WEIGHT</span>
                  <span className="text-amber-500 font-bold">{(semanticWeight * 100).toFixed(0)}%</span>
                </div>
                <input 
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={semanticWeight}
                  onChange={(e) => handleWeightChange("semantic", parseFloat(e.target.value))}
                  className="w-full accent-amber-500 h-1 bg-zinc-800 rounded-none cursor-pointer"
                />
              </div>

              {/* Keyword Weight Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <span className="font-bold text-zinc-300">KEYWORD_EXACT_MATCH</span>
                  <span className="text-amber-500 font-bold">{(keywordWeight * 100).toFixed(0)}%</span>
                </div>
                <input 
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={keywordWeight}
                  onChange={(e) => handleWeightChange("keyword", parseFloat(e.target.value))}
                  className="w-full accent-amber-500 h-1 bg-zinc-800 rounded-none cursor-pointer"
                />
              </div>

              {/* BM25 Weight Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <span className="font-bold text-zinc-300">BM25_LEXICAL_RANKING</span>
                  <span className="text-amber-500 font-bold">{(bm25Weight * 100).toFixed(0)}%</span>
                </div>
                <input 
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={bm25Weight}
                  onChange={(e) => handleWeightChange("bm25", parseFloat(e.target.value))}
                  className="w-full accent-amber-500 h-1 bg-zinc-800 rounded-none cursor-pointer"
                />
              </div>
            </div>

            {/* Sum validation indicator */}
            <div className={`border p-3 text-[10px] font-bold flex items-center justify-between uppercase ${
              isWeightValid ? "border-emerald-500/20 bg-emerald-950/10 text-emerald-500" : "border-red-500/20 bg-red-950/10 text-red-500"
            }`}>
              <span>TOTAL_WEIGHTS_ACCUMULATION: {totalWeights.toFixed(2)} / 1.00</span>
              <span>{isWeightValid ? "VALID" : "INVALID_SUMMATION"}</span>
            </div>

            <button 
              type="submit"
              disabled={updateConfigMutation.isPending || !isWeightValid}
              className="w-full flex items-center justify-center space-x-1 border border-amber-500 bg-amber-500/10 py-2 text-amber-500 hover:bg-amber-500 hover:text-black font-bold transition-colors disabled:opacity-50"
            >
              <Sparkles className="h-4 w-4" />
              <span>DEPLOY_HYPERPARAMETERS</span>
            </button>
          </form>
        </div>

        {/* RIGHT COLUMN: Pipeline and A/B Experiments */}
        <div className="space-y-6">
          {/* Embedding pipeline status */}
          <div className="border border-zinc-800 bg-zinc-950 p-4 space-y-4">
            <div className="flex items-center space-x-2 border-b border-zinc-800 pb-2">
              <Activity className="h-4 w-4 text-emerald-500" />
              <span className="font-bold text-zinc-200 uppercase">Embedding Pipeline</span>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-zinc-500">Pipeline Status</span>
                <span className="text-emerald-400 font-bold">STABLE</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Stale Embeddings</span>
                <span className="text-amber-500 font-bold">14 listings</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Total Indexed</span>
                <span className="text-zinc-300 font-bold">12,408 vectors</span>
              </div>

              <button 
                onClick={() => triggerReindexMutation.mutate({})}
                disabled={triggerReindexMutation.isPending}
                className="w-full mt-2 flex items-center justify-center space-x-1 border border-zinc-700 bg-zinc-900 py-1.5 text-zinc-300 hover:border-zinc-500 hover:text-white disabled:opacity-50 transition-colors"
              >
                <Play className="h-3.5 w-3.5 text-emerald-500" />
                <span>FORCE_PIPELINE_REBUILD</span>
              </button>
            </div>
          </div>

          {/* Inference Latency log */}
          <div className="border border-zinc-800 bg-zinc-950 p-4 space-y-4">
            <div className="flex items-center space-x-2 border-b border-zinc-800 pb-2">
              <Terminal className="h-4 w-4 text-zinc-400" />
              <span className="font-bold text-zinc-200 uppercase">Inference Telemetry Feed</span>
            </div>

            <div className="space-y-2 max-h-[160px] overflow-y-auto custom-scrollbar">
              {inferenceLogs?.slice(0, 5).map((log) => (
                <div key={log.id} className="border-l border-zinc-800 pl-2 text-[10px] space-y-0.5">
                  <div className="flex justify-between">
                    <span className="font-bold text-zinc-300">{log.model_name.slice(0, 15)}...</span>
                    <span className={log.status_code === 200 ? "text-emerald-500" : "text-red-500"}>
                      {log.latency_ms}ms
                    </span>
                  </div>
                  <div className="text-zinc-500 text-[9px]">
                    Tokens: {log.tokens_used} | Code: {log.status_code}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* A/B Experiments Block */}
      <div className="border border-zinc-800 bg-zinc-950 p-4">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-3">
          <span className="font-bold text-[10px] text-zinc-400 uppercase">ACTIVE_MODEL_EXPERIMENTS</span>
          <span className="text-[9px] text-zinc-500 font-bold uppercase">A/B GATEWAY ROUTING</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-500 uppercase text-[9px] bg-zinc-900/30">
                <th className="p-3 font-bold">Experiment Name</th>
                <th className="p-3 font-bold">Model A (Control)</th>
                <th className="p-3 font-bold">Model B (Candidate)</th>
                <th className="p-3 font-bold">Traffic Split</th>
                <th className="p-3 font-bold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-850">
              {experiments && experiments.length > 0 ? (
                experiments.map((exp) => (
                  <tr key={exp.id} className="hover:bg-zinc-900/40 transition-colors">
                    <td className="p-3">
                      <div className="font-bold text-zinc-200">{exp.name}</div>
                      <div className="text-[9px] text-zinc-500">{exp.description}</div>
                    </td>
                    <td className="p-3 text-zinc-400">{exp.model_a}</td>
                    <td className="p-3 text-zinc-400">{exp.model_b}</td>
                    <td className="p-3 font-bold text-amber-500">{exp.split_percentage}% / {100 - exp.split_percentage}%</td>
                    <td className="p-3">
                      <span className={`inline-flex px-2 py-0.5 text-[9px] font-bold uppercase ${
                        exp.status === "ACTIVE" 
                          ? "bg-emerald-950/40 text-emerald-500 border border-emerald-500/20" 
                          : "bg-zinc-900 text-zinc-500 border border-zinc-800"
                      }`}>
                        {exp.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-zinc-600 font-bold">
                    NO_EXPERIMENTS_LAUNCHED
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
