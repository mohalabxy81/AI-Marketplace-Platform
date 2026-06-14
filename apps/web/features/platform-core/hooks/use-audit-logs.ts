// features/platform-core/hooks/use-audit-logs.ts
import { useQuery } from "@tanstack/react-query";
import { getAuditLogs, type AuditFilters } from "../services/platform-audit.service";

export function useAuditLogsQuery(filters?: AuditFilters, limit = 50, offset = 0) {
  return useQuery({
    queryKey: ["super-admin", "audit-logs", filters, limit, offset],
    queryFn: () => getAuditLogs(filters, limit, offset),
    staleTime: 30 * 1000
  });
}
