export * from "./**
   * Create a time-boxed impersonation session.
   * NOTE: For full security, getting the actual JWT requires a server-side route
   * with the service_role key to bypass normal auth, or an Edge Function.
   * This handles the audit and session record part.
   */
  async createSession(
    adminId: string,
    targetUserId: string,
    targetCompanyId: string,
    justification: string
  ): Promise<ImpersonationSession> {
    const { data, error } = await supabase
      .from(";
