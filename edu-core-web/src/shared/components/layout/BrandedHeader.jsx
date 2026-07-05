import React from 'react';
import { Button } from '../ui/button';
import { Phone, BookOpen } from 'lucide-react';

const BrandedHeader = () => {
  return (
    <header className="w-full bg-white border-b sticky top-0 z-50 shadow-sm" dir="rtl">
      <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
            <BookOpen className="text-secondary h-6 w-6" />
          </div>
          <span className="text-2xl font-black text-primary tracking-tighter">أكاديمية ركان</span>
        </div>

        <div className="hidden md:flex items-center gap-8">
          <nav className="flex items-center gap-6">
            <a href="https://rakaninstitutekw.com/" className="text-sm font-bold text-gray-600 hover:text-primary transition-colors">الرئيسية</a>
            <a href="https://rakaninstitutekw.com/#services" className="text-sm font-bold text-gray-600 hover:text-primary transition-colors">خدماتنا</a>
            <a href="https://rakaninstitutekw.com/#contact" className="text-sm font-bold text-gray-600 hover:text-primary transition-colors">تواصل معنا</a>
          </nav>
          <div className="h-6 w-px bg-gray-200" />
          <div className="flex items-center gap-3 text-primary">
            <Phone className="h-4 w-4" />
            <span className="text-sm font-black" dir="ltr">+965 5086 6476</span>
          </div>
        </div>

        <Button variant="outline" className="hidden sm:flex border-primary/20 text-primary font-bold rounded-xl hover:bg-primary/5 gap-2">
          احجز الآن
        </Button>
      </div>
    </header>
  );
};

export default BrandedHeader;
