import { createServerClient } from "@supabase/ssr";

export interface AIModelMetrics {
  modelName: string;
  totalCalls: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  totalTokens: number;
  errorRate: number;
}

export class AIObservabilityService {
  /**
   * Generates observability metrics for AI models over a given time window.
   */
  public async getModelMetrics(hours: number = 24): Promise<AIModelMetrics[]> {
    const supabase = this.getClient();
    const cutoffDate = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

    const { data: logs, error } = await supabase
      .from("ai_inference_logs")
      .select("model_name, latency_ms, tokens_used, status_code")
      .gte("created_at", cutoffDate);

    if (error || !logs) {
      console.error("[AIObservability] Failed to fetch inference logs", error);
      return [];
    }

    // Group by model
    const metricsByModel = new Map<string, {
      calls: number;
      latencies: number[];
      tokens: number;
      errors: number;
    }>();

    for (const log of logs) {
      const model = log.model_name;
      if (!metricsByModel.has(model)) {
        metricsByModel.set(model, { calls: 0, latencies: [], tokens: 0, errors: 0 });
      }
      
      const stats = metricsByModel.get(model)!;
      stats.calls++;
      stats.latencies.push(log.latency_ms);
      stats.tokens += log.tokens_used;
      if (log.status_code >= 400) {
        stats.errors++;
      }
    }

    // Calculate aggregations
    const results: AIModelMetrics[] = [];
    
    for (const [modelName, stats] of metricsByModel.entries()) {
      stats.latencies.sort((a, b) => a - b);
      
      const avgLatency = stats.latencies.reduce((a, b) => a + b, 0) / stats.calls;
      const p95Index = Math.floor(stats.calls * 0.95);
      const p95Latency = stats.latencies[p95Index] || avgLatency;
      
      results.push({
        modelName,
        totalCalls: stats.calls,
        avgLatencyMs: avgLatency,
        p95LatencyMs: p95Latency,
        totalTokens: stats.tokens,
        errorRate: stats.errors / stats.calls
      });
    }

    return results;
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

export const aiObservabilityService = new AIObservabilityService();
