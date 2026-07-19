import { useCallback } from 'react';
import { toast } from 'sonner';

/**
 * Reusable React hook to automatically handle and map backend validation,
 * duplicate-key, and conflict errors directly into react-hook-form fields.
 * Focuses and scrolls to the first invalid field seamlessly.
 */
export const useFormErrorHandler = () => {
  const handleFormError = useCallback((error, setError) => {
    if (!error) return;

    const details = error.details || {};
    const fieldKeys = Object.keys(details);

    // If we have field-specific details from validation or duplicate key errors
    if (fieldKeys.length > 0) {
      fieldKeys.forEach((field) => {
        setError(field, {
          type: 'server',
          message: details[field],
        });
      });

      // Find first invalid field and attempt focus + scroll
      const firstField = fieldKeys[0];
      if (firstField) {
        setTimeout(() => {
          // Attempt to find element by ID or Name
          let element = document.getElementById(firstField) ||
                        document.querySelector(`[name="${firstField}"]`);

          // If nested or array notation (e.g. "items.0.name"), try common mappings
          if (!element) {
            const mappedId = firstField.replace(/\./g, '_');
            element = document.getElementById(mappedId);
          }

          if (element) {
            element.focus({ preventScroll: true });
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);
      }

      // Show localized general warning toast
      const locale = typeof window !== 'undefined' ? window.localStorage.getItem('edu_locale') || 'ar' : 'ar';
      const warningMsg = locale === 'ar'
        ? 'يرجى تصحيح الأخطاء المحددة في النموذج.'
        : 'Please correct the highlighted errors in the form.';
      toast.warning(error.message || warningMsg);
    } else {
      // If no field-specific details (e.g. general business rule error, internal error)
      // Display a high-fidelity toast notification or let the global interceptor dispatch critical dialogs
      if (error.severity === 'CRITICAL') {
        window.dispatchEvent(new CustomEvent('edu:critical_error', { detail: error }));
      } else {
        toast.error(error.message || 'حدث خطأ أثناء معالجة الطلب');
      }
    }
  }, []);

  return { handleFormError };
};
