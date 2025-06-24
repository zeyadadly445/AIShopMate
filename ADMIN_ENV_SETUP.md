# 🔐 إعداد متغيرات البيئة للوحة الإدارة

## 📋 المتغيرات المطلوبة

أضف هذه المتغيرات إلى ملف `.env.local` أو في إعدادات Vercel:

```env
# Admin Panel Configuration
ADMIN_USERNAME=admin_zeyad
ADMIN_PASSWORD_HASH=$2b$12$egnqIRrdQrahfcMxnkeEXuM6DIj9PsbVM1BTZOd.h7cDCmWFV3WpC
ADMIN_ID=admin_master_2024
```

## 🔑 بيانات الدخول الافتراضية

- **اسم المستخدم**: `admin_zeyad`
- **كلمة المرور**: `Admin@2024!`

## 🛠️ تغيير كلمة المرور

### الطريقة 1: باستخدام Script
```bash
# تشغيل script توليد hash جديد
node scripts/generate-admin-hash.js

# ثم نسخ الـ hash وتحديث متغير البيئة
ADMIN_PASSWORD_HASH=الـ_hash_الجديد
```

### الطريقة 2: يدوياً
```javascript
const bcrypt = require('bcryptjs')

async function generateHash() {
  const password = 'كلمة_المرور_الجديدة'
  const hash = await bcrypt.hash(password, 12)
  console.log('New hash:', hash)
}

generateHash()
```

## 🚀 للنشر على Vercel

1. اذهب إلى Vercel Dashboard
2. اختر مشروعك
3. اذهب إلى Settings → Environment Variables
4. أضف المتغيرات التالية:

| Key | Value |
|-----|-------|
| `ADMIN_USERNAME` | `admin_zeyad` |
| `ADMIN_PASSWORD_HASH` | `$2b$12$egnqIRrdQrahfcMxnkeEXuM6DIj9PsbVM1BTZOd.h7cDCmWFV3WpC` |
| `ADMIN_ID` | `admin_master_2024` |

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

1. **لا تشارك** الـ hash أو كلمة المرور
2. **غير كلمة المرور** في الإنتاج
3. **استخدم HTTPS** دائماً في الإنتاج
4. **احتفظ بنسخة احتياطية** من بيانات الدخول 