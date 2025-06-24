import Link from "next/link";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="container mx-auto px-6 py-8">
        <nav className="flex items-center justify-between">
          <div className="flex items-center space-x-4 space-x-reverse">
            <div className="bg-blue-600 text-white p-2 rounded-lg">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">AI ShopMate</h1>
          </div>
          <div className="flex items-center space-x-4 space-x-reverse">
            <Link href="/auth/login">
              <Button variant="ghost">تسجيل الدخول</Button>
            </Link>
            <Link href="/auth/register">
              <Button>إنشاء حساب</Button>
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-6 py-20 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            شات بوت ذكي
            <span className="text-blue-600 block">لمتجرك الإلكتروني</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed">
            احصل على رابط مخصص لمتجرك واتصل بعملائك عبر ذكاء اصطناعي متطور. 
            دع الذكاء الاصطناعي يرد على استفسارات عملائك بناءً على بيانات متجرك.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/register">
              <Button size="lg" className="w-full sm:w-auto">
                ابدأ مجاناً الآن
              </Button>
            </Link>
            <Button variant="outline" size="lg" className="w-full sm:w-auto">
              شاهد العرض التوضيحي
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            لماذا AI ShopMate؟
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            منصة شاملة لإدارة تفاعل العملاء تلقائياً مع متجرك
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <Card variant="elevated" className="text-center">
            <div className="bg-blue-100 text-blue-600 p-4 rounded-full w-16 h-16 mx-auto mb-6 flex items-center justify-center">
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                <path d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-4">إعداد سريع</h3>
            <p className="text-gray-600">
              إعداد الشات بوت في دقائق معدودة. فقط أضف بيانات متجرك واحصل على رابط جاهز للاستخدام.
            </p>
          </Card>

          <Card variant="elevated" className="text-center">
            <div className="bg-green-100 text-green-600 p-4 rounded-full w-16 h-16 mx-auto mb-6 flex items-center justify-center">
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-4">ذكاء اصطناعي متقدم</h3>
            <p className="text-gray-600">
              يتعلم من بيانات متجرك ويقدم إجابات دقيقة ومفيدة لعملائك على مدار الساعة.
            </p>
          </Card>

          <Card variant="elevated" className="text-center">
            <div className="bg-purple-100 text-purple-600 p-4 rounded-full w-16 h-16 mx-auto mb-6 flex items-center justify-center">
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                <path d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-4">تفاعل طبيعي</h3>
            <p className="text-gray-600">
              محادثات ذكية تحتفظ بالسياق وتقدم تجربة تفاعلية طبيعية لعملائك.
            </p>
          </Card>
        </div>
      </section>

      {/* How it Works */}
      <section className="bg-gray-50 py-20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              كيف يعمل؟
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              ثلاث خطوات بسيطة لتشغيل شات بوت ذكي لمتجرك
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-blue-600 text-white rounded-full w-12 h-12 mx-auto mb-6 flex items-center justify-center text-lg font-bold">
                1
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">أنشئ حسابك</h3>
              <p className="text-gray-600">
                سجل حساب جديد واختر اسم فريد لمتجرك للحصول على رابط مخصص.
              </p>
            </div>

            <div className="text-center">
              <div className="bg-blue-600 text-white rounded-full w-12 h-12 mx-auto mb-6 flex items-center justify-center text-lg font-bold">
                2
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">أضف بيانات متجرك</h3>
              <p className="text-gray-600">
                ارفع روابط Google Docs أو Sheets التي تحتوي على معلومات منتجاتك وخدماتك.
              </p>
            </div>

            <div className="text-center">
              <div className="bg-blue-600 text-white rounded-full w-12 h-12 mx-auto mb-6 flex items-center justify-center text-lg font-bold">
                3
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">شارك الرابط</h3>
              <p className="text-gray-600">
                ضع رابط الشات بوت في bio حساباتك على السوشيال ميديا وابدأ التفاعل مع العملاء.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="container mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            خطط الأسعار
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            اختر الخطة المناسبة لحجم متجرك
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <Card variant="outlined" className="text-center">
            <h3 className="text-xl font-bold text-gray-900 mb-2">الأساسية</h3>
            <div className="text-3xl font-bold text-blue-600 mb-4">مجاناً</div>
            <p className="text-gray-600 mb-6">مثالية للبدء</p>
            <ul className="text-right space-y-3 mb-8">
              <li className="flex items-center">
                <svg className="w-5 h-5 text-green-500 ml-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                1000 رسالة شهرياً
              </li>
              <li className="flex items-center">
                <svg className="w-5 h-5 text-green-500 ml-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                مصدر بيانات واحد
              </li>
              <li className="flex items-center">
                <svg className="w-5 h-5 text-green-500 ml-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                دعم فني أساسي
              </li>
            </ul>
            <Link href="/auth/register">
              <Button variant="outline" className="w-full">ابدأ مجاناً</Button>
            </Link>
          </Card>

          <Card variant="elevated" className="text-center border-2 border-blue-500 relative">
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white px-4 py-1 rounded-full text-sm">
              الأكثر شعبية
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">المتقدمة</h3>
            <div className="text-3xl font-bold text-blue-600 mb-4">$29<span className="text-lg text-gray-500">/شهر</span></div>
            <p className="text-gray-600 mb-6">للمتاجر المتنامية</p>
            <ul className="text-right space-y-3 mb-8">
              <li className="flex items-center">
                <svg className="w-5 h-5 text-green-500 ml-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                10,000 رسالة شهرياً
              </li>
              <li className="flex items-center">
                <svg className="w-5 h-5 text-green-500 ml-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                5 مصادر بيانات
              </li>
              <li className="flex items-center">
                <svg className="w-5 h-5 text-green-500 ml-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                تخصيص الألوان والرسائل
              </li>
              <li className="flex items-center">
                <svg className="w-5 h-5 text-green-500 ml-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                دعم فني أولوية
              </li>
            </ul>
            <Link href="/auth/register">
              <Button className="w-full">ابدأ التجربة</Button>
            </Link>
          </Card>

          <Card variant="outlined" className="text-center">
            <h3 className="text-xl font-bold text-gray-900 mb-2">المؤسسية</h3>
            <div className="text-3xl font-bold text-blue-600 mb-4">$99<span className="text-lg text-gray-500">/شهر</span></div>
            <p className="text-gray-600 mb-6">للمتاجر الكبيرة</p>
            <ul className="text-right space-y-3 mb-8">
              <li className="flex items-center">
                <svg className="w-5 h-5 text-green-500 ml-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                رسائل غير محدودة
              </li>
              <li className="flex items-center">
                <svg className="w-5 h-5 text-green-500 ml-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                مصادر بيانات غير محدودة
              </li>
              <li className="flex items-center">
                <svg className="w-5 h-5 text-green-500 ml-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                تقارير وإحصائيات متقدمة
              </li>
              <li className="flex items-center">
                <svg className="w-5 h-5 text-green-500 ml-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                دعم مخصص 24/7
              </li>
            </ul>
            <Link href="/auth/register">
              <Button variant="outline" className="w-full">تواصل معنا</Button>
            </Link>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-blue-600 text-white py-20">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold mb-4">
            جاهز لتجربة الذكاء الاصطناعي في متجرك؟
          </h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto opacity-90">
            ابدأ اليوم واكتشف كيف يمكن للذكاء الاصطناعي أن يحول تفاعل عملائك مع متجرك
          </p>
          <Link href="/auth/register">
            <Button size="lg" variant="secondary">
              ابدأ تجربتك المجانية
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-4 space-x-reverse mb-4 md:mb-0">
              <div className="bg-blue-600 text-white p-2 rounded-lg">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <span className="text-xl font-bold">AI ShopMate</span>
            </div>
            <div className="text-gray-400">
              © 2024 AI ShopMate. جميع الحقوق محفوظة.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
