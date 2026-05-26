import { createServerClient } from "@supabase/ssr";
import { eventBus } from "@/features/platform-core/services/event-bus.service";
import { randomUUID } from "crypto";

export interface ExperimentVariant {
  experimentId: string;
  variant: "A" | "B";
  modelName: string;
}

export class ExperimentService {
  /**
   * Routes a user to a specific variant for an active experiment.
   * Uses deterministic hashing so a user always gets the same variant.
   */
  public async routeUser(experimentId: string, userId: string): Promise<ExperimentVariant | null> {
    const supabase = this.getClient();

    // 1. Fetch active experiment
    const { data: experiment, error } = await supabase
      .from("ai_experiments")
      .select("*")
      .eq("id", experimentId)
      .eq("status", "ACTIVE")
      .single();

    if (error || !experiment) {
      return null;
    }

    // 2. Deterministic Hash (e.g., hash(userId + experimentId) % 100)
    // Mocking hash logic for simplicity
    const hash = this.stringToHash(`${userId}-${experimentId}`);
    const normalizedHash = Math.abs(hash) % 100;

    // 3. Assign Variant
    const isVariantB = normalizedHash < experiment.split_percentage;
    const variant: "A" | "B" = isVariantB ? "B" : "A";
    const modelName = isVariantB ? experiment.model_b : experiment.model_a;

    // 4. Emit tracking event for analytics
    await eventBus.publish({
      eventId: randomUUID(),
      eventType: "experiment.activated",
      schemaVersion: 1,
      producerDomain: "ai",
      tenantId: null, // Experiment is global or tenant-scoped depending on design
      actorId: userId,
      timestamp: new Date().toISOString(),
      correlationId: randomUUID(),
      payload: {
        experimentId: experiment.id,
        splitPercentage: experiment.split_percentage
      },
      metadata: { source: "system", environment: "production" }
    });

    return {
      experimentId: experiment.id,
      variant,
      modelName
    };
  }

  /**
   * Simple string hash for deterministic routing.
   */
  private stringToHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
  }

  private getClient() {
    return createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => [],
          setAll: () => {},
        },
      }
    );
  }
}

export const experimentService = new ExperimentService();
