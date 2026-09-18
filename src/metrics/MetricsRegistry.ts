import type { Counter, Histogram, MetricsSnapshot } from '../types.js';

class CounterImpl implements Counter {
  private _value = 0;

  inc(n = 1): void {
    if (!Number.isFinite(n) || n < 0) {
      throw new Error(`Counter.inc expects a non-negative finite number, got ${n}`);
    }
    this._value += n;
  }

  value(): number {
    return this._value;
  }
}

class HistogramImpl implements Histogram {
  private _values: number[] = [];

  observe(value: number): void {
    if (!Number.isFinite(value)) {
      throw new Error(`Histogram.observe expects a finite number, got ${value}`);
    }
    this._values.push(value);
  }

  values(): number[] {
    return [...this._values];
  }
}

/**
 * Registry of named counters and histograms.
 * Snapshot is suitable for demos, tests, and simple scrape endpoints.
 */
export class MetricsRegistry {
  private counters = new Map<string, CounterImpl>();
  private histograms = new Map<string, HistogramImpl>();

  /** Get or create a counter by name. */
  counter(name: string): Counter {
    let c = this.counters.get(name);
    if (!c) {
      c = new CounterImpl();
      this.counters.set(name, c);
    }
    return c;
  }

  /** Get or create a histogram by name. */
  histogram(name: string): Histogram {
    let h = this.histograms.get(name);
    if (!h) {
      h = new HistogramImpl();
      this.histograms.set(name, h);
    }
    return h;
  }

  /** Point-in-time dump of all registered metrics. */
  snapshot(): MetricsSnapshot {
    const counters: Record<string, number> = {};
    for (const [name, c] of this.counters) {
      counters[name] = c.value();
    }
    const histograms: Record<string, number[]> = {};
    for (const [name, h] of this.histograms) {
      histograms[name] = h.values();
    }
    return { counters, histograms };
  }

  /** Drop all metrics (useful between tests). */
  clear(): void {
    this.counters.clear();
    this.histograms.clear();
  }
}
