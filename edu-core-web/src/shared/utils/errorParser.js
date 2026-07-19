import { ErrorCatalog, ErrorSeverity } from '../constants/errorCatalog';
import arErrors from '../../i18n/errors/ar';
import enErrors from '../../i18n/errors/en';

export class AppError extends Error {
  constructor({
    code,
    title,
    message,
    field,
    retryable,
    correlationId,
    status,
    details,
    severity,
    metadata,
  }) {
    super(message);
    this.name = 'AppError';
    this.code = code || 'UNKNOWN_ERROR';
    this.title = title || 'خطأ';
    this.message = message || 'حدث خطأ ما';
    this.field = field || null;
    this.retryable = retryable ?? false;
    this.correlationId = correlationId || null;
    this.status = status || null;
    this.details = details || {};
    this.severity = severity || ErrorSeverity.ERROR;
    this.metadata = metadata || {};
  }
}

export function parseApiError(error) {
  // Always log the full detailed error object to the console for developer debugging
  console.error('[API_DEVELOPER_DEBUG_LOG]', {
    originalError: error,
    message: error?.message,
    response: error?.response?.data,
    status: error?.response?.status,
    headers: error?.response?.headers,
    stack: error?.stack,
  });

  const metadata = {
    route: typeof window !== 'undefined' ? window.location.pathname : 'unknown',
    browser: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  };

  const isOffline = typeof window !== 'undefined' && navigator && !navigator.onLine;

  let code = 'UNKNOWN_ERROR';
  let status = error?.response?.status || null;
  let correlationId = error?.response?.data?.correlationId || error?.response?.data?.meta?.correlationId || error?.response?.headers?.['x-correlation-id'] || null;
  let rawDetails = error?.response?.data?.details || error?.response?.data?.errors || {};
  let details = {};
  let field = null;

  // 1. Determine error code and status
  if (isOffline) {
    code = 'NETWORK_DISCONNECTED';
    status = 0;
  } else if (error && error.isAxiosError && (!error.response || error.code === 'ECONNABORTED' || error.message?.toLowerCase().includes('network error'))) {
    code = 'NETWORK_TIMEOUT';
    status = error.code === 'ECONNABORTED' ? 408 : 0;
  } else if (error?.response?.data?.code) {
    code = error.response.data.code;
  } else if (status) {
    switch (status) {
      case 400: code = 'VALIDATION_ERROR'; break;
      case 401: code = 'UNAUTHORIZED'; break;
      case 403: code = 'FORBIDDEN'; break;
      case 404: code = 'NOT_FOUND'; break;
      case 409: code = 'DUPLICATE_KEY'; break;
      case 422: code = 'VALIDATION_ERROR'; break;
      case 429: code = 'UNKNOWN_ERROR'; break;
      case 500:
      case 502:
      case 503:
      case 504:
        code = 'INTERNAL_ERROR';
        break;
      default:
        code = 'UNKNOWN_ERROR';
    }
  }

  // 2. Resolve catalog metadata
  const catalogEntry = ErrorCatalog[code] || ErrorCatalog.UNKNOWN_ERROR;
  const severity = catalogEntry.severity;
  const retryable = catalogEntry.retryable;

  // 3. Process details
  if (Array.isArray(rawDetails)) {
    rawDetails.forEach((d) => {
      if (d && typeof d === 'object') {
        const f = d.field || 'unknown';
        details[f] = d.message || String(d);
      } else if (d) {
        details['general'] = String(d);
      }
    });
  } else if (rawDetails && typeof rawDetails === 'object') {
    details = { ...rawDetails };
  } else if (rawDetails && typeof rawDetails === 'string') {
    details = { general: rawDetails };
  }

  const fields = Object.keys(details);
  if (fields.length > 0) {
    field = fields[0];
  }

  // 4. Translate title and message based on locale
  const locale = typeof window !== 'undefined' ? window.localStorage.getItem('edu_locale') || 'ar' : 'ar';
  const dict = locale === 'ar' ? arErrors : enErrors;
  const translation = dict[code] || dict.UNKNOWN_ERROR;

  const title = translation.title;
  let message = error?.response?.data?.message || translation.message;

  if (code === 'VALIDATION_ERROR' && fields.length > 0) {
    message = locale === 'ar' ? 'يرجى تصحيح الأخطاء الموضحة أدناه.' : 'Please correct the errors indicated below.';
  }

  return new AppError({
    code,
    title,
    message,
    field,
    retryable,
    correlationId,
    status,
    details,
    severity,
    metadata,
  });
}
