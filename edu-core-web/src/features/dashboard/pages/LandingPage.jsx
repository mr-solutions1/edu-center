import { MessageSquare, Phone, ShieldCheck, Star, Users, GraduationCap, Award, HelpCircle, Check, ArrowUpRight } from 'lucide-react';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import logoAlpha from '@/assets/logo_alpha.jpeg';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';

const LandingPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ name: '', phone: '', service: '', notes: '' });

  const handleApply = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) {
      toast.error('الرجاء تعبئة الاسم ورقم الهاتف لإرسال طلبك');
      return;
    }
    toast.success('تم إرسال طلبك بنجاح! سيتواصل معك مستشار التعليم الخاص بمعهدنا خلال دقائق.');
    setFormData({ name: '', phone: '', service: '', notes: '' });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-right text-slate-800 font-sans selection:bg-secondary/30" dir="rtl">

      {/* Top Contact Bar */}
      <div className="bg-primary text-primary-foreground py-2 text-xs border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 font-bold">
              <Phone className="h-3.5 w-3.5 text-secondary" />
              الكويت: +965 5086 6476
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Button size="xs" variant="ghost" className="text-white hover:text-secondary text-[11px] font-black" onClick={() => navigate('/login')}>
              تسجيل الدخول للنظام الموحد
            </Button>
          </div>
        </div>
      </div>

      {/* Main Navigation Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">

          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <img src={logoAlpha} alt="Alpha Academy" className="h-12 w-12 rounded-xl object-cover shadow-sm bg-primary/5 p-0.5" />
            <div>
              <h1 className="text-base font-black tracking-tight text-primary leading-tight">Edu Center ERP</h1>
              <p className="text-[10px] text-secondary font-black tracking-widest uppercase">Alpha Institute</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden lg:flex items-center gap-8 font-black text-xs text-slate-600">
            <a href="#hero" className="hover:text-secondary transition-colors">الرئيسية</a>
            <a href="#about" className="hover:text-secondary transition-colors">من نحن</a>
            <a href="#services" className="hover:text-secondary transition-colors">خدماتنا</a>
            <a href="#portals" className="hover:text-secondary transition-colors">بوابات الدخول</a>
            <a href="#faq" className="hover:text-secondary transition-colors">الأسئلة الشائعة</a>
            <a href="#apply" className="hover:text-secondary transition-colors">تقديم طلب جديد</a>
          </nav>

          <Button
            onClick={() => {
              const el = document.getElementById('apply');
              el?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="rounded-xl text-xs font-bold bg-secondary hover:bg-secondary/90 text-secondary-foreground gap-1.5"
          >
            احجز الآن
            <ArrowUpRight className="h-4 w-4" />
          </Button>

        </div>
      </header>

      {/* Hero Section */}
      <section id="hero" className="relative py-20 lg:py-32 bg-gradient-to-b from-white to-transparent overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

          <div className="space-y-6">
            <span className="bg-secondary/15 text-secondary px-3.5 py-1.5 rounded-full text-xs font-black inline-block">
              أكاديمية ركان للتدريس الخصوصي - شريكك التعليمي الموثوق في الكويت 🇰🇼
            </span>
            <h2 className="text-3xl lg:text-5xl font-black text-primary leading-tight">
              تأسيس وتدريس جميع المواد لجميع المراحل بأفضل المدرسين وأقل الأسعار
            </h2>
            <p className="text-sm text-slate-500 leading-relaxed font-medium">
              هل تبحث عن مدرس خصوصي موثوق يؤسس ابنك في المواد الأساسية أو يدعمه في المراحل المتقدمة؟ نحن نوفر نخبة من أفضل المدرسين لجميع المواد ولجميع المراحل الدراسية وبأسعار مناسبة للجميع في الكويت.
            </p>

            <div className="flex flex-wrap gap-4 pt-4">
              <Button onClick={() => navigate('/login')} className="rounded-2xl px-6 py-5 font-black text-xs shadow-xl shadow-primary/10">
                الدخول لبوابة المعهد
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  const el = document.getElementById('services');
                  el?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="rounded-2xl px-6 py-5 font-black text-xs border-slate-200"
              >
                تعرف على خدماتنا
              </Button>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-4 pt-8 border-t border-slate-100 text-right">
              <div>
                <p className="text-2xl font-black text-primary">500+</p>
                <p className="text-[10px] text-slate-400 font-bold">طالب مسجل</p>
              </div>
              <div>
                <p className="text-2xl font-black text-primary">50+</p>
                <p className="text-[10px] text-slate-400 font-bold">مدرس معتمد</p>
              </div>
              <div>
                <p className="text-2xl font-black text-primary">98%</p>
                <p className="text-[10px] text-slate-400 font-bold">نسبة رضا العملاء</p>
              </div>
            </div>
          </div>

          {/* Visual Showcase */}
          <div className="relative flex justify-center">
            <div className="absolute inset-0 bg-gradient-to-r from-secondary/10 to-primary/10 rounded-full blur-3xl -z-10" />
            <img
              src={logoAlpha}
              alt="Alpha Showcase"
              className="rounded-3xl w-[320px] lg:w-[400px] h-auto object-cover shadow-2xl border-4 border-white rotate-2 hover:rotate-0 transition-transform duration-500"
            />
          </div>

        </div>
      </section>

      {/* About Us (من نحن) */}
      <section id="about" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

          <div className="space-y-6">
            <h3 className="text-xs font-black text-secondary uppercase tracking-widest">نبذة عنا</h3>
            <h2 className="text-2xl lg:text-3xl font-black text-primary">أكاديمية ركان للتدريس الخصوصي</h2>
            <p className="text-sm text-slate-500 leading-relaxed font-medium">
              أكاديمية ركان هي مؤسسة تعليمية كويتية متخصصة في تقديم خدمات التدريس الخصوصي لجميع المراحل الدراسية من التأسيس إلى الجامعة. نضم نخبة من أفضل المدرسين والمدرسات المؤهلين لتقديم تعليم متميز وفق أحدث الأساليب التعليمية.
            </p>
            <p className="text-sm text-slate-500 leading-relaxed font-medium">
              نؤمن بأن كل طالب يستحق تعليماً يراعي احتياجاته الفردية، ولهذا نقدم خططاً دراسية مخصصة تناسب مستوى كل طالب وتساعده على تحقيق أقصى استفادة ممكنة.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 text-xs font-black text-slate-700">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-secondary shrink-0" />
                أكثر من 500 طالب وطالبة التحقوا بنا
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-secondary shrink-0" />
                نخبة من المدرسين ذوي الخبرة
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-secondary shrink-0" />
                أسعار تنافسية تناسب الجميع
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-secondary shrink-0" />
                متابعة مستمرة وتقارير دورية لأولياء الأمور
              </div>
            </div>
          </div>

          <div className="bg-slate-50 rounded-3xl p-8 border border-slate-100 grid grid-cols-2 gap-6 text-center">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <p className="text-3xl font-black text-secondary">2018</p>
              <p className="text-[11px] text-slate-400 font-bold mt-1">تاريخ التأسيس</p>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <p className="text-3xl font-black text-primary">500+</p>
              <p className="text-[11px] text-slate-400 font-bold mt-1">الطلاب الملتحقين</p>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <p className="text-3xl font-black text-primary">50+</p>
              <p className="text-[11px] text-slate-400 font-bold mt-1">مدرس متخصص</p>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <p className="text-3xl font-black text-secondary">98%</p>
              <p className="text-[11px] text-slate-400 font-bold mt-1">نسبة النجاح والرضا</p>
            </div>
          </div>

        </div>
      </section>

      {/* Services (الخدمات) */}
      <section id="services" className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6 space-y-12">

          <div className="text-center space-y-4 max-w-xl mx-auto">
            <h3 className="text-xs font-black text-secondary uppercase tracking-widest">الخدمات التعليمية</h3>
            <h2 className="text-2xl lg:text-3xl font-black text-primary">نقدم حلولاً تعليمية متكاملة تغطي جميع المراحل الدراسية</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

            <Card className="shadow-md border-none hover:shadow-xl transition-shadow rounded-3xl overflow-hidden bg-white">
              <CardHeader className="bg-primary/5 p-5">
                <CardTitle className="text-sm font-black text-primary">التأسيس (المراحل الأولى)</CardTitle>
              </CardHeader>
              <CardContent className="p-5 text-xs text-slate-500 font-medium leading-relaxed space-y-2">
                <p>تأسيس قوي في اللغة العربية، الإنجليزية، والرياضيات بأحدث الأساليب التربوية المبتكرة.</p>
                <ul className="space-y-1 text-slate-700 font-bold pt-2">
                  <li>• قراءة وكتابة وإملاء</li>
                  <li>• أساسيات الحساب والمنطق</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="shadow-md border-none hover:shadow-xl transition-shadow rounded-3xl overflow-hidden bg-white">
              <CardHeader className="bg-primary/5 p-5">
                <CardTitle className="text-sm font-black text-primary">المرحلة المتوسطة</CardTitle>
              </CardHeader>
              <CardContent className="p-5 text-xs text-slate-500 font-medium leading-relaxed space-y-2">
                <p>تدريس جميع مواد الصفوف المتوسطة مع متابعة دورية واختبارات تقييمية مستمرة قياسية.</p>
                <ul className="space-y-1 text-slate-700 font-bold pt-2">
                  <li>• الرياضيات والعلوم</li>
                  <li>• اللغات والدراسات الاجتماعية</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="shadow-md border-none hover:shadow-xl transition-shadow rounded-3xl overflow-hidden bg-white">
              <CardHeader className="bg-primary/5 p-5">
                <CardTitle className="text-sm font-black text-primary">المرحلة الثانوية</CardTitle>
              </CardHeader>
              <CardContent className="p-5 text-xs text-slate-500 font-medium leading-relaxed space-y-2">
                <p>تدريس جميع مواد الصفوف الثانوية (علمي وأدبي) مع التركيز الكامل على الامتحانات النهائية.</p>
                <ul className="space-y-1 text-slate-700 font-bold pt-2">
                  <li>• علمي: فيزياء، كيمياء، أحياء</li>
                  <li>• رياضيات متقدمة وإحصاء</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="shadow-md border-none hover:shadow-xl transition-shadow rounded-3xl overflow-hidden bg-white">
              <CardHeader className="bg-primary/5 p-5">
                <CardTitle className="text-sm font-black text-primary">الجامعة والمعاهد</CardTitle>
              </CardHeader>
              <CardContent className="p-5 text-xs text-slate-500 font-medium leading-relaxed space-y-2">
                <p>تدريس مواد الكليات الهندسية والإدارية والعلوم والتطبيقية والتدريبية التخصصية.</p>
                <ul className="space-y-1 text-slate-700 font-bold pt-2">
                  <li>• مواد الهندسة والحاسب</li>
                  <li>• مواد إدارة الأعمال والطب</li>
                </ul>
              </CardContent>
            </Card>

          </div>

        </div>
      </section>

      {/* Access Portals (بوابات الدخول) */}
      <section id="portals" className="py-20 bg-primary text-primary-foreground relative">
        <div className="absolute inset-0 bg-black/10 -z-10" />
        <div className="max-w-7xl mx-auto px-6 space-y-12">

          <div className="text-center space-y-4 max-w-xl mx-auto">
            <h3 className="text-xs font-black text-secondary uppercase tracking-widest">بوابات الدخول الموحدة</h3>
            <h2 className="text-2xl lg:text-3xl font-black">اختر بوابتك للدخول إلى نظام المعهد الموحد</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

            <Card className="bg-white/5 border border-white/10 hover:border-secondary/40 transition-all rounded-3xl p-6 text-right flex flex-col justify-between space-y-6">
              <div className="space-y-2">
                <span className="h-10 w-10 bg-secondary/15 text-secondary rounded-xl flex items-center justify-center font-black">
                  <Users className="h-5 w-5" />
                </span>
                <h3 className="text-base font-black text-white pt-2">بوابة الطالب</h3>
                <p className="text-xs text-primary-foreground/60 leading-relaxed font-bold">
                  متابعة جدول الحصص والدرجات والتقييمات والاختبارات والمستندات والتفاعل المباشر مع الذكاء الاصطناعي الخاص بك.
                </p>
              </div>
              <Button onClick={() => navigate('/login')} className="w-full rounded-xl bg-secondary text-secondary-foreground font-black text-xs hover:bg-secondary/90 shadow-lg shadow-secondary/20 py-5">
                دخول الطالب
              </Button>
            </Card>

            <Card className="bg-white/5 border border-white/10 hover:border-secondary/40 transition-all rounded-3xl p-6 text-right flex flex-col justify-between space-y-6">
              <div className="space-y-2">
                <span className="h-10 w-10 bg-secondary/15 text-secondary rounded-xl flex items-center justify-center font-black">
                  <ShieldCheck className="h-5 w-5" />
                </span>
                <h3 className="text-base font-black text-white pt-2">بوابة ولي الأمر</h3>
                <p className="text-xs text-primary-foreground/60 leading-relaxed font-bold">
                  متابعة مستوى الأبناء وتقارير الحضور والغياب والدرجات وتفاصيل الفواتير والمدفوعات المتأخرة وصندوق الرسائل الموحد.
                </p>
              </div>
              <Button onClick={() => navigate('/login')} className="w-full rounded-xl bg-secondary text-secondary-foreground font-black text-xs hover:bg-secondary/90 shadow-lg shadow-secondary/20 py-5">
                دخول ولي الأمر
              </Button>
            </Card>

            <Card className="bg-white/5 border border-white/10 hover:border-secondary/40 transition-all rounded-3xl p-6 text-right flex flex-col justify-between space-y-6">
              <div className="space-y-2">
                <span className="h-10 w-10 bg-secondary/15 text-secondary rounded-xl flex items-center justify-center font-black">
                  <GraduationCap className="h-5 w-5" />
                </span>
                <h3 className="text-base font-black text-white pt-2">بوابة المعلم</h3>
                <p className="text-xs text-primary-foreground/60 leading-relaxed font-bold">
                  رصد وتحضير الحصص والغياب وتدريس المناهج وتحميل المستندات والمتابعة المالية وحصص الطلاب.
                </p>
              </div>
              <Button onClick={() => navigate('/login')} className="w-full rounded-xl bg-secondary text-secondary-foreground font-black text-xs hover:bg-secondary/90 shadow-lg shadow-secondary/20 py-5">
                دخول المعلم
              </Button>
            </Card>

          </div>

        </div>
      </section>

      {/* FAQs (الأسئلة الشائعة) */}
      <section id="faq" className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-6 space-y-12">

          <div className="text-center space-y-4">
            <h3 className="text-xs font-black text-secondary uppercase tracking-widest">الأسئلة الشائعة</h3>
            <h2 className="text-2xl lg:text-3xl font-black text-primary">إجابات لأكثر الأسئلة التي تهم أولياء الأمور والطلاب</h2>
          </div>

          <div className="space-y-4">

            <div className="p-5 border rounded-2xl bg-slate-50/50 space-y-2">
              <h4 className="text-xs font-black text-slate-800 flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-secondary shrink-0" />
                ما هي آلية التدريس في الأكاديمية؟
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed pl-6 font-bold">
                نقدم خيارين للتدريس: حضوري (في المعهد أو منزل الطالب) وعن بُعد (عبر منصات تفاعلية متطورة). يتم تحديد الجدول بالاتفاق مع ولي الأمر، ونوفر تقارير أداء دورية مستمرة.
              </p>
            </div>

            <div className="p-5 border rounded-2xl bg-slate-50/50 space-y-2">
              <h4 className="text-xs font-black text-slate-800 flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-secondary shrink-0" />
                كيف يتم اختيار المدرس المناسب؟
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed pl-6 font-bold">
                نقوم بتقييم مستوى الطالب أولاً، ثم نختار المدرس الأنسب من حيث التخصص والخبرة وأسلوب التدريس المعتمد. يمكنك طلب تغيير المدرس في أي وقت إذا لزم الأمر.
              </p>
            </div>

            <div className="p-5 border rounded-2xl bg-slate-50/50 space-y-2">
              <h4 className="text-xs font-black text-slate-800 flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-secondary shrink-0" />
                هل تقدمون حصصاً تجريبية مجانية؟
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed pl-6 font-bold">
                نعم، نوفر حصة تجريبية مجانية بالكامل دون أي التزام. يمكنك تجربة المعلم وطريقة الشرح قبل إتمام الاشتراك في أي باقة شهرية.
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* Application Form Section */}
      <section id="apply" className="py-20 bg-slate-50 border-t border-slate-100">
        <div className="max-w-xl mx-auto px-6">
          <Card className="shadow-xl rounded-3xl border-none p-8 bg-white text-right space-y-6">
            <div className="text-center space-y-2">
              <h3 className="text-base font-black text-primary">تقديم طلب مباشر</h3>
              <p className="text-[11px] text-slate-400 font-bold">احجز حصة تجريبية مجانية وسيتواصل معك مستشارو المعهد فوراً</p>
            </div>

            <form onSubmit={handleApply} className="space-y-4">
              <div className="space-y-1">
                <Label className="text-[10px]">الاسم الكامل</Label>
                <Input
                  placeholder="أدخل اسمك الكريم..."
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="rounded-xl h-10 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px]">رقم هاتف المتابعة والواتساب</Label>
                <Input
                  placeholder="965XXXXXXXX"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="rounded-xl h-10 text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px]">المرحلة أو المادة المطلوبة</Label>
                <Input
                  placeholder="مثال: رياضيات تأسيس أو لغة إنجليزية"
                  value={formData.service}
                  onChange={(e) => setFormData({ ...formData, service: e.target.value })}
                  className="rounded-xl h-10 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px]">ملاحظات أو طلبات خاصة (اختياري)</Label>
                <Input
                  placeholder="مثال: يفضل معلم هادئ وحصة تجريبية بعد الرابعة"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="rounded-xl h-10 text-xs"
                />
              </div>

              <Button type="submit" className="w-full rounded-2xl bg-secondary hover:bg-secondary/90 text-secondary-foreground font-black text-xs py-5 mt-2">
                إرسال الطلب وحجز الحصة التجريبية
              </Button>
            </form>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-primary text-primary-foreground py-12 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8">

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <img src={logoAlpha} alt="Alpha Academy" className="h-10 w-10 rounded-xl" />
              <h2 className="text-base font-black text-white">أكاديمية ركان (ألفا)</h2>
            </div>
            <p className="text-[11px] text-primary-foreground/60 leading-relaxed font-bold">
              نحو تعليم أفضل لمستقبل مشرق. نقدم حلولاً تكنولوجية وتعليمية متميزة لجميع المراحل الدراسية لضمان التفوق وتحقيق الأهداف.
            </p>
          </div>

          <div className="space-y-3 text-xs">
            <h4 className="font-black text-white border-r-2 border-secondary pr-2">روابط سريعة</h4>
            <ul className="space-y-2 pr-2 text-primary-foreground/75 font-bold">
              <li><a href="#about" className="hover:text-white">من نحن</a></li>
              <li><a href="#services" className="hover:text-white">الخدمات والبرامج</a></li>
              <li><a href="#portals" className="hover:text-white">بوابات الدخول الموحدة</a></li>
              <li><a href="#faq" className="hover:text-white">الأسئلة الشائعة</a></li>
            </ul>
          </div>

          <div className="space-y-3 text-xs">
            <h4 className="font-black text-white border-r-2 border-secondary pr-2">معلومات الاتصال</h4>
            <ul className="space-y-2 pr-2 text-primary-foreground/75 font-bold">
              <li>الكويت - جميع المحافظات والأحياء</li>
              <li dir="ltr" className="text-right font-mono">+965 5086 6476</li>
              <li>noonm222@rakaninstitutekw.com</li>
              <li>السبت - الخميس: 8 صباحاً - 9 مساءً</li>
            </ul>
          </div>

        </div>
        <div className="max-w-7xl mx-auto px-6 pt-8 mt-8 border-t border-white/5 text-center text-[10px] text-primary-foreground/45 font-black">
          © 2026 أكاديمية ركان. جميع الحقوق محفوظة. نظام إدارة معاهد التعليم الموحد.
        </div>
      </footer>

    </div>
  );
};

export default LandingPage;
