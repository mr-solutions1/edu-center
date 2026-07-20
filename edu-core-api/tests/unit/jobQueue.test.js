process.env.NODE_ENV = 'test';

import { InMemoryJobQueueProvider } from '../../src/shared/services/jobQueue.js';

describe('Resilient Background Job Queue Suite', () => {
  it('should execute a background task successfully when enqueued', (done) => {
    const queue = new InMemoryJobQueueProvider();

    queue.enqueue(
      'test_success_job',
      async (payload) => {
        expect(payload.data).toBe('abc');
        done();
      },
      { data: 'abc' }
    );
  });

  it('should retry a failing background task up to maxRetries using exponential backoffs', (done) => {
    const queue = new InMemoryJobQueueProvider();
    let runCount = 0;

    queue.enqueue(
      'test_retry_job',
      async () => {
        runCount++;
        throw new Error('Failing job task');
      },
      {},
      { maxRetries: 2, backoffMs: 10 }
    );

    // With maxRetries: 2, the job will attempt 3 times total (Attempt 1, Retry 1, Retry 2)
    setTimeout(() => {
      expect(runCount).toBe(3);
      done();
    }, 150); // Provide enough time for retries to execute
  });

  it('should discard a failing background task permanently once retry limit is exceeded', (done) => {
    const queue = new InMemoryJobQueueProvider();
    let runCount = 0;

    queue.enqueue(
      'test_discard_job',
      async () => {
        runCount++;
        throw new Error('Failing discard task');
      },
      {},
      { maxRetries: 1, backoffMs: 10 }
    );

    setTimeout(() => {
      // Should run exactly 2 times (Attempt 1, Retry 1) and then get discarded
      expect(runCount).toBe(2);
      expect(queue.queue).toHaveLength(0);
      done();
    }, 150);
  });
});
