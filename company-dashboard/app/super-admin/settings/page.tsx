// app/(super-admin)/settings/page.tsx
"use client";

import * as React from "react";
import { useAdminAuth } from "@/features/platform-core";
import { logAdminAction } from "@/features/platform-core";
import { 
  Settings, Users, Bell, AlertTriangle, ShieldCheck, 
  Trash2, Plus, Terminal, RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import { type AdminRole } from "@/types/super-admin/admin";

export default function SettingsPage() {
  const { hasCapability } = useAdminAuth();

  // Mock settings admin list
  const [adminsList, setAdminsList] = React.useState([
    { id: "adm_01", userId: "usr_WileECoyote", role: "SUPER_ADMIN", isActive: true },
    { id: "adm_02", userId: "usr_MilesDyson", role: "PLATFORM_ADMIN", isActive: true },
    { id: "adm_03", userId: "usr_WeskerSpam", role: "PLATFORM_SUPPORT", isActive: true },
    { id: "adm_04", userId: "usr_HooliSpammer", role: "MODERATOR", isActive: false }
  ]);

  // Broadcast Notification Form
  const [notifyTitle, setNotifyTitle] = React.useState("");
  const [notifyMessage, setNotifyMessage] = React.useState("");
  const [notifyType, setNotifyType] = React.useState("INFO");
  const [notifyTenant, setNotifyTenant] = React.useState("");

  if (!hasCapability("manage_admin_users")) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center border border-dashed border-red-500/40 bg-zinc-950 p-8 text-center font-mono text-xs">
        <AlertTriangle className="mb-4 h-8 w-8 text-red-500 animate-pulse" />
        <span className="text-red-500 font-bold uppercase tracking-wider">ERROR: ACCESS_DENIED</span>
        <p className="mt-2 text-zinc-400">
          Required Capability: <code className="bg-zinc-900 px-2 py-1 text-amber-500">manage_admin_users</code> is missing.
        </p>
      </div>
    );
  }

  const handleUpdateAdminRole = async (adminId: string, oldRole: string, newRole: AdminRole) => {
    await logAdminAction(
      "admin.update_role",
      "platform_admin",
      adminId,
      { role: oldRole },
      { role: newRole }
    );

    setAdminsList(prev => 
      prev.map(adm => adm.id === adminId ? { ...adm, role: newRole } : adm)
    );
    toast.success(`Admin role updated to ${newRole}.`);
  };

  const handleToggleAdminActive = async (adminId: string, currentActive: boolean) => {
    const nextActive = !currentActive;
    
    await logAdminAction(
      nextActive ? "admin.activate" : "admin.deactivate",
      "platform_admin",
      adminId,
      { active: currentActive },
      { active: nextActive }
    );

    setAdminsList(prev => 
      prev.map(adm => adm.id === adminId ? { ...adm, isActive: nextActive } : adm)
    );
    toast.success(`Admin account status successfully modified.`);
  };

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifyTitle || !notifyMessage) {
      toast.error("Notification credentials are required.");
      return;
    }

    await logAdminAction(
      "platform.broadcast_notification",
      "notification",
      null,
      null,
      { title: notifyTitle, message: notifyMessage, type: notifyType, target: notifyTenant || "GLOBAL" }
    );

    toast.success(`Broadcaster successfully fired [${notifyTitle}].`);
    setNotifyTitle("");
    setNotifyMessage("");
    setNotifyTenant("");
  };

  // System checklist mock nodes
  const SYSTEM_CHECKLIST = [
    { name: "PostgreSQL Database Engine", status: "HEALTHY", latency: "2ms" },
    { name: "Redis Shared Session Store", status: "HEALTHY", latency: "1ms" },
    { name: "Vector Index Pipeline Service", status: "HEALTHY", latency: "14ms" },
    { name: "Stripe API Integration Endpoint", status: "HEALTHY", latency: "145ms" },
    { name: "Tailwind V4 CSS Module Engine", status: "STABLE", latency: "N/A" }
  ];

  return (
    <div className="space-y-6 font-mono text-xs">
      {/* Title Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border border-zinc-800 bg-zinc-950 p-4">
        <div className="space-y-1">
          <h2 className="text-sm font-bold text-zinc-100 uppercase tracking-widest">GLOBAL_PLATFORM_SETTINGS</h2>
          <p className="text-[10px] text-zinc-500">RBAC role assignments, broadcasts, and system integrity logs</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Side: Admin user management */}
        <div className="border border-zinc-800 bg-zinc-950 p-4 space-y-4 lg:col-span-2">
          <div className="flex items-center space-x-2 border-b border-zinc-800 pb-2">
            <Users className="h-4 w-4 text-amber-500" />
            <span className="font-bold text-zinc-200 uppercase">Administrative Identity Management (RBAC)</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-500 uppercase text-[9px] bg-zinc-900/30">
                  <th className="p-3 font-bold">Admin ID</th>
                  <th className="p-3 font-bold">User Principal</th>
                  <th className="p-3 font-bold">Assigned Role</th>
                  <th className="p-3 font-bold">Status</th>
                  <th className="p-3 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-850">
                {adminsList.map((adm) => (
                  <tr key={adm.id} className="hover:bg-zinc-900/40 transition-colors">
                    <td className="p-3 font-bold text-zinc-400">{adm.id}</td>
                    <td className="p-3 text-zinc-300 font-bold">{adm.userId}</td>
                    <td className="p-3">
                      <select 
                        value={adm.role}
                        onChange={(e) => handleUpdateAdminRole(adm.id, adm.role, e.target.value as AdminRole)}
                        className="border border-zinc-800 bg-zinc-900 px-2 py-1 outline-none text-zinc-300 focus:border-amber-500 uppercase text-[10px]"
                      >
                        <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                        <option value="PLATFORM_ADMIN">PLATFORM_ADMIN</option>
                        <option value="PLATFORM_SUPPORT">PLATFORM_SUPPORT</option>
                        <option value="MODERATOR">MODERATOR</option>
                        <option value="BILLING_ADMIN">BILLING_ADMIN</option>
                        <option value="ANALYTICS_ADMIN">ANALYTICS_ADMIN</option>
                        <option value="AI_OPERATOR">AI_OPERATOR</option>
                        <option value="TRUST_AND_SAFETY">TRUST_AND_SAFETY</option>
                        <option value="READONLY_AUDITOR">READONLY_AUDITOR</option>
                      </select>
                    </td>
                    <td className="p-3">
                      <span className={`inline-flex px-1.5 py-0.5 text-[8px] font-bold uppercase ${
                        adm.isActive ? "bg-emerald-950/40 text-emerald-400 border border-emerald-500/20" : "bg-zinc-900 text-zinc-500"
                      }`}>
                        {adm.isActive ? "ACTIVE" : "INACTIVE"}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => handleToggleAdminActive(adm.id, adm.isActive)}
                        className={`border px-2 py-1 text-[9px] font-bold transition-colors ${
                          adm.isActive 
                            ? "border-red-500 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-black" 
                            : "border-emerald-500 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-black"
                        }`}
                      >
                        {adm.isActive ? "DEACTIVATE" : "ACTIVATE"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Side: Notification Broadcaster and System checklist */}
        <div className="space-y-6">
          {/* Notification Broadcaster */}
          <div className="border border-zinc-800 bg-zinc-950 p-4 space-y-4">
            <div className="flex items-center space-x-2 border-b border-zinc-800 pb-2">
              <Bell className="h-4 w-4 text-amber-500" />
              <span className="font-bold text-zinc-200 uppercase">Alert Broadcaster</span>
            </div>

            <form onSubmit={handleSendNotification} className="space-y-3">
              <div>
                <label className="block text-[9px] font-bold text-zinc-500 uppercase mb-1">Broadcast Type</label>
                <select 
                  value={notifyType}
                  onChange={(e) => setNotifyType(e.target.value)}
                  className="w-full border border-zinc-800 bg-zinc-900 px-3 py-1.5 outline-none focus:border-amber-500 text-zinc-200"
                >
                  <option value="INFO">INFO</option>
                  <option value="MAINTENANCE">MAINTENANCE</option>
                  <option value="ALERT">CRITICAL ALERT</option>
                </select>
              </div>
              <div>
                <label className="block text-[9px] font-bold text-zinc-500 uppercase mb-1">Target Tenant (Empty for Global)</label>
                <input 
                  type="text" 
                  value={notifyTenant}
                  onChange={(e) => setNotifyTenant(e.target.value)}
                  className="w-full border border-zinc-800 bg-zinc-900 px-3 py-1.5 outline-none focus:border-amber-500 text-zinc-200"
                  placeholder="co_acme_corp"
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-zinc-500 uppercase mb-1">Title Message</label>
                <input 
                  type="text" 
                  value={notifyTitle}
                  onChange={(e) => setNotifyTitle(e.target.value)}
                  className="w-full border border-zinc-800 bg-zinc-900 px-3 py-1.5 outline-none focus:border-amber-500 text-zinc-200"
                  placeholder="Database Maintenance Window Scheduled"
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-zinc-500 uppercase mb-1">Detailed Body Content</label>
                <textarea
                  value={notifyMessage}
                  onChange={(e) => setNotifyMessage(e.target.value)}
                  className="w-full h-16 border border-zinc-800 bg-zinc-900 p-2 text-zinc-200 outline-none focus:border-amber-500 font-mono text-[10px]"
                  placeholder="We will be updating the main vector cluster on Sunday from 02:00 to 04:00 UTC."
                />
              </div>
              <button 
                type="submit"
                className="w-full flex items-center justify-center space-x-1 border border-amber-500 bg-amber-500/10 py-2 text-amber-500 hover:bg-amber-500 hover:text-black font-bold transition-colors"
              >
                <span>SEND_BROADCAST_ALERT</span>
              </button>
            </form>
          </div>

          {/* System Health Checklist */}
          <div className="border border-zinc-800 bg-zinc-950 p-4 space-y-4">
            <div className="flex items-center space-x-2 border-b border-zinc-800 pb-2">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              <span className="font-bold text-zinc-200 uppercase">Security & Service Status</span>
            </div>

            <div className="space-y-3">
              {SYSTEM_CHECKLIST.map((node) => (
                <div key={node.name} className="flex justify-between items-center border-l border-zinc-800 pl-2">
                  <div>
                    <span className="font-bold text-zinc-300 block">{node.name}</span>
                    <span className="text-zinc-500 text-[9px]">Latency: {node.latency}</span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-400 uppercase">
                    {node.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
