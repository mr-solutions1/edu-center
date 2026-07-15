# FlowShip ERP - Enterprise ERP & Educational Management Platform
نظام إدارة معهد أكاديمية ركان المتكامل

## Overview / نظرة عامة
**أكاديمية ركان (FlowShip)** هو نظام متكامل لإدارة المؤسسات التعليمية (ERP) مصمم لتبسيط عمليات المعاهد التعليمية. يتميز بواجهة خلفية قوية مبنية بـ Node.js وواجهة أمامية حديثة بـ React/Vite مع تتبع الحضور، الحصص، المدفوعات والرواتب.

---

### 🚀 روابط بيئة التجربة والإنتاج (Alpha/Staging Environment)
- **الواجهة الأمامية (Vercel)**: [https://alpha.flowship.site](https://alpha.flowship.site)
- **واجهة البرمجة (Express API)**: [https://alpha-api.flowship.site/api/v1](https://alpha-api.flowship.site/api/v1)

---

## 🏗️ المعمارية التقنية (Technical Architecture)
يتكون النظام من:
1.  **`edu-core-api`**: Node.js/Express Backend مستضاف على **Hostinger VPS** مع قاعدة بيانات MongoDB محلية مهيأة كـ Single-Node Replica Set.
2.  **`edu-core-web`**: React/Vite Frontend مستضاف على **Vercel** ومبرمج للعمل بالكامل كـ Single Page Application (SPA).

---

## ✨ المميزات الرئيسية (Key Features)
- **الجدولة الذكية**: إدارة الحصص والدروس مع الكشف التلقائي عن التعارضات في التوقيت والمدربين والطلاب.
- **إدارة المستندات**: رفع وحفظ ملفات الطلاب والمعلمين بسعة تصل إلى 5 ميجابايت مدعومة بـ Nginx.
- **النظام المالي المتقدم**: حساب رواتب المعلمين وتتبع مدفوعات الطلاب وإصدار الفواتير آلياً.
- **الأمان والتحقق**: دعم حماية الجلسات باستخدام HttpOnly Cookies و JWT Token Rotation مع تقييد معدل الطلبات وحماية ثنائية بـ Helmet.
- **النسخ الاحتياطي التلقائي**: سكربت مدمج للنسخ الاحتياطي لقاعدة البيانات يومياً مع التدوير التلقائي وحذف النسخ القديمة لحماية البيانات.

---

## 🛠️ المتطلبات لتشغيل المشروع (System Requirements)
- **Node.js**: إصدار v22 LTS أو أعلى
- **MongoDB**: إصدار v8.0 مع تفعيل Replica Set محلياً لتمكين العمليات الذرية (Transactions).
- **PM2**: لإدارة عمليات الخادم وضمان استمرار العمل في الخلفية وتوزيع الأحمال (Cluster Mode).
- **Nginx**: كخادم وكيل عكسي (Reverse Proxy) لشهادات الأمان وتشفير الاتصال SSL وتحديد حجم الملفات المضغوطة.

---

## 🚀 البدء السريع للتطوير المحلي (Local Development Setup)

### 1. إعداد الواجهة الخلفية (Backend Setup)
```bash
cd edu-core-api
npm install
cp .env.example .env
# قم بتعبئة البيانات السرية للـ JWT وقاعدة البيانات المحلية
```

**إنشاء حساب المدير الأساسي وتهيئة البيانات التجريبية:**
```bash
# إنشاء حساب المدير (Admin) لتمكين الدخول لأول مرة
npm run create-admin

# تهيئة بيانات تجريبية باللغة العربية (اختياري)
npm run seed
```

**تشغيل خادم التطوير محلياً:**
```bash
npm run dev
```

### 2. إعداد الواجهة الأمامية (Frontend Setup)
```bash
cd edu-core-web
npm install
cp .env.production .env.local
# تأكد من أن VITE_API_BASE_URL يشير إلى http://localhost:5000/api/v1 في التطوير المحلي
npm run dev
```

---

## 📖 دليل النشر وإعداد الخادم (Production & Deployment Guide)
تجد كافة تفاصيل النشر وإعداد السيرفر خطوة بخطوة من التثبيت وحتى تشغيل حماية SSL في ملف:
👉 **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)**

---
© 2026 أكاديمية ركان. جميع الحقوق محفوظة.
