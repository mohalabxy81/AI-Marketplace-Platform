/* eslint-disable @typescript-eslint/no-explicit-any */
// app/(super-admin)/support/page.tsx
"use client";

import * as React from "react";
import { useAdminAuth } from "@/features/platform-core";
import { useSupportTicketsQuery, useTicketMessagesQuery, useAddMessageMutation, useImpersonateUserMutation } from "@/features/support";
import { logAdminAction } from "@/features/platform-core";
import { AlertTriangle, Key, CheckCircle, Send, Mail } from "lucide-react";
import { toast } from "sonner";

export default function SupportPage() {
  const { hasCapability, admin } = useAdminAuth();
  const { data: tickets } = useSupportTicketsQuery();
  const sendReplyMutation = useAddMessageMutation();
  const impersonateMutation = useImpersonateUserMutation();

  const [selectedTicketId, setSelectedTicketId] = React.useState<string>("");
  const [replyBody, setReplyBody] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<"ALL" | "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED">("ALL");

  // Impersonate state
  const [impersonateOpen, setImpersonateOpen] = React.useState(false);
  const [justification, setJustification] = React.useState("");

  const { data: messages } = useTicketMessagesQuery(selectedTicketId);

  // Set initial ticket selection
  React.useEffect(() => {
    if (tickets && tickets.length > 0 && !selectedTicketId) {
      setSelectedTicketId(tickets[0].id);
    }
  }, [tickets, selectedTicketId]);

  if (!hasCapability("resolve_support_tickets")) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center border border-dashed border-red-500/40 bg-zinc-950 p-8 text-center font-mono text-xs">
        <AlertTriangle className="mb-4 h-8 w-8 text-red-500 animate-pulse" />
        <span className="text-red-500 font-bold uppercase tracking-wider">ERROR: ACCESS_DENIED</span>
        <p className="mt-2 text-zinc-400">
          Required Capability: <code className="bg-zinc-900 px-2 py-1 text-amber-500">resolve_support_tickets</code> is missing.
        </p>
      </div>
    );
  }

  const selectedTicket = tickets?.find(t => t.id === selectedTicketId);

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyBody.trim()) {
      toast.error("Reply text cannot be empty.");
      return;
    }
    
    sendReplyMutation.mutate({
      ticketId: selectedTicketId,
      senderId: admin?.id || "unknown_admin",
      body: replyBody
    });
    setReplyBody("");
  };

  const handleImpersonate = () => {
    if (!hasCapability("impersonate_user")) {
      toast.error("Unauthorized: Requires impersonate_user capability.");
      return;
    }
    setImpersonateOpen(true);
    setJustification("");
  };

  const submitImpersonation = () => {
    if (!selectedTicket || !justification) {
      toast.error("Justification is required.");
      return;
    }

    impersonateMutation.mutate({
      adminId: admin?.id || "unknown_admin",
      userId: selectedTicket.user_id,
      companyId: selectedTicket.company_id,
      justification
    });

    setImpersonateOpen(false);
  };

  const handleResolveTicket = async () => {
    if (!selectedTicket) return;
    
    await logAdminAction(
      "support.resolve_ticket",
      "support_ticket",
      selectedTicket.id,
      { status: selectedTicket.status },
      { status: "RESOLVED" }
    );
    
    toast.success(`Ticket #${selectedTicket.id.slice(0, 8)} status updated to RESOLVED.`);
  };

  // Filtered tickets list
  const filteredTickets = tickets?.filter(t => statusFilter === "ALL" || t.status === statusFilter) || [];

  return (
    <div className="space-y-6 font-mono text-xs">
      {/* Title Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border border-zinc-800 bg-zinc-950 p-4">
        <div className="space-y-1">
          <h2 className="text-sm font-bold text-zinc-100 uppercase tracking-widest">SUPPORT_TICKET_CENTER</h2>
          <p className="text-[10px] text-zinc-500">Operator impersonation gateway and direct tenant communication terminal</p>
        </div>
      </div>

      {/* Dynamic filters */}
      <div className="flex flex-wrap gap-4 border border-zinc-800 bg-zinc-950 p-4 text-[10px]">
        <div className="space-y-1">
          <span className="block font-bold text-zinc-500 uppercase">Operational status filter</span>
          <div className="flex border border-zinc-800">
            {["ALL", "OPEN", "IN_PROGRESS", "RESOLVED"].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status as any)}
                className={`px-3 py-1 font-bold transition-colors ${
                  statusFilter === status 
                    ? "bg-amber-500 text-black" 
                    : "bg-zinc-900 text-zinc-400 hover:bg-zinc-850 hover:text-white"
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Console Split View */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Side - Tickets List */}
        <div className="border border-zinc-800 bg-zinc-950 divide-y divide-zinc-850 lg:col-span-1 max-h-[500px] overflow-y-auto custom-scrollbar">
          {filteredTickets.length > 0 ? (
            filteredTickets.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedTicketId(t.id)}
                className={`w-full text-left p-4 hover:bg-zinc-900/40 transition-colors block border-l-2 ${
                  selectedTicketId === t.id 
                    ? "border-amber-500 bg-zinc-900/20" 
                    : "border-transparent"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-[10px] text-zinc-400">#{t.id.slice(0, 8)}</span>
                  <span className={`inline-flex px-1.5 py-0.5 text-[8px] font-bold uppercase ${
                    t.priority === "CRITICAL" ? "bg-red-950 text-red-500" : "bg-zinc-900 text-zinc-400"
                  }`}>
                    {t.priority}
                  </span>
                </div>
                <div className="font-bold text-zinc-100 truncate mb-1">{t.subject}</div>
                <div className="flex justify-between text-[9px] text-zinc-500 pt-1 border-t border-zinc-900/50">
                  <span>ID: {t.company_id}</span>
                  <span className="uppercase">{t.status}</span>
                </div>
              </button>
            ))
          ) : (
            <div className="p-8 text-center text-zinc-600 font-bold">NO_TICKETS_MATCHING</div>
          )}
        </div>

        {/* Right Side - Chat Panel Thread */}
        <div className="border border-zinc-800 bg-zinc-950 lg:col-span-2 flex flex-col justify-between min-h-[500px]">
          {selectedTicket ? (
            <>
              {/* Header Info Panel */}
              <div className="border-b border-zinc-800 p-4 bg-zinc-900/10 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold text-zinc-100 text-xs mb-1">{selectedTicket.subject}</h3>
                  <div className="text-[10px] text-zinc-500">
                    Issuer User: <span className="font-bold text-amber-500">{selectedTicket.user_id}</span> | Company: {selectedTicket.company_id}
                  </div>
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={handleImpersonate}
                    className="flex items-center space-x-1 border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-zinc-300 hover:border-amber-500 hover:text-amber-500 transition-colors"
                  >
                    <Key className="h-3.5 w-3.5 text-amber-500" />
                    <span>IMPERSONATE</span>
                  </button>

                  {selectedTicket.status !== "RESOLVED" && (
                    <button
                      onClick={handleResolveTicket}
                      className="flex items-center space-x-1 border border-emerald-500 bg-emerald-500/10 px-3 py-1.5 text-emerald-400 hover:bg-emerald-500 hover:text-black transition-colors"
                    >
                      <CheckCircle className="h-3.5 w-3.5" />
                      <span>RESOLVE</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Chat messages stream */}
              <div className="flex-1 p-4 overflow-y-auto space-y-4 max-h-[300px] custom-scrollbar bg-zinc-900/10">
                {messages && messages.length > 0 ? (
                  messages.map((msg) => {
                    const isAdmin = msg.sender_type === "ADMIN";
                    return (
                      <div 
                        key={msg.id} 
                        className={`flex flex-col max-w-[80%] space-y-1 ${
                          isAdmin ? "ml-auto items-end" : "mr-auto items-start"
                        }`}
                      >
                        <div className="text-[9px] text-zinc-500 uppercase font-bold">
                          {isAdmin ? "SUPPORT_OPERATOR" : "TENANT_USER"}
                        </div>
                        <div className={`p-3 border text-xs ${
                          isAdmin 
                            ? "bg-amber-950/10 border-amber-500/20 text-zinc-100" 
                            : "bg-zinc-900 border-zinc-800 text-zinc-300"
                        }`}>
                          {msg.body}
                        </div>
                        <div className="text-[8px] text-zinc-500">
                          {new Date(msg.created_at).toLocaleTimeString()}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-12 text-zinc-600 font-bold uppercase">NO_THREAD_HISTORY</div>
                )}
              </div>

              {/* Text Reply actuate */}
              <form onSubmit={handleSendReply} className="border-t border-zinc-800 p-4 bg-zinc-950 flex space-x-3">
                <input
                  type="text"
                  placeholder="Enter support communication response..."
                  value={replyBody}
                  onChange={(e) => setReplyBody(e.target.value)}
                  className="flex-1 border border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-200 outline-none focus:border-amber-500"
                />
                <button
                  type="submit"
                  disabled={sendReplyMutation.isPending}
                  className="flex items-center space-x-1 border border-amber-500 bg-amber-500/10 px-4 py-2 text-amber-500 hover:bg-amber-500 hover:text-black font-bold disabled:opacity-50 transition-colors"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>SEND</span>
                </button>
              </form>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-24 text-zinc-500">
              <Mail className="h-12 w-12 text-zinc-700 mb-2" />
              <span>SELECT_SUPPORT_TICKET_TO_COMMUNICATE</span>
            </div>
          )}
        </div>
      </div>

      {/* Impersonation Gateway Validation Modal */}
      {impersonateOpen && selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-md border border-zinc-800 bg-zinc-950 p-6">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <span className="text-[10px] font-bold uppercase text-red-500 flex items-center space-x-1">
                <AlertTriangle className="h-3.5 w-3.5 animate-pulse" />
                <span>SECURE_IMPERSONATION_GATEWAY</span>
              </span>
              <button 
                onClick={() => setImpersonateOpen(false)}
                className="text-zinc-500 hover:text-white"
              >
                [X]
              </button>
            </div>
            
            <div className="mt-4 space-y-3">
              <p className="text-[10px] text-zinc-400">
                You are about to launch user simulation impersonation for account <span className="font-bold text-amber-500">{selectedTicket.user_id}</span> to troubleshoot ticket <span className="font-bold text-amber-500">#{selectedTicket.id.slice(0, 8)}</span>.
              </p>
              
              <div className="border border-red-500/20 bg-red-950/10 p-3 text-[10px] text-red-400 font-bold uppercase">
                THIS OPERATION IS TIME-BOXED AND WILL RECORD IN THE AUDIT LEDGER.
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">
                  Security Justification Log
                </label>
                <textarea
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  placeholder={`Justification: Resolving ticket #${selectedTicket.id.slice(0,8)}. Need to audit error behavior.`}
                  className="w-full h-20 border border-zinc-800 bg-zinc-900 p-2 text-zinc-200 outline-none focus:border-amber-500 font-mono text-xs"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-zinc-800">
                <button 
                  onClick={() => setImpersonateOpen(false)}
                  className="border border-zinc-800 bg-zinc-900 px-4 py-1.5 text-zinc-400 hover:text-white"
                >
                  CANCEL
                </button>
                <button 
                  onClick={submitImpersonation}
                  disabled={impersonateMutation.isPending}
                  className="border border-red-500 bg-red-500/10 px-4 py-1.5 text-red-500 hover:bg-red-500 hover:text-black font-bold disabled:opacity-50"
                >
                  {impersonateMutation.isPending ? "LAUNCHING..." : "CONFIRM_AND_SIMULATE"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
