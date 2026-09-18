import { randomBytes } from 'node:crypto';
import type { Span, SpanExporter } from '../types.js';

function newId(bytes = 8): string {
  return randomBytes(bytes).toString('hex');
}

/**
 * In-memory span collector for demos and unit tests.
 */
export class MemoryTracer implements SpanExporter {
  private spans: Span[] = [];

  export(span: Span): void {
    this.spans.push({ ...span, attributes: span.attributes ? { ...span.attributes } : undefined });
  }

  getSpans(): Span[] {
    return [...this.spans];
  }

  clear(): void {
    this.spans = [];
  }
}

export interface TraceContextOptions {
  tracer?: SpanExporter;
}

/**
 * Trace / span context with correlation IDs.
 * `createRoot()` starts a new trace; `child()` nests under the current span;
 * `withSpan()` times an async/sync function and records the finished span.
 */
export class TraceContext {
  readonly traceId: string;
  readonly spanId: string;
  readonly parentSpanId?: string;
  private readonly tracer: SpanExporter;

  private constructor(
    traceId: string,
    spanId: string,
    parentSpanId: string | undefined,
    tracer: SpanExporter,
  ) {
    this.traceId = traceId;
    this.spanId = spanId;
    this.parentSpanId = parentSpanId;
    this.tracer = tracer;
  }

  /** Start a new root trace (new `traceId`). */
  static createRoot(options: TraceContextOptions = {}): TraceContext {
    return new TraceContext(newId(16), newId(8), undefined, options.tracer ?? new MemoryTracer());
  }

  /** Nested context sharing this `traceId`, parented to the current span. */
  child(): TraceContext {
    return new TraceContext(this.traceId, newId(8), this.spanId, this.tracer);
  }

  /**
   * Run `fn` inside a named span. Records start/end, status, and optional attributes.
   * Propagates the same `traceId` for correlation across nested calls.
   */
  async withSpan<T>(
    name: string,
    fn: (ctx: TraceContext) => Promise<T> | T,
    attributes?: Record<string, unknown>,
  ): Promise<T> {
    const child = this.child();
    const startTime = Date.now();
    let status: Span['status'] = 'ok';
    let errorMessage: string | undefined;

    try {
      return await fn(child);
    } catch (err) {
      status = 'error';
      errorMessage = err instanceof Error ? err.message : String(err);
      throw err;
    } finally {
      const span: Span = {
        traceId: child.traceId,
        spanId: child.spanId,
        parentSpanId: child.parentSpanId,
        name,
        startTime,
        endTime: Date.now(),
        attributes,
        status,
        errorMessage,
      };
      this.tracer.export(span);
    }
  }

  /** Access the underlying exporter (e.g. MemoryTracer for assertions). */
  getTracer(): SpanExporter {
    return this.tracer;
  }

  /** Fields suitable for Logger `defaultFields` / per-call fields. */
  correlationFields(): { traceId: string; spanId: string; parentSpanId?: string } {
    const fields: { traceId: string; spanId: string; parentSpanId?: string } = {
      traceId: this.traceId,
      spanId: this.spanId,
    };
    if (this.parentSpanId !== undefined) {
      fields.parentSpanId = this.parentSpanId;
    }
    return fields;
  }
}
