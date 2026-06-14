// features/support/hooks/use-support-tickets.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ticketService, type TicketFilters } from "../services/ticket.service";
import { impersonationService } from "../services/impersonation.service";
import { toast } from "sonner";

export function useSupportTicketsQuery(filters?: TicketFilters) {
  return useQuery({
    queryKey: ["super-admin", "support-tickets", filters],
    queryFn: () => ticketService.getTickets(filters),
    staleTime: 30 * 1000
  });
}

export function useTicketMessagesQuery(ticketId: string) {
  return useQuery({
    queryKey: ["super-admin", "support-messages", ticketId],
    queryFn: () => ticketService.getMessages(ticketId),
    enabled: !!ticketId,
    staleTime: 10 * 1000
  });
}

export function useAddMessageMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      ticketId,
      senderId,
      body,
      isAdmin = true
    }: {
      ticketId: string;
      senderId: string;
      body: string;
      isAdmin?: boolean;
    }) => {
      await ticketService.addMessage(ticketId, senderId, body, isAdmin);
      return { ticketId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["super-admin", "support-messages", data.ticketId] });
      queryClient.invalidateQueries({ queryKey: ["super-admin", "support-tickets"] });
    },
    onError: (err) => {
      toast.error(`Failed to send message: ${err.message}`);
    }
  });
}

export function useResolveTicketMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ticketId: string) => {
      await ticketService.resolveTicket(ticketId);
      return { ticketId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["super-admin", "support-tickets"] });
      toast.success(`Ticket ${data.ticketId} successfully resolved.`);
    },
    onError: (err) => {
      toast.error(`Failed to resolve ticket: ${err.message}`);
    }
  });
}

export function useImpersonateUserMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      adminId,
      userId,
      companyId,
      justification
    }: {
      adminId: string;
      userId: string;
      companyId: string;
      justification: string;
    }) => {
      return await impersonationService.createSession(adminId, userId, companyId, justification);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["super-admin", "impersonation-sessions"] });
      toast.success("Impersonation session launched. Gateway open.");
    },
    onError: (err) => {
      toast.error(`Impersonation failed: ${err.message}`);
    }
  });
}

export function useEndImpersonationMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      await impersonationService.endSession(sessionId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["super-admin", "impersonation-sessions"] });
      toast.success("Impersonation session securely terminated.");
    },
    onError: (err) => {
      toast.error(`Failed to end session: ${err.message}`);
    }
  });
}

export function useActiveImpersonationsQuery(adminId?: string) {
  return useQuery({
    queryKey: ["super-admin", "impersonation-sessions", adminId],
    queryFn: () => {
      if (!adminId) return [];
      return impersonationService.getActiveSessions(adminId);
    },
    enabled: !!adminId,
    staleTime: 10 * 1000
  });
}
