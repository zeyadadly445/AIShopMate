# 🔒 دليل لوحة التحكم الإدارية - AI Shop Mate

## 🚀 الوصول للوحة الإدارة

### 🔗 الروابط
- **صفحة تسجيل الدخول**: `/admin/login`
- **لوحة التحكم**: `/admin/dashboard`

### 🔐 بيانات الدخول الافتراضية
- **اسم المستخدم**: `admin_zeyad`
- **كلمة المرور**: `Admin@2024!`

> ⚠️ **تحذير أمني**: يجب تغيير كلمة المرور الافتراضية في البيئة الإنتاجية!

---

## 🛡️ ميزات الأمان

### 🔒 الحماية المتعددة الطبقات
- **تشفير كلمات المرور**: bcrypt مع 12 rounds
- **JWT Tokens**: انتهاء صلاحية خلال 24 ساعة  
- **Rate Limiting**: 5 محاولات دخول فقط
- **Session Management**: إدارة جلسات آمنة
- **Access Control**: تحقق من الصلاحيات في كل طلب

### 🕵️ المراقبة والتسجيل
- تسجيل جميع محاولات الدخول
- مراقبة العمليات الإدارية
- تتبع IP addresses
- تسجيل التغييرات والحذف

---

## 📊 ميزات لوحة التحكم

### 🏠 النظرة العامة
- **إحصائيات شاملة**: إجمالي المستخدمين، النشطين، الرسائل، الإيرادات
- **إحصائيات إضافية**: المستخدمين الجدد، التجريبيين، الواصلين للحد
- **أعلى المستخدمين**: ترتيب حسب الاستخدام
- **التحديث المباشر**: تحديث البيانات كل دقيقة

### 👥 إدارة المستخدمين
- **عرض قائمة كاملة** بجميع المستخدمين
- **البحث والفلترة** حسب الاسم، البريد، معرف الشات بوت
- **عرض التفاصيل** الكاملة لكل مستخدم
- **تعديل البيانات** (اسم المتجر، الهاتف، رسالة الترحيب، اللون)
- **حذف المستخدمين** مع التأكيد
- **زيارة الشات بوت** مباشرة

### 💳 إدارة الاشتراكات
- **تغيير الخطط**: BASIC, STANDARD, PREMIUM, ENTERPRISE
- **تحديث الحالة**: TRIAL, ACTIVE, CANCELLED, EXPIRED
- **تعديل الحدود**: تغيير عدد الرسائل المسموحة
- **إعادة تعيين العداد**: إعادة عداد الرسائل المستخدمة إلى صفر
- **تمديد الاشتراكات**: تحديد تاريخ انتهاء

### 📈 التحليلات (قادمة)
- رسوم بيانية للاستخدام
- تحليل الأداء
- تقارير مالية
- إحصائيات النمو

---

## 🔧 استخدام APIs الإدارية

### 🔐 المصادقة
جميع APIs تتطلب header المصادقة:
```javascript
{
  "Authorization": "Bearer YOUR_ADMIN_TOKEN"
}
```

### 📋 APIs المتاحة

#### 1. تسجيل الدخول
```http
POST /api/admin/auth/login
Content-Type: application/json

{
  "username": "admin_zeyad",
  "password": "Admin@2024!"
}
```

#### 2. جلب بيانات الداشبورد
```http
GET /api/admin/dashboard
Authorization: Bearer TOKEN
```

#### 3. إدارة المستخدمين
```http
# جلب تفاصيل مستخدم
GET /api/admin/users/{userId}
Authorization: Bearer TOKEN

# تحديث مستخدم
PUT /api/admin/users/{userId}
Authorization: Bearer TOKEN
Content-Type: application/json

{
  "businessName": "اسم جديد",
  "phone": "0501234567",
  "welcomeMessage": "رسالة ترحيب جديدة",
  "primaryColor": "#ff6b35"
}

# حذف مستخدم
DELETE /api/admin/users/{userId}
Authorization: Bearer TOKEN
```

#### 4. إدارة الاشتراكات
```http
# تحديث اشتراك
PUT /api/admin/subscriptions/{subscriptionId}
Authorization: Bearer TOKEN
Content-Type: application/json

{
  "plan": "PREMIUM",
  "status": "ACTIVE",
  "messagesLimit": 5000,
  "messagesUsed": 0
}

# إعادة تعيين عداد الرسائل
POST /api/admin/subscriptions/{subscriptionId}
Authorization: Bearer TOKEN
Content-Type: application/json

{
  "action": "reset_messages"
}
```

---

## ⚙️ الإعداد والتهيئة

### 🔑 متغيرات البيئة المطلوبة
```env
# JWT Secret for admin tokens
JWT_SECRET=your-super-secret-jwt-key

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Database
DATABASE_URL=your-database-url
```

### 🔄 تغيير كلمة مرور المدير

لتغيير كلمة المرور، عدل الملف `lib/admin-auth.ts`:

```javascript
// استخدم هذه الدالة لتشفير كلمة مرور جديدة
const newPassword = await AdminAuthService.hashPassword('كلمة_المرور_الجديدة')
console.log(newPassword) // انسخ النتيجة واستبدلها في ADMIN_CREDENTIALS
```

---

## 🚨 تنبيهات أمنية

### ⚠️ مهم جداً
1. **غير كلمة المرور الافتراضية** فوراً في الإنتاج
2. **احتفظ بـ JWT_SECRET آمناً** ولا تشاركه أبداً
3. **استخدم HTTPS** في البيئة الإنتاجية
4. **راقب محاولات الدخول** غير الصالحة
5. **عمل backup منتظم** لقاعدة البيانات

### 🔐 أفضل الممارسات
- تسجيل الخروج بعد انتهاء العمل
- عدم مشاركة بيانات الدخول
- استخدام كلمات مرور قوية
- مراجعة سجلات النشاط بانتظام

---

## 🆘 استكشاف الأخطاء

### مشاكل شائعة

#### 1. خطأ في تسجيل الدخول
```
- تأكد من صحة اسم المستخدم وكلمة المرور
- تحقق من عدم تجاوز 5 محاولات
- امسح cache المتصفح
```

#### 2. خطأ "غير مصرح"
```
- تأكد من صحة الـ token
- تحقق من انتهاء صلاحية الجلسة (24 ساعة)
- سجل دخول من جديد
```

#### 3. خطأ في تحميل البيانات
```
- تحقق من اتصال قاعدة البيانات
- تأكد من صحة متغيرات البيئة
- راجع console للأخطاء التفصيلية
```

---

## 📞 الدعم

للمساعدة التقنية أو الإبلاغ عن مشاكل:
- **Email**: admin@ai-shop-mate.com
- **GitHub Issues**: https://github.com/zeyadadly445/AIShopMate/issues

---

## 📋 سجل التحديثات

### v1.0.0 (2024)
- ✅ إطلاق لوحة التحكم الإدارية
- ✅ نظام مصادقة آمن
- ✅ إدارة المستخدمين والاشتراكات
- ✅ داشبورد بالإحصائيات المباشرة
- ✅ واجهة عربية احترافية

---

*تم إنشاء هذا النظام بواسطة فريق AI Shop Mate - جميع الحقوق محفوظة 2024* 