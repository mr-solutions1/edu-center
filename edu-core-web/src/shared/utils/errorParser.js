/**
 * Centralized API Error Parser for Edu Center ERP.
 * Translates technical error logs, HTTP status codes, and server exceptions
 * into human-friendly, high-fidelity localized messages in Arabic.
 */

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

  const parsedError = {
    title: 'حدث خطأ ما',
    message: 'تعذر معالجة الطلب حالياً. يرجى المحاولة مرة أخرى لاحقاً.',
    details: [],
    status: null,
    isNetworkError: false,
    isValidationError: false,
  };

  // 1. Check for Network / Connection Failures
  if (!error) {
    parsedError.isNetworkError = true;
    parsedError.title = 'خطأ في الاتصال';
    parsedError.message = 'حدث خطأ غير متوقع. يرجى التحقق من اتصالك بالإنترنت.';
    return parsedError;
  }

  // Handle case where error is a string
  if (typeof error === 'string') {
    parsedError.message = error;
    return parsedError;
  }

  // Browser offline check
  if (typeof window !== 'undefined' && navigator && !navigator.onLine) {
    parsedError.isNetworkError = true;
    parsedError.title = 'لا يوجد اتصال بالإنترنت';
    parsedError.message = 'أنت غير متصل بالشبكة حالياً. يرجى التحقق من اتصال الواي فاي أو بيانات الهاتف وإعادة المحاولة.';
    return parsedError;
  }

  // Axios network error or timeout
  if (error.isAxiosError && (!error.response || error.code === 'ECONNABORTED' || error.message?.toLowerCase().includes('network error'))) {
    parsedError.isNetworkError = true;
    parsedError.title = 'فشل الاتصال بالخادم';

    if (error.code === 'ECONNABORTED') {
      parsedError.message = 'انتهت مهلة الاتصال بالخادم (Timeout). يرجى التأكد من استقرار الإنترنت لديك وإعادة المحاولة.';
    } else {
      parsedError.message = 'غير قادر على الاتصال بالخادم. قد يكون الخادم متوقفاً عن العمل مؤقتاً أو أن هناك مشكلة في الشبكة لديك.';
    }
    return parsedError;
  }

  // 2. Process Server Response Error (HTTP Status Codes)
  if (error.response) {
    const { status, data } = error.response;
    parsedError.status = status;

    // Extract raw message and details from backend response if present
    const backendMessage = data?.error?.message || data?.message || data?.error || '';
    const backendDetails = data?.error?.details || data?.errors || [];

    switch (status) {
      case 400:
        parsedError.title = 'طلب غير صالح';
        parsedError.message = backendMessage || 'لا يمكن معالجة الطلب بسبب وجود معلومات مفقودة أو غير صالحة.';
        break;

      case 401:
        parsedError.title = 'انتهت الجلسة';
        parsedError.message = 'انتهت صلاحية جلسة تسجيل الدخول الخاصة بك. يرجى تسجيل الدخول مرة أخرى لمتابعة العمل.';
        break;

      case 403:
        parsedError.title = 'غير مصرح لك';
        parsedError.message = backendMessage || 'ليس لديك الصلاحيات الكافية للقيام بهذا الإجراء. يرجى مراجعة مسؤول النظام.';
        break;

      case 404:
        parsedError.title = 'المورد غير موجود';
        parsedError.message = backendMessage || 'المعلومات أو الصفحة التي تبحث عنها غير موجودة أو تم حذفها.';
        break;

      case 409:
        parsedError.title = 'تعارض في البيانات';
        parsedError.message = backendMessage || 'هذا السجل أو البيانات التي تحاول إدخالها موجودة بالفعل في النظام.';
        break;

      case 422:
        parsedError.title = 'خطأ في التحقق من البيانات';
        parsedError.message = 'الرجاء تصحيح الأخطاء التالية قبل إرسال النموذج.';
        parsedError.isValidationError = true;
        break;

      case 429:
        parsedError.title = 'طلبات كثيرة جداً';
        parsedError.message = 'لقد قمت بإرسال عدد كبير جداً من الطلبات في وقت قصير. يرجى الانتظار دقيقة واحدة ثم المحاولة مرة أخرى.';
        break;

      case 500:
      case 502:
      case 503:
      case 504:
        parsedError.title = 'خطأ داخلي في الخادم';
        parsedError.message = 'نواجه مشكلة فنية مؤقتة في خوادمنا حالياً. تم تسجيل المشكلة وسيقوم فريق الدعم الفني بإصلاحها فوراً. يرجى المحاولة بعد قليل.';
        break;

      default:
        parsedError.title = 'خطأ غير معروف';
        parsedError.message = backendMessage || `حدث خطأ غير متوقع في النظام (رمز الخطأ: ${status}).`;
        break;
    }

    // Standardize validation error details / messages array
    if (backendDetails && Array.isArray(backendDetails)) {
      parsedError.details = backendDetails.map(d => {
        if (!d) return '';
        if (typeof d === 'string') return d;
        if (typeof d === 'object') {
          return d.message || d.msg || d.path || JSON.stringify(d);
        }
        return String(d);
      });
    } else if (backendDetails && typeof backendDetails === 'object') {
      // Handle key-value Mongoose validation errors format
      parsedError.details = Object.values(backendDetails).map(d => {
        if (!d) return '';
        if (typeof d === 'string') return d;
        return d.message || d.msg || JSON.stringify(d);
      });
    }

    // If it's a 422 but no details extracted, use default backendMessage or a standard fallback
    if (status === 422 && parsedError.details.length === 0) {
      if (backendMessage) {
        parsedError.details = [backendMessage];
      }
    }
  } else {
    // Other errors (e.g., local JS rendering or variable reference errors)
    parsedError.title = 'خطأ في تشغيل التطبيق';
    parsedError.message = error.message || 'حدث خطأ داخلي في واجهة النظام. يرجى المحاولة مرة أخرى أو تحديث الصفحة.';
  }

  return parsedError;
}
