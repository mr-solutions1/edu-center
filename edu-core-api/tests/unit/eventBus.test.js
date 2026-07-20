process.env.NODE_ENV = 'test';

import {
  DomainEvent,
  InMemoryEventBusProvider,
} from '../../src/shared/services/eventBus.js';

describe('Resilient Event Bus Foundations Suite', () => {
  it('should initialize DomainEvent details correctly and enforce contract fields', () => {
    const event = new DomainEvent({
      eventType: 'TestPaymentReceived',
      tenantId: 'tenant_abc',
      payload: { amount: 50 },
    });

    expect(event.eventId).toBeDefined();
    expect(event.eventType).toBe('TestPaymentReceived');
    expect(event.tenantId).toBe('tenant_abc');
    expect(event.payload.amount).toBe(50);

    expect(() => new DomainEvent({ eventType: null })).toThrow(
      'EventType is required'
    );
  });

  it('should successfully publish events and trigger subscribed handlers asynchronously', (done) => {
    const bus = new InMemoryEventBusProvider();
    const event = new DomainEvent({
      eventType: 'UserLoggedIn',
      payload: { userId: '12345' },
    });

    bus.subscribe('UserLoggedIn', (e) => {
      expect(e.payload.userId).toBe('12345');
      done();
    });

    bus.publish(event);
  });

  it('should prevent handler errors from affecting other subscribers (error shielding)', (done) => {
    const bus = new InMemoryEventBusProvider();
    const event = new DomainEvent({
      eventType: 'InvoiceGenerated',
      payload: { invoiceId: 'INV001' },
    });

    let firstExecuted = false;
    let secondExecuted = false;

    bus.subscribe('InvoiceGenerated', () => {
      firstExecuted = true;
      throw new Error('Failing handler error!');
    });

    bus.subscribe('InvoiceGenerated', () => {
      secondExecuted = true;

      // Since handlers are scheduled via setImmediate, give both a moment to run
      setTimeout(() => {
        expect(firstExecuted).toBe(true);
        expect(secondExecuted).toBe(true);
        done();
      }, 50);
    });

    bus.publish(event);
  });
});
