let refreshPromise = null;
let requestCounter = 0;

// Unique identifier for this tab instance
const tabId = Math.random().toString(36).substring(2, 11);

// Setup BroadcastChannel for cross-tab auth event coordination
const authChannel = typeof window !== 'undefined' && 'BroadcastChannel' in window
  ? new BroadcastChannel('edu_auth_sync_channel')
  : null;

// Registry of pending cross-tab refresh promises
let crossTabWaiters = [];

if (authChannel) {
  authChannel.onmessage = (event) => {
    const { type, payload, senderTabId } = event.data || {};

    // Ignore messages sent by this tab itself
    if (senderTabId === tabId) return;

    if (type === 'REFRESH_STARTED') {
      console.info(`[CROSS_TAB] Tab ${senderTabId} started refresh. Suspending local requests.`);
      // If we don't have a local refresh promise running, create a placeholder promise that will resolve when leader completes
      if (!refreshPromise) {
        refreshPromise = new Promise((resolve, reject) => {
          crossTabWaiters.push({ resolve, reject });

          // Self-healing timeout: if leader doesn't resolve in 10s, reject to let this tab retry
          setTimeout(() => {
            const index = crossTabWaiters.findIndex(w => w.resolve === resolve);
            if (index !== -1) {
              crossTabWaiters.splice(index, 1);
              if (refreshPromise) refreshPromise = null;
              reject(new Error('Leader tab refresh timed out'));
            }
          }, 10000);
        });
      }
    } else if (type === 'REFRESH_SUCCESS') {
      console.info(`[CROSS_TAB] Tab ${senderTabId} successfully rotated token. Resolving local waiters.`);
      const waiters = [...crossTabWaiters];
      crossTabWaiters = [];
      refreshPromise = null;
      waiters.forEach(w => w.resolve(payload.accessToken));
    } else if (type === 'REFRESH_FAILED') {
      console.error(`[CROSS_TAB] Tab ${senderTabId} failed to rotate token. Rejecting local waiters.`);
      const waiters = [...crossTabWaiters];
      crossTabWaiters = [];
      refreshPromise = null;
      waiters.forEach(w => w.reject(new Error(payload.error || 'Refresh failed on leader tab')));
    } else if (type === 'AUTH_LOGOUT') {
      console.info(`[CROSS_TAB] Tab ${senderTabId} logged out. Syncing local logout.`);
      if (window.location.pathname !== '/login' && window.location.pathname !== '/') {
        window.location.href = '/login?expired=true';
      }
    } else if (type === 'AUTH_LOGIN') {
      console.info(`[CROSS_TAB] Tab ${senderTabId} logged in. Syncing page reload.`);
      window.location.reload();
    }
  };
}

/**
 * Centrally coordinates all token refresh requests to guarantee exactly one
 * active network request (single-flight) across both the current tab and all other open tabs.
 */
export function refreshOnce(performRefreshCall, source = 'Other', instanceId) {
  const currentCount = ++requestCounter;
  const refreshId = instanceId || Math.random().toString(36).substring(2, 11);
  const timestamp = new Date().toISOString();
  const perfTime = performance.now();
  const callerStack = new Error().stack;

  const browserState = {
    online: navigator.onLine,
    visibilityState: document.visibilityState,
    readyState: document.readyState,
    navigationType: performance.getEntriesByType('navigation')[0]?.type || 'unknown',
  };

  const logPayload = {
    traceEvent: 'REFRESH_ONCE_ENTERED',
    requestNumber: currentCount,
    timestamp,
    perfTimeMs: perfTime,
    requestId: refreshId,
    tabId,
    source,
    browserState,
    callerStack,
  };

  console.info('[EVIDENCE_TRACE] ' + JSON.stringify(logPayload, null, 2));

  // If a refresh is already in progress (either locally or waiting for another tab)
  if (refreshPromise) {
    console.info('[EVIDENCE_TRACE] ' + JSON.stringify({
      traceEvent: 'REFRESH_PROMISE_REUSED',
      requestNumber: currentCount,
      timestamp: new Date().toISOString(),
      perfTimeMs: performance.now(),
      requestId: refreshId,
      tabId,
      source,
    }, null, 2));
    return refreshPromise;
  }

  // Broadcast to other tabs that we are initiating the refresh
  if (authChannel) {
    authChannel.postMessage({
      type: 'REFRESH_STARTED',
      senderTabId: tabId,
    });
  }

  // Create the real HTTP network call promise
  refreshPromise = performRefreshCall(source, refreshId)
    .then((result) => {
      console.info('[EVIDENCE_TRACE] ' + JSON.stringify({
        traceEvent: 'REFRESH_PROMISE_SUCCESS',
        requestNumber: currentCount,
        timestamp: new Date().toISOString(),
        perfTimeMs: performance.now(),
        requestId: refreshId,
        tabId,
        source,
      }, null, 2));

      // Broadcast success to other tabs with the new token
      if (authChannel) {
        authChannel.postMessage({
          type: 'REFRESH_SUCCESS',
          senderTabId: tabId,
          payload: { accessToken: result },
        });
      }
      return result;
    })
    .catch((error) => {
      console.error('[EVIDENCE_TRACE] ' + JSON.stringify({
        traceEvent: 'REFRESH_PROMISE_FAILED',
        requestNumber: currentCount,
        timestamp: new Date().toISOString(),
        perfTimeMs: performance.now(),
        requestId: refreshId,
        tabId,
        source,
        error: error.message || error,
      }, null, 2));

      // Broadcast failure to other tabs
      if (authChannel) {
        authChannel.postMessage({
          type: 'REFRESH_FAILED',
          senderTabId: tabId,
          payload: { error: error.message || error },
        });
      }
      throw error;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

/**
 * Broadcast logout to other tabs to synchronize sessions.
 */
export function broadcastLogout() {
  if (authChannel) {
    authChannel.postMessage({
      type: 'AUTH_LOGOUT',
      senderTabId: tabId,
    });
  }
}

/**
 * Broadcast login to other tabs to synchronize sessions.
 */
export function broadcastLogin() {
  if (authChannel) {
    authChannel.postMessage({
      type: 'AUTH_LOGIN',
      senderTabId: tabId,
    });
  }
}

export function isRefreshing() {
  return !!refreshPromise;
}

export function getRefreshPromise() {
  return refreshPromise;
}

export function getTabId() {
  return tabId;
}
