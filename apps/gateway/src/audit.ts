import crypto from 'node:crypto';

export type AuditOutcome = 'success' | 'failure' | 'denied';

export interface AuditEvent {
  id: string;
  timestamp: string;
  action: string;
  outcome: AuditOutcome;
  actor?: string;
  ip?: string;
  requestId?: string;
  resource?: string;
  details?: Record<string, unknown>;
}

export class AuditLog {
  private readonly events: AuditEvent[] = [];

  emit(event: Omit<AuditEvent, 'id' | 'timestamp'>): AuditEvent {
    const emitted: AuditEvent = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      ...event,
    };
    this.events.unshift(emitted);
    if (this.events.length > 1000) {
      this.events.length = 1000;
    }
    return emitted;
  }

  list(limit = 100): AuditEvent[] {
    return this.events.slice(0, limit);
  }

  clear(): void {
    this.events.length = 0;
  }
}
