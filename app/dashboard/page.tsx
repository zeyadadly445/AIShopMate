'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface MerchantData {
  id: string
  email: string
  businessName: string
  chatbotId: string
  subscription: {
    plan: string
    status: string
    messagesLimit: number
    messagesUsed: number
  }
}

export default function DashboardPage() {
  const [merchant, setMerchant] = useState<MerchantData | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/auth/login')
      return
    }

    // Try to get merchant data from localStorage (saved during registration)
    const merchantData = localStorage.getItem('merchantData')
    if (merchantData) {
      try {
        setMerchant(JSON.parse(merchantData))
      } catch (error) {
        console.error('Error parsing merchant data:', error)
      }
    }
    
    setLoading(false)
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('merchantData')
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    )
  }

  if (!merchant) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">خطأ في تحميل البيانات</h1>
          <button
            onClick={() => router.push('/auth/login')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            تسجيل الدخول
          </button>
        </div>
      </div>
    )
  }

  const chatbotUrl = `https://ai-shop-mate.vercel.app/chat/${merchant.chatbotId}`

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">لوحة التحكم</h1>
              <p className="text-gray-600">مرحباً بك، {merchant.businessName}</p>
            </div>
            <button
              onClick={handleLogout}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
            >
              تسجيل الخروج
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Success Message */}
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6">
          <strong>🎉 تم إنشاء حسابك بنجاح!</strong>
          <p>مرحباً بك في منصة AI Shop Mate. يمكنك الآن بدء استخدام الشات بوت الذكي لمتجرك.</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-bold">💬</span>
                  </div>
                </div>
                <div className="mr-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      الرسائل المستخدمة
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {merchant.subscription.messagesUsed} / {merchant.subscription.messagesLimit}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-bold">📊</span>
                  </div>
                </div>
                <div className="mr-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      خطة الاشتراك
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {merchant.subscription.plan}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-bold">⚡</span>
                  </div>
                </div>
                <div className="mr-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      حالة الحساب
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {merchant.subscription.status === 'TRIAL' ? 'تجريبي' : 'نشط'}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Chatbot Link */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">🤖 رابط الشات بوت الخاص بك</h2>
          <div className="bg-gray-100 p-4 rounded-lg">
            <p className="text-sm text-gray-600 mb-2">استخدم هذا الرابط في بايو وسائل التواصل الاجتماعي:</p>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={chatbotUrl}
                readOnly
                className="flex-1 p-2 border border-gray-300 rounded text-sm"
              />
              <button
                onClick={() => navigator.clipboard.writeText(chatbotUrl)}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm"
              >
                نسخ
              </button>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">🚀 الخطوات التالية</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border border-gray-200 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">1. إعداد مصادر البيانات</h3>
              <p className="text-gray-600 text-sm mb-3">أضف روابط منتجاتك وأسعارك من Google Docs أو Sheets</p>
              <button className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 text-sm">
                إضافة مصادر البيانات
              </button>
            </div>

            <div className="p-4 border border-gray-200 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">2. تخصيص الشات بوت</h3>
              <p className="text-gray-600 text-sm mb-3">غير رسالة الترحيب والألوان حسب علامتك التجارية</p>
              <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm">
                تخصيص الشات بوت
              </button>
            </div>

            <div className="p-4 border border-gray-200 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">3. اختبار الشات بوت</h3>
              <p className="text-gray-600 text-sm mb-3">جرب الشات بوت للتأكد من عمله بالشكل المطلوب</p>
              <a
                href={chatbotUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 text-sm"
              >
                اختبار الآن
              </a>
            </div>

            <div className="p-4 border border-gray-200 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">4. مشاركة الرابط</h3>
              <p className="text-gray-600 text-sm mb-3">ضع الرابط في بايو Instagram، TikTok، وبقية حساباتك</p>
              <button
                onClick={() => navigator.clipboard.writeText(chatbotUrl)}
                className="bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700 text-sm"
              >
                نسخ الرابط
              </button>
            </div>
          </div>
        </div>

        {/* Account Info */}
        <div className="mt-6 bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">📋 معلومات الحساب</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">معلومات أساسية</h3>
              <dl className="space-y-2">
                <div>
                  <dt className="text-sm text-gray-600">البريد الإلكتروني:</dt>
                  <dd className="text-sm font-medium text-gray-900">{merchant.email}</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-600">اسم المتجر:</dt>
                  <dd className="text-sm font-medium text-gray-900">{merchant.businessName}</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-600">معرف الشات بوت:</dt>
                  <dd className="text-sm font-medium text-gray-900">{merchant.chatbotId}</dd>
                </div>
              </dl>
            </div>
            
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">تفاصيل الاشتراك</h3>
              <dl className="space-y-2">
                <div>
                  <dt className="text-sm text-gray-600">النوع:</dt>
                  <dd className="text-sm font-medium text-gray-900">{merchant.subscription.plan}</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-600">الحالة:</dt>
                  <dd className="text-sm font-medium text-gray-900">
                    {merchant.subscription.status === 'TRIAL' ? 'فترة تجريبية' : 'نشط'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-600">الحد الشهري:</dt>
                  <dd className="text-sm font-medium text-gray-900">{merchant.subscription.messagesLimit} رسالة</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
} 