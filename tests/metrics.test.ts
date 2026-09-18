import { describe, it, expect, beforeEach } from 'vitest';
import { MetricsRegistry } from '../src/index.js';

describe('MetricsRegistry', () => {
  let registry: MetricsRegistry;

  beforeEach(() => {
    registry = new MetricsRegistry();
  });

  it('increments counters by default 1 and by n', () => {
    const reqs = registry.counter('http_requests_total');
    reqs.inc();
    reqs.inc(4);
    expect(reqs.value()).toBe(5);
  });

  it('returns the same counter instance for a given name', () => {
    const a = registry.counter('c');
    const b = registry.counter('c');
    a.inc(2);
    expect(b.value()).toBe(2);
  });

  it('records histogram observations', () => {
    const lat = registry.histogram('http_latency_ms');
    lat.observe(10);
    lat.observe(25.5);
    expect(lat.values()).toEqual([10, 25.5]);
  });

  it('snapshot includes all counters and histograms', () => {
    registry.counter('hits').inc(3);
    registry.histogram('dur').observe(7);
    const snap = registry.snapshot();
    expect(snap.counters).toEqual({ hits: 3 });
    expect(snap.histograms).toEqual({ dur: [7] });
  });

  it('rejects negative counter increments', () => {
    expect(() => registry.counter('x').inc(-1)).toThrow(/non-negative/);
  });
});
