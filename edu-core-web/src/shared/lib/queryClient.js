import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        // Only retry once at most
        if (failureCount >= 1) {
          return false;
        }

        // Use standardized AppError retryable metadata if available
        if (error && typeof error.retryable === 'boolean') {
          return error.retryable;
        }

        // Fallback: Determine from HTTP status code
        const status = error?.status || error?.response?.status;

        // Never retry client side errors (4xx)
        if (status && status >= 400 && status < 500) {
          return false;
        }

        // Retry server side errors (5xx) once
        if (status && status >= 500) {
          return true;
        }

        // If there is no response/status (e.g., Network Error, Connection Reset, DNS failure)
        if (!status) {
          return true;
        }

        return false;
      },
    },
  },
});
