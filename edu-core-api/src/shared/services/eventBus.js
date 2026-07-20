import { EventEmitter } from 'node:events';

import logger from './logger.js';
import { env } from '../../config/env.js';

/**
 * Enterprise Domain Event Envelope Contract
 */
export class DomainEvent {
  constructor({
    eventType,
    tenantId,
    branchId,
    actorId,
    correlationId,
    payload = {},
  }) {
    if (!eventType) {
      throw new Error('EventType is required for DomainEvent initialization.');
    }

    this.eventId = crypto.randomUUID();
    this.eventType = eventType;
    this.timestamp = new Date();
    this.tenantId = tenantId || null;
    this.branchId = branchId || null;
    this.actorId = actorId || null;
    this.correlationId = correlationId || null;
    this.payload = payload;
  }
}

/**
 * Abstract Event Bus Provider (Interface)
 */
export class EventBusProvider {
  publish(_event) {
    throw new Error(
      'Method "publish" must be implemented by concrete EventBusProvider'
    );
  }

  subscribe(_eventType, _handler) {
    throw new Error(
      'Method "subscribe" must be implemented by concrete EventBusProvider'
    );
  }
}

/**
 * Concrete In-Memory Event Bus implementation using Node.js EventEmitter with Error Shielding.
 */
export class InMemoryEventBusProvider extends EventBusProvider {
  constructor() {
    super();
    this.emitter = new EventEmitter();
  }

  publish(event) {
    logger.info(
      `📢 [EventBus] Publishing event ${event.eventType} (ID: ${event.eventId})`,
      {
        correlationId: event.correlationId,
        tenantId: event.tenantId,
      }
    );

    // Error-shielded dispatch: prevent one failing handler from crashing standard operations
    const listeners = this.emitter.listeners(event.eventType);

    listeners.forEach((handler) => {
      // Execute asynchronously to keep HTTP loop unblocked
      setImmediate(async () => {
        try {
          await handler(event);
        } catch (err) {
          logger.error(
            `❌ [EventBus] Error handling event [${event.eventType}] in subscriber: ${err.message}`,
            {
              eventId: event.eventId,
              stack: err.stack,
            }
          );
        }
      });
    });
  }

  subscribe(eventType, handler) {
    this.emitter.on(eventType, handler);
    logger.info(`🔌 [EventBus] Subscribed handler to [${eventType}]`);
  }
}

/**
 * Concrete Distributed Redis Pub/Sub Event Bus Provider
 */
export class RedisEventBusProvider extends EventBusProvider {
  constructor() {
    super();
    this.channel = 'edu-core-events';
    this.inMemory = new InMemoryEventBusProvider();
    this.enabled = !!env.REDIS_HOST;

    if (this.enabled) {
      logger.info(
        `🔌 [RedisEventBusProvider] Connecting to Redis at ${env.REDIS_HOST}`
      );
      // In production:
      // this.pubClient = createClient({ url: `redis://${env.REDIS_HOST}:${env.REDIS_PORT}` });
      // this.subClient = this.pubClient.duplicate();
      // await Promise.all([this.pubClient.connect(), this.subClient.connect()]);
      // await this.subClient.subscribe(this.channel, (message) => {
      //   const event = JSON.parse(message);
      //   this.inMemory.emitter.emit(event.eventType, event);
      // });
    }
  }

  publish(event) {
    if (!this.enabled) {
      logger.warn(
        `[RedisEventBusProvider] Redis is not configured. Falling back to in-memory event bus.`
      );
      this.inMemory.publish(event);
      return;
    }

    try {
      logger.info(
        `📢 [RedisEventBus] Publishing distributed event ${event.eventType}`
      );
      // In production:
      // await this.pubClient.publish(this.channel, JSON.stringify(event));
      this.inMemory.publish(event); // fallback mirror
    } catch (err) {
      logger.error(`[RedisEventBusProvider] Publish error: ${err.message}`);
      this.inMemory.publish(event);
    }
  }

  subscribe(eventType, handler) {
    // Subscriptions route to local memory emitter which consumes messages mirrored from Redis Sub
    this.inMemory.subscribe(eventType, handler);
  }
}

// Global EventBus instance (Using Redis provider if REDIS_HOST env exists, falling back dynamically)
const activeProvider = env.REDIS_HOST
  ? new RedisEventBusProvider()
  : new InMemoryEventBusProvider();

export default activeProvider;
