"use client";

import React, { useState } from "react";
import {
  Settings,
  Cpu,
  Key,
  ShieldAlert,
  Save,
  CheckCircle,
  Database,
  Globe,
  BellRing,
} from "lucide-react";

export default function PlatformSettingsPage() {
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [modelFallback, setModelFallback] = useState("claude-sonnet");
  const [gatewayTimeout, setGatewayTimeout] = useState("15");
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-2xl font-bold leading-7 text-white sm:truncate sm:text-3xl sm:tracking-tight">
          Global Platform Settings
        </h2>
        <p className="mt-1 text-sm leading-6 text-neutral-400">
          Configure core reverse proxy routers, API gateways, fallbacks, and node registries.
        </p>
      </div>

      <div className="border border-neutral-800 bg-neutral-900/40 rounded-xl divide-y divide-neutral-800">
        {/* Section 1: Gateways & Proxies */}
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Cpu className="h-4 w-4 text-amber-500" />
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Gateway & Fallbacks</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase text-neutral-400">Primary AI Inference Model</label>
              <select
                id="platform-primary-model"
                value={modelFallback}
                onChange={(e) => setModelFallback(e.target.value)}
                className="w-full h-9 px-3 text-xs bg-neutral-950 border border-neutral-800 rounded-lg text-white focus:outline-none"
              >
                <option value="claude-sonnet">Claude 3.5 Sonnet (Default)</option>
                <option value="gpt-4o">GPT-4o Dedicated</option>
                <option value="gemini-flash">Gemini 1.5 Flash (Direct API)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase text-neutral-400">Gateway Timeout Limit (seconds)</label>
              <input
                id="platform-gateway-timeout"
                type="number"
                value={gatewayTimeout}
                onChange={(e) => setGatewayTimeout(e.target.value)}
                className="w-full h-9 px-3 text-xs bg-neutral-950 border border-neutral-800 rounded-lg text-white focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Global Maintenance Status */}
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <ShieldAlert className="h-4 w-4 text-amber-500" />
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Safety & Operational Intercept</h3>
          </div>

          <div className="flex items-center justify-between border border-neutral-850 bg-neutral-950/40 p-4 rounded-lg">
            <div>
              <h4 className="text-xs font-bold text-white uppercase">Global Platform Maintenance Mode</h4>
              <p className="text-[10px] text-neutral-500 mt-0.5 max-w-md">
                Enable to freeze all write operations to the Supabase cluster and show a system maintenance card to all marketplace users.
              </p>
            </div>
            <button
              id="maintenance-toggle"
              onClick={() => setMaintenanceMode(!maintenanceMode)}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border transition-colors duration-200 outline-none ${
                maintenanceMode ? "bg-red-600 border-red-600" : "bg-neutral-800 border-neutral-700"
              }`}
            >
              <span
                className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform duration-200 ${
                  maintenanceMode ? "translate-x-4" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Section 3: Credentials */}
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Key className="h-4 w-4 text-amber-500" />
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Credential Keys Vault</h3>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase text-neutral-400">OpenAI Api Token Key</label>
                <input
                  id="platform-openai-key"
                  type="password"
                  value="sk-proj-••••••••••••••••••••"
                  readOnly
                  className="w-full h-9 px-3 text-xs bg-neutral-950 border border-neutral-850 rounded-lg text-neutral-500 focus:outline-none font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase text-neutral-400">Anthropic API Token Key</label>
                <input
                  id="platform-anthropic-key"
                  type="password"
                  value="sk-ant-••••••••••••••••••••"
                  readOnly
                  className="w-full h-9 px-3 text-xs bg-neutral-950 border border-neutral-850 rounded-lg text-neutral-500 focus:outline-none font-mono"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          className="flex items-center gap-2 bg-amber-500 text-black px-4 py-2 text-xs font-bold uppercase rounded-lg hover:bg-amber-400 transition-colors shadow-lg"
        >
          <Save className="h-4 w-4" />
          Save Configurations
        </button>

        {saved && (
          <span className="text-xs text-emerald-400 flex items-center gap-1.5">
            <CheckCircle className="h-4 w-4" /> All global proxy router nodes updated
          </span>
        )}
      </div>
    </div>
  );
}
