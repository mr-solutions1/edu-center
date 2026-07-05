import React from 'react';
import { useRouteError } from 'react-router-dom';
import { Button } from '@/shared/components/ui/button';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

export const RootErrorBoundary = () => {
  const error = useRouteError();
  console.error('Root Error Boundary caught an error:', error);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center space-y-6 bg-slate-50">
      <div className="p-4 bg-red-50 rounded-2xl shadow-sm">
        <AlertTriangle className="h-12 w-12 text-red-500" />
      </div>
      <div className="space-y-2">
        <h2 className="text-3xl font-black text-primary">عذراً، حدث خطأ غير متوقع</h2>
        <p className="text-muted-foreground max-w-md mx-auto font-medium">
          نواجه مشكلة تقنية في تشغيل التطبيق. يرجى محاولة إعادة تحميل الصفحة.
        </p>
        {process.env.NODE_ENV === 'development' && (
          <pre className="mt-4 p-4 bg-red-50 text-red-700 text-xs rounded-xl overflow-auto max-w-full text-left" dir="ltr">
            {error?.message || JSON.stringify(error)}
          </pre>
        )}
      </div>
      <Button
        onClick={() => window.location.reload()}
        size="lg"
        className="gap-2"
      >
        <RefreshCcw className="h-5 w-5" />
        إعادة تحميل الصفحة
      </Button>
    </div>
  );
};

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Frontend Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center space-y-6 bg-white rounded-3xl shadow-sm border border-red-50">
          <div className="p-4 bg-red-50 rounded-2xl">
            <AlertTriangle className="h-12 w-12 text-red-500" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-primary">عذراً، حدث خطأ ما</h2>
            <p className="text-muted-foreground max-w-md mx-auto font-medium">
              نواجه مشكلة تقنية في عرض هذه الصفحة. يرجى محاولة إعادة تحميل الصفحة أو العودة لاحقاً.
            </p>
          </div>
          <Button
            onClick={() => window.location.reload()}
            className="gap-2"
          >
            <RefreshCcw className="h-4 w-4" />
            إعادة تحميل الصفحة
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
