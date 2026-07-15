import logger from './logger.js';

/**
 * Abstract Job Queue Provider (Interface)
 */
export class JobQueueProvider {
  enqueue(jobName, taskFn, payload = {}) {
    throw new Error('Method "enqueue" must be implemented by concrete JobQueueProvider');
  }
}

/**
 * Concrete In-Memory Job Queue Provider implementation.
 * Used for local development and light serverless setups.
 */
class InMemoryJobQueueProvider extends JobQueueProvider {
  constructor() {
    super();
    this.queue = [];
    this.isProcessing = false;
  }

  enqueue(jobName, taskFn, payload = {}) {
    logger.info(`📥 [JobQueue] Enqueued job: [${jobName}]`);

    this.queue.push({
      jobName,
      taskFn,
      payload,
      createdAt: new Date(),
    });

    // Process queue asynchronously (non-blocking)
    this._processNext();
  }

  async _processNext() {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;
    const job = this.queue.shift();

    try {
      logger.info(`⚙️ [JobQueue] Processing background job: [${job.jobName}]`);
      await job.taskFn(job.payload);
      logger.info(`✅ [JobQueue] Completed background job: [${job.jobName}]`);
    } catch (err) {
      logger.error(`❌ [JobQueue] Failed job: [${job.jobName}] - Error: ${err.message}`);
    } finally {
      this.isProcessing = false;
      this._processNext();
    }
  }
}

// Instantiate and export standard system queue provider (InMemory by default)
const activeQueue = new InMemoryJobQueueProvider();

export default activeQueue;
