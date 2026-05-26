import { randomUUID } from "crypto";

export interface ProfilerResult {
  operation: string;
  durationMs: number;
  metadata?: Record<string, any>;
  timestamp: string;
}

export class ProfilerService {
  private results: ProfilerResult[] = [];

  /**
   * Wraps an async function to measure its execution time.
   */
  public async profile<T>(
    operationName: string,
    metadata: Record<string, any>,
    fn: () => Promise<T>
  ): Promise<T> {
    const start = performance.now();
    try {
      return await fn();
    } finally {
      const durationMs = performance.now() - start;
      this.record({
        operation: operationName,
        durationMs,
        metadata,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Records a profiling result. In production, this might batch and send to Datadog/CloudWatch.
   */
  private record(result: ProfilerResult) {
    this.results.push(result);
    
    // Alert on slow operations (> 500ms)
    if (result.durationMs > 500) {
      console.warn(`[Profiler] SLOW OPERATION DETECTED: ${result.operation} took ${result.durationMs.toFixed(2)}ms`, result.metadata);
    } else {
      // Trace log
      // console.debug(`[Profiler] ${result.operation} took ${result.durationMs.toFixed(2)}ms`);
    }

    // Prevent memory leak in long-running process
    if (this.results.length > 1000) {
      this.results.shift();
    }
  }

  public getRecentResults(): ProfilerResult[] {
    return [...this.results];
  }
}

export const profilerService = new ProfilerService();
