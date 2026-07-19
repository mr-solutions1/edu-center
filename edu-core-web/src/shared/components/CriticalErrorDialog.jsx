import React, { useState, useEffect } from 'react';
import { AlertTriangle, Copy, Check, RefreshCcw, LogIn, ChevronDown, ChevronUp, LifeBuoy } from 'lucide-react';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './ui/dialog';
import { toast } from 'sonner';

export const CriticalErrorDialog = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState(null);
  const [isCopied, setIsCopied] = useState(false);
  const [showTechnical, setShowTechnical] = useState(false);

  useEffect(() => {
    const handleCriticalError = (event) => {
      if (event.detail) {
        // Skip displaying the blocking critical error dialog if the user is already on the login or public landing page
        const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
        const isAuthErr = [
          'TOKEN_VERSION_MISMATCH',
          'PASSWORD_CHANGED',
          'TOKEN_EXPIRED',
          'INVALID_TOKEN',
          'REFRESH_TOKEN_REQUIRED',
          'INVALID_REFRESH_TOKEN',
          'REFRESH_TOKEN_REUSE',
          'UNAUTHORIZED',
        ].includes(event.detail.code);

        if (isAuthErr && (pathname === '/login' || pathname === '/')) {
          return;
        }

        setError(event.detail);
        setIsOpen(true);
      }
    };

    window.addEventListener('edu:critical_error', handleCriticalError);
    return () => {
      window.removeEventListener('edu:critical_error', handleCriticalError);
    };
  }, []);

  if (!isOpen || !error) return null;

  const isAuthError = [
    'TOKEN_VERSION_MISMATCH',
    'PASSWORD_CHANGED',
    'TOKEN_EXPIRED',
    'INVALID_TOKEN',
    'REFRESH_TOKEN_REQUIRED',
    'INVALID_REFRESH_TOKEN',
    'REFRESH_TOKEN_REUSE',
    'UNAUTHORIZED',
  ].includes(error.code);

  const isDev = import.meta.env.MODE === 'development' || import.meta.env.MODE === 'test';

  const diagnosticText = `
=== DIAGNOSTIC REPORT ===
Correlation ID: ${error.correlationId || 'N/A'}
Error Code: ${error.code || 'UNKNOWN_ERROR'}
HTTP Status: ${error.status || 'N/A'}
Timestamp: ${error.metadata?.timestamp || new Date().toISOString()}
Route: ${error.metadata?.route || 'N/A'}
Browser: ${error.metadata?.browser || 'N/A'}
Version: ${error.metadata?.version || '1.0.0'}
Message: ${error.message || 'No message provided'}
Details: ${JSON.stringify(error.details || {}, null, 2)}
========================
`.trim();

  const handleCopyDiagnostics = async () => {
    try {
      await navigator.clipboard.writeText(diagnosticText);
      setIsCopied(true);
      toast.success('تم نسخ المعلومات التشخيصية بنجاح / Diagnostic information copied successfully.');
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      toast.error('فشل في نسخ المعلومات التشخيصية / Failed to copy diagnostics.');
    }
  };

  const handleReportIssue = async () => {
    await handleCopyDiagnostics();
    toast.info('يرجى لصق المعلومات المنسوخة وإرسالها لفريق الدعم الفني لمساعدتك.');
  };

  const handleLoginRedirect = () => {
    setIsOpen(false);
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  };

  const handleRetry = () => {
    setIsOpen(false);
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  const locale = typeof window !== 'undefined' ? window.localStorage.getItem('edu_locale') || 'ar' : 'ar';
  const isRtl = locale === 'ar';

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-lg w-[95%] rounded-2xl p-6 gap-6 overflow-hidden border border-slate-100 shadow-2xl bg-white">
        <DialogHeader className="flex flex-col items-center text-center space-y-3">
          <div className="p-4 bg-red-50 rounded-2xl animate-pulse">
            <AlertTriangle className="h-12 w-12 text-red-500" />
          </div>
          <div className="space-y-1">
            <DialogTitle className="text-xl font-bold text-slate-800">
              {error.title || (isRtl ? 'حدث خطأ غير متوقع' : 'An Unexpected Error Occurred')}
            </DialogTitle>
            <DialogDescription className="text-slate-600 font-medium text-sm leading-relaxed max-w-sm">
              {error.message || (isRtl ? 'نواجه عطلاً فنياً مؤقتاً في معالجة طلبك.' : 'We are experiencing a temporary technical issue.')}
            </DialogDescription>
          </div>
        </DialogHeader>

        {error.correlationId && (
          <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>{isRtl ? 'رقم المرجعي للخطأ:' : 'Error Reference ID:'}</span>
            <code className="text-slate-800 font-mono tracking-wider bg-slate-200/60 px-2 py-0.5 rounded">
              {error.correlationId}
            </code>
          </div>
        )}

        {/* Technical Details Accordion (for dev and debug) */}
        {isDev && (
          <div className="border border-slate-100 rounded-xl overflow-hidden">
            <button
              onClick={() => setShowTechnical(!showTechnical)}
              className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100/80 transition-colors text-xs font-bold text-slate-600"
            >
              <span>{isRtl ? 'تفاصيل تقنية (للمطورين)' : 'Technical Details (Developers)'}</span>
              {showTechnical ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {showTechnical && (
              <pre className="p-4 bg-slate-900 text-slate-200 text-[10px] font-mono overflow-auto max-h-40 leading-relaxed text-left" dir="ltr">
                {diagnosticText}
              </pre>
            )}
          </div>
        )}

        <DialogFooter className="flex flex-col sm:flex-row gap-2.5 sm:justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyDiagnostics}
            className="w-full sm:w-auto h-11 text-xs font-bold gap-2 hover:bg-slate-50 border-slate-200 rounded-xl shrink-0"
          >
            {isCopied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
            {isRtl ? 'نسخ التفاصيل' : 'Copy Details'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleReportIssue}
            className="w-full sm:w-auto h-11 text-xs font-bold gap-2 hover:bg-slate-50 border-slate-200 rounded-xl shrink-0"
          >
            <LifeBuoy className="h-4 w-4" />
            {isRtl ? 'إبلاغ عن مشكلة' : 'Report Issue'}
          </Button>

          {isAuthError ? (
            <Button
              size="sm"
              onClick={handleLoginRedirect}
              className="w-full sm:w-auto h-11 text-xs font-bold gap-2 bg-primary hover:bg-primary/95 text-white shadow-lg shadow-primary/20 rounded-xl shrink-0"
            >
              <LogIn className="h-4 w-4" />
              {isRtl ? 'تسجيل الدخول مجدداً' : 'Sign In Again'}
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={handleRetry}
              className="w-full sm:w-auto h-11 text-xs font-bold gap-2 bg-primary hover:bg-primary/95 text-white shadow-lg shadow-primary/20 rounded-xl shrink-0"
            >
              <RefreshCcw className="h-4 w-4" />
              {isRtl ? 'إعادة المحاولة' : 'Retry'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
