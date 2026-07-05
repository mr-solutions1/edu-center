import { zodResolver } from '@hookform/resolvers/zod';
import React from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useLocation } from 'react-router-dom';

import { useAuth } from '../AuthContext';
import { loginSchema } from '../validations/loginSchema';

import { cn } from '@/shared/utils';
import { Button } from '@/shared/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';

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
    <div
      className="flex items-center justify-center min-h-screen bg-primary px-4 relative overflow-hidden"
      dir="rtl"
    >
      {/* Background Decorative Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-secondary/20 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-white/10 rounded-full blur-[120px]" />

      <Card className="w-full max-w-md border-none shadow-2xl bg-white/95 backdrop-blur-sm relative z-10 rounded-3xl overflow-hidden">
        <div className="h-2 bg-secondary w-full" />
        <CardHeader className="space-y-4 pt-8">
          <div className="flex flex-col items-center space-y-2">
             <h1 className="text-3xl font-black text-primary tracking-tight">أكاديمية ركان</h1>
             <div className="h-1 w-12 bg-secondary rounded-full" />
          </div>
          <CardTitle className="text-xl text-center font-bold text-gray-800">
            تسجيل الدخول للنظام
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
              <label className="text-sm font-bold text-gray-700 mr-1" htmlFor="email">
                البريد الإلكتروني
              </label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                {...register('email')}
                className={cn(
                  "bg-gray-50 border-none shadow-inner rounded-xl h-12 focus-visible:ring-secondary",
                  errors.email && 'ring-2 ring-red-500'
                )}
              />
              {errors.email && (
                <p className="text-xs text-red-500 font-medium mr-1">{errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 mr-1" htmlFor="password">
                كلمة المرور
              </label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                {...register('password')}
                className={cn(
                  "bg-gray-50 border-none shadow-inner rounded-xl h-12 focus-visible:ring-secondary",
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
          <CardFooter className="px-8 pb-10">
            <Button
              type="submit"
              className="w-full h-12 rounded-xl text-lg font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all duration-300 transform hover:-translate-y-1 active:translate-y-0"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'جاري الدخول...' : 'تسجيل الدخول'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default LoginPage;
