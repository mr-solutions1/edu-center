# Rakan Academy - Enterprise ERP
نظام إدارة أكاديمية ركان المتكامل

## Overview
**أكاديمية ركان** هو نظام متكامل لإدارة المؤسسات التعليمية (ERP) مصمم لتبسيط عمليات المعاهد التعليمية. يتميز بواجهة خلفية قوية مبنية بـ Node.js وواجهة أمامية حديثة بـ React/Vite.

### 🚀 روابط الإنتاج
- **الواجهة الأمامية**: [https://app.rakaninstitutekw.com](https://app.rakaninstitutekw.com)
- **واجهة البرمجة (API)**: [https://rakaninstitutekw.com/api](https://rakaninstitutekw.com/api)
- **الصفحة الرئيسية**: [https://rakaninstitutekw.com](https://rakaninstitutekw.com)

## 🏗️ المعمارية التقنية
يتكون النظام من:
- `edu-core-api`: Node.js/Express backend مع قاعدة بيانات MongoDB Atlas.
- `edu-core-web`: React/Vite frontend مستضاف على Vercel.

## ✨ المميزات الرئيسية
- **الجدولة الذكية**: إدارة الحصص مع كشف التعارضات.
- **النظام المالي**: حساب رواتب المعلمين وتتبع مدفوعات الطلاب آلياً.
- **التقارير**: تصدير تقارير احترافية بصيغة PDF و CSV مع دعم كامل للغة العربية.
- **لوحة تحكم للمعلم**: واجهة مخصصة للمعلمين لمتابعة جداولهم وحضور طلابهم.
- **إدارة الملفات**: رفع وتتبع صور البروفايل والمستندات.

## 🛠️ المتطلبات
- Node.js v20+
- MongoDB (يفضل Atlas)

## 🚀 البدء السريع (Local Development)

### 1. إعداد الواجهة الخلفية (Backend)
```bash
cd edu-core-api
npm install
cp .env.example .env # قم بتعديل القيم في ملف .env
# تأكد من وضع MONGO_URI و JWT Secrets
```

**إنشاء حساب المدير وتهيئة البيانات:**
```bash
# إنشاء حساب المدير (Admin)
npm run create-admin

# تهيئة بيانات تجريبية (عربي)
npm run seed
```

**تشغيل الخادم:**
```bash
npm run dev
```

### 2. إعداد الواجهة الأمامية (Frontend)
```bash
cd edu-core-web
npm install
cp .env.example .env # تأكد من صحة VITE_API_BASE_URL
npm run dev
```

## 📖 التوثيق
يمكن العثور على تفاصيل النشر والإعداد المتقدم في [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md).

---
© 2026 أكاديمية ركان. جميع الحقوق محفوظة.
