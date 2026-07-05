import React from 'react';
import { useRouteError } from 'react-router-dom';
import BrandedHeader from './layout/BrandedHeader';
import BrandedFooter from './layout/BrandedFooter';
import { Button } from '@/shared/components/ui/button';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

export const RootErrorBoundary = () => {
  const error = useRouteError();
  console.error('Root Error Boundary caught an error:', error);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50" dir="rtl">
      <BrandedHeader />

      <main className="flex-1 flex items-center justify-center py-12 px-4 relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-secondary/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]" />

      <div className="w-full max-w-md p-8 text-center space-y-6 bg-white relative z-10 rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
        <div className="absolute top-0 left-0 h-2 bg-secondary w-full" />

        <div className="flex flex-col items-center space-y-4 pt-4">
          <div className="p-4 bg-red-50 rounded-2xl">
            <AlertTriangle className="h-12 w-12 text-red-500" />
          </div>
          <div className="space-y-2">
             <h1 className="text-2xl font-black text-primary tracking-tight">أكاديمية ركان</h1>
             <div className="h-1 w-12 bg-secondary rounded-full mx-auto" />
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-xl font-bold text-gray-800">عذراً، حدث خطأ غير متوقع</h2>
          <p className="text-gray-600 max-w-xs mx-auto font-medium leading-relaxed">
            نواجه مشكلة تقنية في تشغيل التطبيق. يرجى محاولة إعادة تحميل الصفحة.
          </p>

          {process.env.NODE_ENV === 'development' && (
            <div className="mt-4 p-3 bg-red-50 text-red-700 text-[10px] rounded-xl overflow-auto max-h-32 text-left font-mono" dir="ltr">
              {error?.message || JSON.stringify(error)}
            </div>
          )}
        </div>

        <Button
          onClick={() => window.location.reload()}
          className="w-full h-12 rounded-xl text-lg font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all duration-300 transform hover:-translate-y-1 active:translate-y-0 gap-2"
        >
          <RefreshCcw className="h-5 w-5" />
          إعادة تحميل الصفحة
        </Button>
      </div>
      </main>

      <BrandedFooter />
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
