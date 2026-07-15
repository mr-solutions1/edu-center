import { EventEmitter } from 'node:events';
import logger from './logger.js';

/**
 * Domain Event Envelope Contract
 */
export class DomainEvent {
  constructor({ eventType, tenantId, branchId, actorId, correlationId, payload }) {
    this.eventId = crypto.randomUUID();
    this.eventType = eventType;
    this.timestamp = new Date();
    this.tenantId = tenantId;
    this.branchId = branchId;
    this.actorId = actorId;
    this.correlationId = correlationId;
    this.payload = payload;
  }
}

/**
 * Abstract Event Bus Provider (Interface)
 */
export class EventBusProvider {
  publish(event) {
    throw new Error('Method "publish" must be implemented by concrete EventBusProvider');
  }
  subscribe(eventType, handler) {
    throw new Error('Method "subscribe" must be implemented by concrete EventBusProvider');
  }
}

/**
 * Concrete In-Memory Event Bus implementation using Node.js EventEmitter.
 */
class InMemoryEventBusProvider extends EventBusProvider {
  constructor() {
    super();
    this.emitter = new EventEmitter();
  }

  publish(event) {
    logger.info(`📢 [EventBus] Publishing event ${event.eventType} (ID: ${event.eventId})`, {
      correlationId: event.correlationId,
      tenantId: event.tenantId,
    });
    this.emitter.emit(event.eventType, event);
  }

  subscribe(eventType, handler) {
    this.emitter.on(eventType, handler);
    logger.info(`🔌 [EventBus] Subscribed handler to [${eventType}]`);
  }
}

// Global EventBus instance (configured to use InMemory by default, extensible to Kafka/RabbitMQ)
const activeProvider = new InMemoryEventBusProvider();

export default activeProvider;
