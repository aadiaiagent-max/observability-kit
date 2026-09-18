/**
 * Minimal demo: correlate logs + metrics + spans for one "request".
 * Run: npm run example
 */
import {
  Logger,
  MemorySink,
  MetricsRegistry,
  TraceContext,
  MemoryTracer,
} from '../src/index.js';

async function main(): Promise<void> {
  const sink = new MemorySink();
  const tracer = new MemoryTracer();
  const metrics = new MetricsRegistry();

  const root = TraceContext.createRoot({ tracer });
  const log = new Logger({
    level: 'debug',
    sink,
    defaultFields: { service: 'demo-api', ...root.correlationFields() },
  });

  metrics.counter('http_requests_total').inc();

  await root.withSpan('GET /orders', async (ctx) => {
    const reqLog = log.child(ctx.correlationFields());
    reqLog.info('handling request', { method: 'GET', path: '/orders' });

    await ctx.withSpan('db.query', async () => {
      const start = Date.now();
      // pretend DB work
      await new Promise((r) => setTimeout(r, 5));
      metrics.histogram('db_query_ms').observe(Date.now() - start);
      reqLog.debug('query complete', { rows: 3 });
    });

    metrics.histogram('http_latency_ms').observe(12);
    reqLog.info('response', { status: 200 });
  });

  console.log('--- logs ---');
  console.log(JSON.stringify(sink.getRecords(), null, 2));
  console.log('--- metrics ---');
  console.log(JSON.stringify(metrics.snapshot(), null, 2));
  console.log('--- spans ---');
  console.log(JSON.stringify(tracer.getSpans(), null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
