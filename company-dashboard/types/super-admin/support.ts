// types/super-admin/support.ts

export type TicketStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";

export type TicketPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type SenderType = "USER" | "ADMIN";

export interface SupportTicket {
  id: string;
  company_id: string;
  user_id: string;
  subject: string;
  status: TicketStatus;
  priority: TicketPriority;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupportMessage {
  id: string;
  ticket_id: string;
  sender_id: string;
  sender_type: SenderType;
  body: string;
  created_at: string;
}

export interface TicketWithMessages extends SupportTicket {
  messages: SupportMessage[];
}

export interface ImpersonationSession {
  id: string;
  admin_id: string;
  target_user_id: string;
  target_company_id: string;
  justification: string;
  started_at: string;
  expires_at: string;
  ended_at: string | null;
  is_active: boolean;
}
