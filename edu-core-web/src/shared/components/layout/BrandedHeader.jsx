import { Phone } from 'lucide-react';
import React from 'react';

import logoAlpha from '@/assets/logo_alpha.jpeg';
import { Button } from '../ui/button';

const BrandedHeader = () => {
  return (
    <header
      className="w-full bg-white border-b sticky top-0 z-50 shadow-sm"
      dir="rtl"
    >
      <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={logoAlpha} alt="Alpha Logo" className="h-12 w-auto object-contain rounded-lg" />
          <span className="text-xl font-black text-primary tracking-tighter">
            أكاديمية ألفا العالمية
          </span>
        </div>

        <div className="hidden md:flex items-center gap-8">
          <nav className="flex items-center gap-6">
            <a
              href="https://alpha.flowship.site/"
              className="text-sm font-bold text-gray-600 hover:text-primary transition-colors"
            >
              الرئيسية
            </a>
            <a
              href="https://alpha.flowship.site/#services"
              className="text-sm font-bold text-gray-600 hover:text-primary transition-colors"
            >
              خدماتنا
            </a>
            <a
              href="https://alpha.flowship.site/#contact"
              className="text-sm font-bold text-gray-600 hover:text-primary transition-colors"
            >
              تواصل معنا
            </a>
          </nav>
          <div className="h-6 w-px bg-gray-200" />
          <div className="flex items-center gap-3 text-primary">
            <Phone className="h-4 w-4" />
            <span className="text-sm font-black" dir="ltr">
              +965 5086 6476
            </span>
          </div>
        </div>

        <Button
          variant="outline"
          className="hidden sm:flex border-primary/20 text-primary font-bold rounded-xl hover:bg-primary/5 gap-2"
        >
          احجز الآن
        </Button>
      </div>
    </header>
  );
};

export default BrandedHeader;
