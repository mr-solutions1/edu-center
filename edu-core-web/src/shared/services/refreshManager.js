let refreshPromise = null;

/**
 * Centrally coordinates all token refresh requests to guarantee exactly one
 * active network request (single-flight) at any given moment.
 *
 * @param {Function} performRefreshCall - The actual asynchronous API call function
 * @returns {Promise} Resolves with the refresh result
 */
export function refreshOnce(performRefreshCall) {
  const refreshId = Math.random().toString(36).substring(2, 11);
  const timestamp = new Date().toISOString();
  const callerStack = new Error().stack?.split('\n')[2]?.trim() || 'unknown';

  if (refreshPromise) {
    console.info({
      event: 'REFRESH_REQUEST_REUSED',
      caller: callerStack,
      refreshId,
      timestamp,
      reusedPromise: true,
    });
    return refreshPromise;
  }

  console.info({
    event: 'REFRESH_REQUEST_STARTED',
    caller: callerStack,
    refreshId,
    timestamp,
    reusedPromise: false,
  });

  refreshPromise = performRefreshCall()
    .then((result) => {
      console.info({
        event: 'REFRESH_REQUEST_COMPLETED',
        caller: 'refreshOnce',
        refreshId,
        timestamp: new Date().toISOString(),
        status: 'success',
      });
      return result;
    })
    .catch((error) => {
      console.error({
        event: 'REFRESH_REQUEST_FAILED',
        caller: 'refreshOnce',
        refreshId,
        timestamp: new Date().toISOString(),
        error: error.message || error,
      });
      throw error;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

/**
 * Check if a refresh request is currently active.
 * @returns {boolean}
 */
export function isRefreshing() {
  return !!refreshPromise;
}

/**
 * Get the currently active refresh promise.
 * @returns {Promise|null}
 */
export function getRefreshPromise() {
  return refreshPromise;
}
