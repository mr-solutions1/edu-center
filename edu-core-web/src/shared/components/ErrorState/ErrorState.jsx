import { AlertTriangle, RefreshCcw } from 'lucide-react';
import React from 'react';

import { Button } from '../ui/button';

const ErrorState = ({
  title = 'حدث خطأ ما',
  message = 'تعذر تحميل البيانات المطلوبة، يرجى المحاولة مرة أخرى.',
  error,
  onRetry,
}) => {
  let displayTitle = title;
  let displayMessage = message;

  if (error) {
    const parsed = error.parsed || (typeof error === 'object' && (error.title || error.message) ? error : null);
    if (parsed) {
      displayTitle = parsed.title || displayTitle;
      displayMessage = parsed.message || displayMessage;
    } else if (typeof error === 'string') {
      displayMessage = error;
    } else if (error.message) {
      displayMessage = error.message;
    }
  }

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-destructive/5 border border-destructive/20 rounded-xl space-y-4">
      <div className="p-3 bg-destructive/10 rounded-full">
        <AlertTriangle className="h-10 w-10 text-destructive" />
      </div>
      <div className="space-y-1">
        <h3 className="text-lg font-semibold text-destructive">{displayTitle}</h3>
        <p className="text-sm text-muted-foreground max-w-xs mx-auto">
          {displayMessage}
        </p>
      </div>
      {onRetry && (
        <Button variant="outline" onClick={onRetry} className="gap-2">
          <RefreshCcw className="h-4 w-4" />
          إعادة المحاولة
        </Button>
      )}
    </div>
  );
};

export default ErrorState;
