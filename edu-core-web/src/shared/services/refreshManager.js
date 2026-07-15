let refreshPromise = null;

/**
 * Centrally coordinates all token refresh requests to guarantee exactly one
 * active network request (single-flight) at any given moment.
 *
 * @param {Function} performRefreshCall - The actual asynchronous API call function
 * @param {string} source - The source invoking the refresh request
 * @param {string} instanceId - A unique ID for the request
 * @returns {Promise} Resolves with the refresh result
 */
export function refreshOnce(performRefreshCall, source = 'Other', instanceId) {
  const refreshId = instanceId || Math.random().toString(36).substring(2, 11);
  const timestamp = new Date().toISOString();
  const callerStack = new Error().stack;
  const callerLine = callerStack?.split('\n')[2]?.trim() || 'unknown';

  if (refreshPromise) {
    console.info({
      event: 'REFRESH_REQUEST_REUSED',
      timestamp,
      stackTrace: callerStack,
      caller: callerLine,
      requestId: refreshId,
      credentialsMode: 'include',
      withCredentialsValue: true,
      axiosInstanceIdentity: 'apiClient (Default)',
      url: '/v1/auth/refresh',
      headers: {
        'X-Refresh-Source': source,
        'X-Refresh-Instance': refreshId,
      },
      callerFunction: 'refreshOnce',
      componentName: source === 'AuthContextInit' ? 'AuthProvider' : 'AxiosInterceptor',
      reusedPromise: true,
    });
    return refreshPromise;
  }

  console.info({
    event: 'REFRESH_REQUEST_STARTED',
    timestamp,
    stackTrace: callerStack,
    caller: callerLine,
    requestId: refreshId,
    credentialsMode: 'include',
    withCredentialsValue: true,
    axiosInstanceIdentity: 'apiClient (Default)',
    url: '/v1/auth/refresh',
    headers: {
      'X-Refresh-Source': source,
      'X-Refresh-Instance': refreshId,
    },
    callerFunction: 'refreshOnce',
    componentName: source === 'AuthContextInit' ? 'AuthProvider' : 'AxiosInterceptor',
    reusedPromise: false,
  });

  refreshPromise = performRefreshCall(source, refreshId)
    .then((result) => {
      console.info({
        event: 'REFRESH_REQUEST_COMPLETED',
        timestamp: new Date().toISOString(),
        requestId: refreshId,
        status: 'success',
        source,
      });
      return result;
    })
    .catch((error) => {
      console.error({
        event: 'REFRESH_REQUEST_FAILED',
        timestamp: new Date().toISOString(),
        requestId: refreshId,
        error: error.message || error,
        source,
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
