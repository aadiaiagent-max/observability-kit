import { describe, it, expect } from 'vitest';
import { TraceContext, MemoryTracer } from '../src/index.js';

describe('TraceContext', () => {
  it('createRoot produces a unique traceId and spanId', () => {
    const a = TraceContext.createRoot();
    const b = TraceContext.createRoot();
    expect(a.traceId).toHaveLength(32);
    expect(a.spanId).toHaveLength(16);
    expect(a.parentSpanId).toBeUndefined();
    expect(a.traceId).not.toBe(b.traceId);
  });

  it('nested spans share the same traceId', async () => {
    const tracer = new MemoryTracer();
    const root = TraceContext.createRoot({ tracer });

    await root.withSpan('parent', async (parentCtx) => {
      await parentCtx.withSpan('child-a', async () => 'ok');
      await parentCtx.withSpan('child-b', async () => 'ok');
    });

    const spans = tracer.getSpans();
    expect(spans).toHaveLength(3);

    const traceIds = new Set(spans.map((s) => s.traceId));
    expect(traceIds.size).toBe(1);
    expect([...traceIds][0]).toBe(root.traceId);

    const parent = spans.find((s) => s.name === 'parent')!;
    const children = spans.filter((s) => s.name.startsWith('child-'));
    expect(children).toHaveLength(2);
    for (const c of children) {
      expect(c.parentSpanId).toBe(parent.spanId);
      expect(c.traceId).toBe(parent.traceId);
    }
  });

  it('child() shares traceId and sets parentSpanId', () => {
    const root = TraceContext.createRoot();
    const child = root.child();
    expect(child.traceId).toBe(root.traceId);
    expect(child.parentSpanId).toBe(root.spanId);
    expect(child.spanId).not.toBe(root.spanId);
  });

  it('withSpan records error status and rethrows', async () => {
    const tracer = new MemoryTracer();
    const root = TraceContext.createRoot({ tracer });

    await expect(
      root.withSpan('failing', async () => {
        throw new Error('kaboom');
      }),
    ).rejects.toThrow('kaboom');

    const [span] = tracer.getSpans();
    expect(span!.status).toBe('error');
    expect(span!.errorMessage).toBe('kaboom');
    expect(span!.name).toBe('failing');
  });

  it('correlationFields exposes ids for Logger', () => {
    const root = TraceContext.createRoot();
    const child = root.child();
    expect(child.correlationFields()).toEqual({
      traceId: child.traceId,
      spanId: child.spanId,
      parentSpanId: root.spanId,
    });
  });
});
