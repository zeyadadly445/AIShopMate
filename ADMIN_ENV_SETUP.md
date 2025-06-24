# 🔐 إعداد متغيرات البيئة للوحة الإدارة

## 📋 الطريقة المبسطة (موصى بها)

أضف هذه المتغيرات إلى ملف `.env.local` أو في إعدادات Vercel:

```env
# Admin Panel Configuration - Simplified
ADMIN_USERNAME=admin_zeyad
ADMIN_PASSWORD=Admin@2024!
g=admin_master_2024
```

## 🔐 الطريقة المتقدمة (للأمان الإضافي)

إذا كنت تريد استخدام كلمة مرور مشفرة للأمان المتقدم:

```env
# Admin Panel Configuration - Advanced
ADMIN_USERNAME=admin_zeyad
ADMIN_PASSWORD_HASH=$2b$12$egnqIRrdQrahfcMxnkeEXuM6DIj9PsbVM1BTZOd.h7cDCmWFV3WpC
ADMIN_ID=admin_master_2024
```

**ملاحظة هامة:** النظام يدعم الطريقتين! إذا كان `ADMIN_PASSWORD_HASH` موجود، سيتم استخدامه. وإلا سيتم استخدام `ADMIN_PASSWORD`.

## 🔑 بيانات الدخول الافتراضية

- **اسم المستخدم**: `admin_zeyad`
- **كلمة المرور**: `Admin@2024!`

## 💡 فائدة متغير ADMIN_ID

متغير `ADMIN_ID` يُستخدم في:

- **JWT Tokens**: لتحديد هوية المدير في الـ token
- **Audit Logs**: لتسجيل عمليات المدير في النظام
- **Session Management**: للتحكم في جلسات متعددة للمدير
- **Future Features**: ميزات مستقبلية مثل أذونات متعددة للمدراء

## 🛠️ تغيير كلمة المرور

### الطريقة المبسطة:

فقط غير قيمة `ADMIN_PASSWORD` في متغيرات البيئة!

### الطريقة المتقدمة:

```bash
# تشغيل script توليد hash جديد
node scripts/test-admin-login.js

# ثم نسخ الـ hash وتحديث متغير البيئة
ADMIN_PASSWORD_HASH=الـ_hash_الجديد
```

## 🚀 للنشر على Vercel

1. اذهب إلى Vercel Dashboard
2. اختر مشروعك
3. اذهب إلى Settings → Environment Variables
4. أضف المتغيرات التالية:

### الطريقة المبسطة:

| Key                | Value                 |
| ------------------ | --------------------- |
| `ADMIN_USERNAME` | `admin_zeyad`       |
| `ADMIN_PASSWORD` | `Admin@2024!`       |
| `ADMIN_ID`       | `admin_master_2024` |

### الطريقة المتقدمة:

| Key                     | Value                                                            |
| ----------------------- | ---------------------------------------------------------------- |
| `ADMIN_USERNAME`      | `admin_zeyad`                                                  |
| `ADMIN_PASSWORD_HASH` | `$2b$12$egnqIRrdQrahfcMxnkeEXuM6DIj9PsbVM1BTZOd.h7cDCmWFV3WpC` |
| `ADMIN_ID`            | `admin_master_2024`                                            |

## 🔍 اختبار بيانات الدخول

```bash
# تشغيل المشروع محلياً
npm run dev

# اذهب إلى
http://localhost:3000/admin/login

# سجل دخول بـ:
# Username: admin_zeyad
# Password: Admin@2024!
```

## ⚠️ ملاحظات أمنية

1. **الطريقة المبسطة**: مناسبة للبيئات المحمية مثل Vercel
2. **الطريقة المتقدمة**: موصى بها للبيئات العامة
3. **غير كلمة المرور** في الإنتاج إلى شيء فريد
4. **استخدم HTTPS** دائماً في الإنتاج
5. **احتفظ بنسخة احتياطية** من بيانات الدخول
