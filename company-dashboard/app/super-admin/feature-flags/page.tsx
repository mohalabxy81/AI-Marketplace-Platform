// app/(super-admin)/feature-flags/page.tsx
"use client";

import * as React from "react";
import { useAdminAuth } from "@/features/platform-core";
import { useAuditLogsQuery } from "@/features/platform-core";
import { MOCK_FEATURE_FLAGS, MOCK_ROLLOUTS } from "@/lib/mock/super-admin-mock-data";
import { logAdminAction } from "@/features/platform-core";
import { 
  ToggleLeft, ToggleRight, Sliders, Plus, 
  Trash2, AlertTriangle, Play, HelpCircle, Check, Settings
} from "lucide-react";
import { toast } from "sonner";

export default function FeatureFlagsPage() {
  const { hasCapability } = useAdminAuth();
  const { data: auditLogs } = useAuditLogsQuery();

  const [flags, setFlags] = React.useState(MOCK_FEATURE_FLAGS);
  const [rollouts, setRollouts] = React.useState(MOCK_ROLLOUTS);
  
  // Modals
  const [createOpen, setCreateOpen] = React.useState(false);
  const [newFlagName, setNewFlagName] = React.useState("");
  const [newFlagDesc, setNewFlagDesc] = React.useState("");

  const [selectedFlagId, setSelectedFlagId] = React.useState("");

  if (!hasCapability("manage_feature_flags")) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center border border-dashed border-red-500/40 bg-zinc-950 p-8 text-center font-mono text-xs">
        <AlertTriangle className="mb-4 h-8 w-8 text-red-500 animate-pulse" />
        <span className="text-red-500 font-bold uppercase tracking-wider">ERROR: ACCESS_DENIED</span>
        <p className="mt-2 text-zinc-400">
          Required Capability: <code className="bg-zinc-900 px-2 py-1 text-amber-500">manage_feature_flags</code> is missing.
        </p>
      </div>
    );
  }

  const handleToggleFlag = async (id: string, currentStatus: boolean, name: string) => {
    const nextStatus = !currentStatus;
    
    await logAdminAction(
      "flag.toggle",
      "feature_flag",
      id,
      { active: currentStatus },
      { active: nextStatus }
    );

    setFlags(prev => prev.map(f => f.id === id ? { ...f, is_active: nextStatus, updated_at: new Date().toISOString() } : f));
    toast.success(`Feature Flag [${name}] toggled to ${nextStatus ? "ON" : "OFF"}.`);
  };

  const handleCreateFlag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFlagName.trim()) {
      toast.error("Flag key name is required.");
      return;
    }

    const formattedKey = newFlagName.toLowerCase().replace(/\s+/g, "-");
    const newId = `flg_${Date.now()}`;
    
    await logAdminAction(
      "flag.create",
      "feature_flag",
      newId,
      null,
      { name: formattedKey, description: newFlagDesc }
    );

    const newFlag = {
      id: newId,
      name: formattedKey,
      description: newFlagDesc,
      is_active: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const newRollout = {
      id: `rol_${Date.now()}`,
      flag_id: newId,
      rollout_percentage: 0,
      target_rules: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    setFlags(prev => [...prev, newFlag]);
    setRollouts(prev => [...prev, newRollout]);
    setNewFlagName("");
    setNewFlagDesc("");
    setCreateOpen(false);
    toast.success(`Feature Flag [${formattedKey}] registered.`);
  };

  const handleRolloutSlider = async (flagId: string, val: number) => {
    setRollouts(prev => prev.map(r => r.flag_id === flagId ? { ...r, rollout_percentage: val } : r));
  };

  const handleDeployRollout = async (flagId: string) => {
    const rollout = rollouts.find(r => r.flag_id === flagId);
    const flag = flags.find(f => f.id === flagId);
    if (!rollout || !flag) return;

    await logAdminAction(
      "flag.update_rollout",
      "feature_flag",
      flagId,
      { rollout_percentage: 0 },
      { rollout_percentage: rollout.rollout_percentage, target_rules: rollout.target_rules }
    );

    toast.success(`Rollout rules deployed for flag [${flag.name}].`);
  };

  const handleUpdateRules = (flagId: string, planTier: string) => {
    setRollouts(prev => prev.map(r => {
      if (r.flag_id === flagId) {
        const tiers = r.target_rules.plan_tiers || [];
        const nextTiers = tiers.includes(planTier) 
          ? tiers.filter(t => t !== planTier)
          : [...tiers, planTier];
        return {
          ...r,
          target_rules: {
            ...r.target_rules,
            plan_tiers: nextTiers
          }
        };
      }
      return r;
    }));
  };

  const flagHistory = auditLogs?.logs?.filter((log: any) => log.targetType === "feature_flag") || [];

  return (
    <div className="space-y-6 font-mono text-xs">
      {/* Title Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border border-zinc-800 bg-zinc-950 p-4">
        <div className="space-y-1">
          <h2 className="text-sm font-bold text-zinc-100 uppercase tracking-widest">FEATURE_FLAGS_CONSOLE</h2>
          <p className="text-[10px] text-zinc-500">Decoupled rollout strategies and runtime toggle gates</p>
        </div>

        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center space-x-1 border border-amber-500 bg-amber-500/10 px-3 py-1.5 font-bold text-amber-500 hover:bg-amber-500 hover:text-black transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>REGISTER_NEW_FLAG</span>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Side: Flag List */}
        <div className="space-y-6 lg:col-span-2">
          {flags.map((flag) => {
            const rollout = rollouts.find(r => r.flag_id === flag.id);
            const isEditing = selectedFlagId === flag.id;

            return (
              <div key={flag.id} className="border border-zinc-800 bg-zinc-950 p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="font-bold text-zinc-100 text-xs uppercase">{flag.name}</span>
                    <span className="block text-[10px] text-zinc-500">{flag.description}</span>
                  </div>

                  <div className="flex items-center space-x-4">
                    <button 
                      onClick={() => handleToggleFlag(flag.id, flag.is_active, flag.name)}
                      className="text-zinc-400 hover:text-white"
                    >
                      {flag.is_active ? (
                        <ToggleRight className="h-7 w-7 text-emerald-500" />
                      ) : (
                        <ToggleLeft className="h-7 w-7 text-zinc-600" />
                      )}
                    </button>
                    
                    <button 
                      onClick={() => setSelectedFlagId(isEditing ? "" : flag.id)}
                      className={`border px-2 py-1 text-[10px] font-bold ${
                        isEditing ? "border-amber-500 text-amber-500" : "border-zinc-700 text-zinc-400 hover:text-white"
                      }`}
                    >
                      RULES
                    </button>
                  </div>
                </div>

                {/* Edit Rollout Rules Panel */}
                {rollout && isEditing && (
                  <div className="border-t border-zinc-900 pt-4 mt-2 space-y-4">
                    {/* Percent slider */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between">
                        <span className="font-bold text-zinc-400 uppercase">Rollout Percentage split</span>
                        <span className="text-amber-500 font-bold">{rollout.rollout_percentage}%</span>
                      </div>
                      <input 
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={rollout.rollout_percentage}
                        onChange={(e) => handleRolloutSlider(flag.id, parseInt(e.target.value, 10))}
                        className="w-full accent-amber-500 h-1 bg-zinc-800 rounded-none cursor-pointer"
                      />
                    </div>

                    {/* Target plan tiers */}
                    <div className="space-y-2">
                      <span className="block font-bold text-zinc-400 uppercase">Target Pricing Tiers</span>
                      <div className="flex flex-wrap gap-2">
                        {["plan_free", "plan_growth", "plan_scale", "plan_enterprise"].map((tier) => {
                          const isTargeted = rollout.target_rules.plan_tiers?.includes(tier);
                          return (
                            <button
                              key={tier}
                              onClick={() => handleUpdateRules(flag.id, tier)}
                              className={`px-3 py-1 font-bold transition-colors border ${
                                isTargeted 
                                  ? "bg-amber-500/10 border-amber-500 text-amber-500" 
                                  : "bg-zinc-900 border-zinc-800 text-zinc-400"
                              }`}
                            >
                              {tier.split("_")[1].toUpperCase()}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeployRollout(flag.id)}
                      className="flex items-center space-x-1 border border-emerald-500 bg-emerald-500/10 px-3 py-1.5 font-bold text-emerald-500 hover:bg-emerald-500 hover:text-black transition-colors"
                    >
                      <Check className="h-3.5 w-3.5" />
                      <span>DEPLOY_ROLLOUT_RULES</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Right Side: Change History Log */}
        <div className="border border-zinc-800 bg-zinc-950 p-4 space-y-4 lg:col-span-1">
          <div className="flex items-center space-x-2 border-b border-zinc-800 pb-2">
            <Sliders className="h-4 w-4 text-amber-500" />
            <span className="font-bold text-zinc-200 uppercase">Flag Ledger Logs</span>
          </div>

          <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar">
            {flagHistory.length > 0 ? (
              flagHistory.map((log) => (
                <div key={log.id} className="border-l border-zinc-800 pl-2 text-[10px] space-y-0.5">
                  <span className="font-bold text-zinc-300 uppercase block">{log.action}</span>
                  <p className="text-zinc-500 text-[9px]">
                    Flag ID: {log.targetId?.slice(0, 8)} | On: {new Date(log.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ))
            ) : (
              <span className="text-zinc-600 block text-center">NO_LEDGER_ENTRIES</span>
            )}
          </div>
        </div>
      </div>

      {/* Creation Modal Form */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-md border border-zinc-800 bg-zinc-950 p-6">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <span className="text-[10px] font-bold uppercase text-amber-500 flex items-center space-x-1">
                <ToggleRight className="h-3.5 w-3.5" />
                <span>REGISTER_NEW_FEATURE_GATE</span>
              </span>
              <button 
                onClick={() => setCreateOpen(false)}
                className="text-zinc-500 hover:text-white"
              >
                [X]
              </button>
            </div>
            <form onSubmit={handleCreateFlag} className="mt-4 space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">Flag Name Key</label>
                <input 
                  type="text" 
                  value={newFlagName}
                  onChange={(e) => setNewFlagName(e.target.value)}
                  className="w-full border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-zinc-200 outline-none focus:border-amber-500" 
                  placeholder="allow-advanced-exporting"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">Description / Spec</label>
                <input 
                  type="text" 
                  value={newFlagDesc}
                  onChange={(e) => setNewFlagDesc(e.target.value)}
                  className="w-full border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-zinc-200 outline-none focus:border-amber-500" 
                  placeholder="Enables CSV export for custom billing queries"
                />
              </div>
              <div className="flex justify-end space-x-3 pt-3 border-t border-zinc-800">
                <button 
                  type="button" 
                  onClick={() => setCreateOpen(false)}
                  className="border border-zinc-800 bg-zinc-900 px-4 py-1.5 text-zinc-400 hover:text-white"
                >
                  CANCEL
                </button>
                <button 
                  type="submit" 
                  className="border border-amber-500 bg-amber-500/10 px-4 py-1.5 text-amber-500 hover:bg-amber-500 hover:text-black font-bold"
                >
                  REGISTER
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
