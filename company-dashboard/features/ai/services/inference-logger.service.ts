import { createServerClient } from "@supabase/ssr";

export interface InferenceLogParams {
  modelName: string;
  latencyMs: number;
  tokensUsed: number;
  statusCode: number;
}

export class InferenceLoggerService {
  /**
   * Asynchronously logs inference metrics to ai_inference_logs.
   * Uses Edge-friendly Supabase client.
   */
  public async logInference(params: InferenceLogParams): Promise<void> {
    const supabase = this.getClient();
    
    // Fire and forget - do not block the AI request
    supabase.from("ai_inference_logs").insert([
      {
        model_name: params.modelName,
        latency_ms: params.latencyMs,
        tokens_used: params.tokensUsed,
        status_code: params.statusCode,
        created_at: new Date().toISOString(),
      }
    ]).then(({ error }) => {
      if (error) {
        console.error("[InferenceLogger] Failed to record log:", error);
      }
    });
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

export const inferenceLogger = new InferenceLoggerService();
