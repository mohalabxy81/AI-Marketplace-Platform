// features/support/services/ticket.service.ts
import { supabase } from "@/lib/supabase/client";
import { type SupportTicket, type SupportMessage, type TicketStatus } from "@/types/super-admin/support";

export interface TicketFilters {
  status?: TicketStatus;
  companyId?: string;
  userId?: string;
}

export const ticketService = {
  /**
   * Get support tickets with optional filters.
   */
  async getTickets(filters?: TicketFilters): Promise<SupportTicket[]> {
    let query = supabase
      .from("support_tickets")
      .select("*")
      .order("updated_at", { ascending: false });

    if (filters?.status) query = query.eq("status", filters.status);
    if (filters?.companyId) query = query.eq("company_id", filters.companyId);
    if (filters?.userId) query = query.eq("user_id", filters.userId);

    const { data, error } = await query;
    if (error) throw new Error(`ticketService.getTickets: ${error.message}`);
    return (data as SupportTicket[]) ?? [];
  },

  /**
   * Get messages for a specific ticket.
   */
  async getMessages(ticketId: string): Promise<SupportMessage[]> {
    const { data, error } = await supabase
      .from("support_messages")
      .select("*")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true });

    if (error) throw new Error(`ticketService.getMessages: ${error.message}`);
    return (data as SupportMessage[]) ?? [];
  },

  /**
   * Add a message to a ticket and update ticket status if needed.
   */
  async addMessage(ticketId: string, senderId: string, body: string, isAdmin: boolean): Promise<void> {
    const { error: msgErr } = await supabase.from("support_messages").insert({
      ticket_id: ticketId,
      sender_id: senderId,
      sender_type: isAdmin ? "ADMIN" : "USER",
      body,
    });

    if (msgErr) throw new Error(`ticketService.addMessage (insert): ${msgErr.message}`);

    const { error: ticketErr } = await supabase
      .from("support_tickets")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", ticketId);

    if (ticketErr) throw new Error(`ticketService.addMessage (update): ${ticketErr.message}`);
  },

  /**
   * Resolve a ticket.
   */
  async resolveTicket(ticketId: string): Promise<void> {
    const { error } = await supabase
      .from("support_tickets")
      .update({ status: "RESOLVED", updated_at: new Date().toISOString() })
      .eq("id", ticketId);

    if (error) throw new Error(`ticketService.resolveTicket: ${error.message}`);
  },
};
