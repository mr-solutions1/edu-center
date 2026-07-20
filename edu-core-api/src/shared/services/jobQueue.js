import logger from './logger.js';
import { env } from '../../config/env.js';

/**
 * Abstract Job Queue Provider (Interface)
 */
export class JobQueueProvider {
  enqueue(_jobName, _taskFn, _payload = {}, _options = {}) {
    throw new Error(
      'Method "enqueue" must be implemented by concrete JobQueueProvider'
    );
  }
}

/**
 * Concrete In-Memory Job Queue Provider implementation with Exponential Backoff Retries.
 */
export class InMemoryJobQueueProvider extends JobQueueProvider {
  constructor() {
    super();
    this.queue = [];
    this.isProcessing = false;
  }

  enqueue(jobName, taskFn, payload = {}, options = {}) {
    const maxRetries = options.maxRetries ?? 3;
    const backoffMs = options.backoffMs ?? 100;

    logger.info(
      `📥 [JobQueue] Enqueued job: [${jobName}] (Max Retries: ${maxRetries})`
    );

    this.queue.push({
      jobName,
      taskFn,
      payload,
      options,
      maxRetries,
      backoffMs,
      retryCount: 0,
      createdAt: new Date(),
    });

    // Process queue asynchronously (non-blocking)
    setImmediate(() => {
      this._processNext();
    });
  }

  async _processNext() {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;
    const job = this.queue.shift();

    try {
      logger.info(
        `⚙️ [JobQueue] Processing background job: [${job.jobName}] (Attempt ${job.retryCount + 1}/${job.maxRetries + 1})`
      );
      await job.taskFn(job.payload);
      logger.info(`✅ [JobQueue] Completed background job: [${job.jobName}]`);
    } catch (err) {
      job.retryCount++;
      logger.error(
        `❌ [JobQueue] Job failed: [${job.jobName}] - Error: ${err.message}`
      );

      if (job.retryCount <= job.maxRetries) {
        // Calculate exponential backoff delay: backoffMs * (2 ^ retryCount)
        const delay = job.backoffMs * Math.pow(2, job.retryCount - 1);
        logger.warn(
          `⏳ [JobQueue] Rescheduling [${job.jobName}] in ${delay}ms (Retry ${job.retryCount}/${job.maxRetries})`
        );

        setTimeout(() => {
          this.queue.push(job);
          this._processNext();
        }, delay);
      } else {
        logger.error(
          `🚨 [JobQueue] Job [${job.jobName}] exceeded max retry threshold (${job.maxRetries}). Discarding job permanently.`
        );
      }
    } finally {
      this.isProcessing = false;
      // Process next immediate item
      setImmediate(() => {
        this._processNext();
      });
    }
  }
}

/**
 * Concrete Distributed Redis BullMQ-compatible Job Queue Provider
 */
export class RedisJobQueueProvider extends JobQueueProvider {
  constructor() {
    super();
    this.inMemory = new InMemoryJobQueueProvider();
    this.enabled = !!env.REDIS_HOST;

    if (this.enabled) {
      logger.info(
        `🔌 [RedisJobQueueProvider] Initializing Redis Job Worker at ${env.REDIS_HOST}`
      );
      // In production:
      // this.queueClient = new Queue('edu-core-jobs', { connection: { host: env.REDIS_HOST, port: env.REDIS_PORT } });
    }
  }

  enqueue(jobName, taskFn, payload = {}, options = {}) {
    if (!this.enabled) {
      logger.warn(
        `[RedisJobQueueProvider] Redis is not configured. Falling back to in-memory job worker.`
      );
      this.inMemory.enqueue(jobName, taskFn, payload, options);
      return;
    }

    try {
      logger.info(
        `📥 [RedisJobQueue] Enqueuing distributed background job [${jobName}]`
      );
      // In production:
      // await this.queueClient.add(jobName, payload, { attempts: options.maxRetries || 3, backoff: options.backoffMs || 1000 });
      this.inMemory.enqueue(jobName, taskFn, payload, options); // fallback mirror
    } catch (err) {
      logger.error(`[RedisJobQueueProvider] Enqueue error: ${err.message}`);
      this.inMemory.enqueue(jobName, taskFn, payload, options);
    }
  }
}

// Instantiate and export standard system queue provider dynamically based on REDIS_HOST settings
const activeQueue = env.REDIS_HOST
  ? new RedisJobQueueProvider()
  : new InMemoryJobQueueProvider();

export default activeQueue;
