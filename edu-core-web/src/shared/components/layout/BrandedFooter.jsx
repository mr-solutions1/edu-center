import { Mail, MapPin, Phone, Instagram, Twitter } from 'lucide-react';
import React from 'react';

const BrandedFooter = () => {
  return (
    <footer className="w-full bg-white border-t pt-12 pb-8" dir="rtl">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
          {/* Logo & About */}
          <div className="space-y-4 text-right">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black text-primary tracking-tighter">
                أكاديمية ركان
              </span>
            </div>
            <p className="text-gray-500 text-sm font-medium leading-relaxed max-w-sm">
              نحو تعليم أفضل لمستقبل مشرق. نقدم خدمات تعليمية متميزة لجميع
              المراحل الدراسية في الكويت بأحدث الأساليب التعليمية.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-primary">روابط سريعة</h3>
            <ul className="space-y-2">
              <li>
                <a
                  href="https://rakaninstitutekw.com/#services"
                  className="text-gray-600 hover:text-primary text-sm font-bold transition-colors"
                >
                  الخدمات التعليمية
                </a>
              </li>
              <li>
                <a
                  href="https://rakaninstitutekw.com/#teachers"
                  className="text-gray-600 hover:text-primary text-sm font-bold transition-colors"
                >
                  نخبة المدرسين
                </a>
              </li>
              <li>
                <a
                  href="https://rakaninstitutekw.com/#reviews"
                  className="text-gray-600 hover:text-primary text-sm font-bold transition-colors"
                >
                  آراء الطلاب
                </a>
              </li>
              <li>
                <a
                  href="https://rakaninstitutekw.com/#faq"
                  className="text-gray-600 hover:text-primary text-sm font-bold transition-colors"
                >
                  الأسئلة الشائعة
                </a>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-primary">معلومات الاتصال</h3>
            <ul className="space-y-3">
              <li className="flex items-center gap-3 text-gray-600 text-sm font-bold">
                <MapPin className="h-4 w-4 text-secondary" />
                <span>الكويت - جميع المحافظات</span>
              </li>
              <li
                className="flex items-center gap-3 text-gray-600 text-sm font-bold"
                dir="ltr"
              >
                <Phone className="h-4 w-4 text-secondary" />
                <span>+965 5086 6476</span>
              </li>
              <li className="flex items-center gap-3 text-gray-600 text-sm font-bold">
                <Mail className="h-4 w-4 text-secondary" />
                <span>noonm222@rakaninstitutekw.com</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-gray-400 text-xs font-bold">
            © 2026 أكاديمية ركان. جميع الحقوق محفوظة.
          </p>
          <div className="flex items-center gap-4">
            <a
              href="https://instagram.com/rakan_academy"
              target="_blank"
              rel="noopener noreferrer"
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-primary hover:text-white transition-all"
            >
              <Instagram className="h-4 w-4" />
            </a>
            <a
              href="https://twitter.com/rakan_academy"
              target="_blank"
              rel="noopener noreferrer"
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-primary hover:text-white transition-all"
            >
              <Twitter className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default BrandedFooter;
