import { describe, it, expect, beforeEach } from 'vitest';
import { Logger, MemorySink } from '../src/index.js';

describe('Logger', () => {
  let sink: MemorySink;

  beforeEach(() => {
    sink = new MemorySink();
  });

  it('filters by level — debug suppressed when level is info', () => {
    const log = new Logger({ level: 'info', sink });
    log.debug('hidden');
    log.info('visible');
    const records = sink.getRecords();
    expect(records).toHaveLength(1);
    expect(records[0]!.level).toBe('info');
    expect(records[0]!.message).toBe('visible');
  });

  it('emits warn and error above info threshold', () => {
    const log = new Logger({ level: 'info', sink });
    log.warn('caution');
    log.error('boom');
    const levels = sink.getRecords().map((r) => r.level);
    expect(levels).toEqual(['warn', 'error']);
  });

  it('attaches structured fields to records', () => {
    const log = new Logger({ level: 'debug', sink });
    log.info('request done', { status: 200, latencyMs: 12 });
    const [rec] = sink.getRecords();
    expect(rec!.fields).toEqual({ status: 200, latencyMs: 12 });
  });

  it('merges defaultFields from constructor and child()', () => {
    const log = new Logger({
      level: 'info',
      sink,
      defaultFields: { service: 'api' },
    });
    const child = log.child({ requestId: 'req-1' });
    child.info('handled', { path: '/health' });
    const [rec] = sink.getRecords();
    expect(rec!.fields).toEqual({
      service: 'api',
      requestId: 'req-1',
      path: '/health',
    });
  });

  it('respects setLevel at runtime', () => {
    const log = new Logger({ level: 'error', sink });
    log.warn('skipped');
    log.setLevel('warn');
    log.warn('allowed');
    expect(sink.getRecords()).toHaveLength(1);
    expect(sink.getRecords()[0]!.message).toBe('allowed');
  });
});
