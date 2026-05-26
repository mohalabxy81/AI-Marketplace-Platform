import { createServerClient } from "@supabase/ssr";
import { eventBus } from "@/features/platform-core/services/event-bus.service";
import { inferenceLogger } from "./inference-logger.service";
import { ListingCreatedEvent, ListingUpdatedEvent } from "@/types/contracts/events/marketplace.events";
import { randomUUID } from "crypto";

export class EmbeddingService {
  private readonly MODEL_NAME = "text-embedding-3-small"; // Supports hybrid fallback (Ollama) in future

  constructor() {
    // Subscribe to Marketplace events
    eventBus.subscribe<ListingCreatedEvent["payload"]>("listing.created", async (event) => {
      await this.generateAndStoreEmbedding(event.payload.listingId);
    });

    eventBus.subscribe<ListingUpdatedEvent["payload"]>("listing.updated", async (event) => {
      await this.generateAndStoreEmbedding(event.payload.listingId);
    });
  }

  /**
   * Generates a semantic embedding for a listing and stores it in pgvector.
   */
  public async generateAndStoreEmbedding(listingId: string): Promise<void> {
    const startMs = Date.now();
    const supabase = this.getClient();

    try {
      // 1. Fetch listing details to embed
      const { data: listing, error: fetchError } = await supabase
        .from("listings")
        .select("title, description, category, tags")
        .eq("id", listingId)
        .single();

      if (fetchError || !listing) throw new Error("Failed to fetch listing for embedding");

      // 2. Prepare text payload
      const textToEmbed = `
        Title: ${listing.title}
        Category: ${listing.category}
        Description: ${listing.description || ""}
        Tags: ${(listing.tags || []).join(", ")}
      `.trim();

      // 3. Call AI Provider (Mocked for architectural implementation)
      // In production: const response = await openai.embeddings.create({ ... })
      const vector = await this.mockOpenAIRequest(textToEmbed);
      const tokensUsed = Math.floor(textToEmbed.length / 4);

      // 4. Store in pgvector table
      const { error: upsertError } = await supabase
        .from("semantic_embeddings")
        .upsert({
          listing_id: listingId,
          embedding: vector, // Array representing the vector
          embedding_status: "COMPLETED",
          last_indexed_at: new Date().toISOString()
        }, { onConflict: "listing_id" });

      if (upsertError) throw upsertError;

      const latencyMs = Date.now() - startMs;

      // 5. Log Inference Metrics
      await inferenceLogger.logInference({
        modelName: this.MODEL_NAME,
        latencyMs,
        tokensUsed,
        statusCode: 200
      });

      // 6. Emit completion event
      await eventBus.publish({
        eventId: randomUUID(),
        eventType: "embedding.generated",
        schemaVersion: 1,
        producerDomain: "ai",
        tenantId: null, // Global
        actorId: null,  // System
        timestamp: new Date().toISOString(),
        correlationId: randomUUID(),
        payload: {
          listingId,
          modelName: this.MODEL_NAME,
          latencyMs
        },
        metadata: { source: "system", environment: "production" }
      });

    } catch (error) {
      console.error(`[EmbeddingService] Failed to embed listing ${listingId}:`, error);
      
      // Update status to FAILED
      await supabase
        .from("semantic_embeddings")
        .upsert({ listing_id: listingId, embedding_status: "FAILED" }, { onConflict: "listing_id" });
        
      await inferenceLogger.logInference({
        modelName: this.MODEL_NAME,
        latencyMs: Date.now() - startMs,
        tokensUsed: 0,
        statusCode: 500
      });
    }
  }

  /**
   * Mock implementation of OpenAI's embedding API for architecture phase.
   * Returns a 1536-dimensional array of floats.
   */
  private async mockOpenAIRequest(_text: string): Promise<number[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        // Return dummy 1536-d vector
        resolve(Array.from({ length: 1536 }, () => Math.random() * 2 - 1));
      }, 300);
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

// Initialize service so it subscribes to events
export const embeddingService = new EmbeddingService();
