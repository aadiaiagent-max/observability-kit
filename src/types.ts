/** Log severity levels, ordered from most to least verbose when filtering. */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/** Structured fields attached to a log record. */
export type LogFields = Record<string, unknown>;

/** A single structured log event. */
export interface LogRecord {
  level: LogLevel;
  message: string;
  timestamp: string;
  fields?: LogFields;
}

/** Destination for log records (console, memory, remote, …). */
export interface LogSink {
  write(record: LogRecord): void;
}

/** Numeric counter metric handle. */
export interface Counter {
  /** Increment by `n` (default 1). */
  inc(n?: number): void;
  /** Current value. */
  value(): number;
}

/** Distribution / latency histogram handle. */
export interface Histogram {
  /** Record an observation. */
  observe(value: number): void;
  /** All recorded observations (copy). */
  values(): number[];
}

/** Point-in-time metrics dump for demos and tests. */
export interface MetricsSnapshot {
  counters: Record<string, number>;
  histograms: Record<string, number[]>;
}

/** A single span in a distributed (or local) trace. */
export interface Span {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  name: string;
  startTime: number;
  endTime?: number;
  attributes?: Record<string, unknown>;
  status?: 'ok' | 'error';
  errorMessage?: string;
}

/** Collects finished spans (in-memory for demos/tests). */
export interface SpanExporter {
  export(span: Span): void;
  getSpans(): Span[];
  clear(): void;
}
