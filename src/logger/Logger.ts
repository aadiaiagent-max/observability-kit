import type { LogFields, LogLevel, LogRecord, LogSink } from '../types.js';

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export interface LoggerOptions {
  /** Minimum level to emit (default: `info`). */
  level?: LogLevel;
  /** Where records are written (default: console sink). */
  sink?: LogSink;
  /** Fields merged into every record. */
  defaultFields?: LogFields;
}

/**
 * Structured logger with level filtering and pluggable sinks.
 * Correlation IDs and other context ride in `fields`.
 */
export class Logger {
  private level: LogLevel;
  private sink: LogSink;
  private defaultFields: LogFields;

  constructor(options: LoggerOptions = {}) {
    this.level = options.level ?? 'info';
    this.sink = options.sink ?? createConsoleSink();
    this.defaultFields = { ...(options.defaultFields ?? {}) };
  }

  /** Change the minimum severity at runtime. */
  setLevel(level: LogLevel): void {
    this.level = level;
  }

  /** Child logger that inherits level/sink and merges extra default fields. */
  child(fields: LogFields): Logger {
    return new Logger({
      level: this.level,
      sink: this.sink,
      defaultFields: { ...this.defaultFields, ...fields },
    });
  }

  debug(message: string, fields?: LogFields): void {
    this.emit('debug', message, fields);
  }

  info(message: string, fields?: LogFields): void {
    this.emit('info', message, fields);
  }

  warn(message: string, fields?: LogFields): void {
    this.emit('warn', message, fields);
  }

  error(message: string, fields?: LogFields): void {
    this.emit('error', message, fields);
  }

  private emit(level: LogLevel, message: string, fields?: LogFields): void {
    if (LEVEL_ORDER[level] < LEVEL_ORDER[this.level]) {
      return;
    }
    const record: LogRecord = {
      level,
      message,
      timestamp: new Date().toISOString(),
      fields: { ...this.defaultFields, ...(fields ?? {}) },
    };
    if (Object.keys(record.fields!).length === 0) {
      delete record.fields;
    }
    this.sink.write(record);
  }
}

function createConsoleSink(): LogSink {
  return {
    write(record: LogRecord): void {
      const line = JSON.stringify(record);
      switch (record.level) {
        case 'error':
          console.error(line);
          break;
        case 'warn':
          console.warn(line);
          break;
        default:
          console.log(line);
      }
    },
  };
}

/**
 * In-memory sink for unit tests and demos.
 * Captures every record written after construction (or last `clear()`).
 */
export class MemorySink implements LogSink {
  private records: LogRecord[] = [];

  write(record: LogRecord): void {
    this.records.push({ ...record, fields: record.fields ? { ...record.fields } : undefined });
  }

  getRecords(): LogRecord[] {
    return [...this.records];
  }

  clear(): void {
    this.records = [];
  }
}
