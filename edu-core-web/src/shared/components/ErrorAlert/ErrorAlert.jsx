import { AlertTriangle, RefreshCcw, X, AlertCircle } from 'lucide-react';
import React from 'react';

import { Button } from '@/shared/components/ui/button';
import { cn } from '@/shared/utils';

/**
 * A reusable, highly accessible, responsive ErrorAlert component.
 * Works seamlessly in light and dark mode, offering full ARIA compliance,
 * support for multiple message lists, and optional retry/dismiss buttons.
 */
const ErrorAlert = ({
  title = 'حدث خطأ ما',
  message,
  details = [],
  icon: Icon = AlertCircle,
  onRetry,
  onDismiss,
  className,
}) => {
  if (!message && details.length === 0) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        'relative w-full rounded-2xl border border-red-200/60 dark:border-red-900/40',
        'bg-red-50/85 dark:bg-red-950/25 p-5 shadow-sm text-right',
        'transition-all duration-300 animate-in fade-in slide-in-from-top-1',
        className
      )}
      dir="rtl"
    >
      {/* Dismiss Button */}
      {onDismiss && (
        <button
          onClick={onDismiss}
          type="button"
          aria-label="إغلاق التنبيه"
          className="absolute top-4 left-4 p-1.5 rounded-lg text-red-500/70 hover:text-red-700 dark:hover:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/50 transition-colors focus:outline-none focus:ring-2 focus:ring-red-400"
        >
          <X className="h-4 w-4" />
        </button>
      )}

      <div className="flex items-start gap-4">
        {/* Error Icon */}
        <div className="p-2.5 bg-red-100 dark:bg-red-900/30 rounded-xl shrink-0 text-red-600 dark:text-red-400">
          <Icon className="h-5 w-5" />
        </div>

        {/* Content */}
        <div className="flex-1 space-y-2.5 pt-0.5">
          {title && (
            <h4 className="text-base font-black text-red-900 dark:text-red-200 leading-tight">
              {title}
            </h4>
          )}

          {message && (
            <p className="text-xs md:text-sm font-medium text-red-700/90 dark:text-red-300/90 leading-relaxed">
              {message}
            </p>
          )}

          {/* Detailed Messages List */}
          {details && details.length > 0 && (
            <ul className="space-y-1.5 list-disc list-inside text-xs md:text-sm font-bold text-red-600/90 dark:text-red-400/95 pr-2.5 border-r border-red-200 dark:border-red-900">
              {details.map((detail, index) => (
                <li key={index} className="leading-relaxed list-none relative pr-4">
                  <span className="absolute right-0 top-1.5 h-1.5 w-1.5 bg-red-500 rounded-full" />
                  {detail}
                </li>
              ))}
            </ul>
          )}

          {/* Action Buttons */}
          {onRetry && (
            <div className="pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onRetry}
                className={cn(
                  'rounded-xl text-xs font-black border-red-200 hover:border-red-300 bg-white hover:bg-red-50',
                  'text-red-700 hover:text-red-800 dark:bg-red-950/20 dark:border-red-900/50 dark:text-red-300 dark:hover:bg-red-950/40',
                  'flex items-center gap-1.5 shadow-sm transition-all focus:ring-red-400'
                )}
              >
                <RefreshCcw className="h-3.5 w-3.5" />
                إعادة المحاولة
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ErrorAlert;
