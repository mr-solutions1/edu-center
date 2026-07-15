import { zodResolver } from '@hookform/resolvers/zod';
import { LogIn } from 'lucide-react';
import React from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useLocation } from 'react-router-dom';

import { useAuth } from '../AuthContext';
import { loginSchema } from '../validations/loginSchema';

import logoAlpha from '@/assets/logo_alpha.jpeg';
import BrandedFooter from '@/shared/components/layout/BrandedFooter';
import BrandedHeader from '@/shared/components/layout/BrandedHeader';
import { Button } from '@/shared/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { cn } from '@/shared/utils';

const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = React.useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data) => {
    try {
      setError(null);
      await login(data);
      const from = location.state?.from?.pathname || '/';
      navigate(from, { replace: true });
    } catch (err) {
      setError(
        err.response?.data?.error?.message ||
          'فشل تسجيل الدخول. يرجى المحاولة مرة أخرى.'
      );
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50" dir="rtl">
      <BrandedHeader />

      <main className="flex-1 flex items-center justify-center py-12 px-4 relative overflow-hidden font-sans">
        {/* Background Decorative Elements */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-secondary/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]" />

        <Card className="w-full max-w-md border-none shadow-2xl bg-white relative z-10 rounded-[2rem] overflow-hidden border border-slate-100">
          <div className="h-2.5 bg-secondary w-full shadow-sm" />
          <CardHeader className="space-y-4 pt-10 pb-6">
            <div className="flex flex-col items-center space-y-3">
              <div className="p-1 rounded-2xl mb-1">
                <img src={logoAlpha} alt="Alpha Logo" className="h-28 w-auto object-contain rounded-xl shadow-sm" />
              </div>
              <div className="h-1.5 w-16 bg-secondary rounded-full" />
            </div>
            <CardTitle className="text-xl text-center font-bold text-gray-700 pt-2">
              بوابة دخول النظام
            </CardTitle>
          </CardHeader>
          <form onSubmit={handleSubmit(onSubmit)}>
            <CardContent className="space-y-5 px-8">
              {error && (
                <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl font-medium animate-shake">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <label
                  className="text-sm font-bold text-gray-700 mr-1"
                  htmlFor="email"
                >
                  البريد الإلكتروني
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  {...register('email')}
                  className={cn(
                    'bg-gray-50 border-none shadow-inner rounded-xl h-12 focus-visible:ring-secondary',
                    errors.email && 'ring-2 ring-red-500'
                  )}
                />
                {errors.email && (
                  <p className="text-xs text-red-500 font-medium mr-1">
                    {errors.email.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <label
                  className="text-sm font-bold text-gray-700 mr-1"
                  htmlFor="password"
                >
                  كلمة المرور
                </label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  {...register('password')}
                  className={cn(
                    'bg-gray-50 border-none shadow-inner rounded-xl h-12 focus-visible:ring-secondary',
                    errors.password && 'ring-2 ring-red-500'
                  )}
                />
                {errors.password && (
                  <p className="text-xs text-red-500 font-medium mr-1">
                    {errors.password.message}
                  </p>
                )}
              </div>
            </CardContent>
            <CardFooter className="px-8 pb-12">
              <Button
                type="submit"
                className="w-full h-14 rounded-2xl text-xl font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all duration-300 transform hover:-translate-y-1 active:translate-y-0 gap-3"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  'جاري الدخول...'
                ) : (
                  <>
                    <span>تسجيل الدخول</span>
                    <LogIn className="h-5 w-5" />
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </main>

      <BrandedFooter />
    </div>
  );
};

export default LoginPage;
