'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface SubscriptionData {
  id: string
  plan: string
  status: string
  messagesLimit: number
  messagesUsed: number
  usagePercentage: number
  remainingMessages: number
  createdAt: string
  updatedAt: string
}

interface MerchantData {
  id: string
  email: string
  businessName: string
  chatbotId: string
  createdAt: string
}

interface StatsData {
  merchant: MerchantData
  subscription: SubscriptionData
  systemStatus: string
  warning: string | null
  chatbotUrl: string
}

export default function DashboardPage() {
  const [stats, setStats] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const fetchStats = async () => {
    try {
      setRefreshing(true)
      
      // Get merchant ID from localStorage
      const merchantData = localStorage.getItem('merchantData')
      if (!merchantData) {
        throw new Error('Merchant data not found')
      }
      
      const merchant = JSON.parse(merchantData)
      const response = await fetch(`/api/merchant/stats/${merchant.id}`)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      setStats(data)
      setError(null)
      
      console.log('📊 Stats loaded:', data)
      
    } catch (err) {
      console.error('Error fetching stats:', err)
      setError(err instanceof Error ? err.message : 'خطأ في تحميل البيانات')
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/auth/login')
      return
    }

    // Load initial stats
    fetchStats().finally(() => setLoading(false))
    
    // Auto-refresh every 40 seconds
    const interval = setInterval(fetchStats, 40000)
    
    return () => clearInterval(interval)
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('merchantData')
    router.push('/')
  }

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500'
    if (percentage >= 75) return 'bg-yellow-500'
    if (percentage >= 50) return 'bg-blue-500'
    return 'bg-green-500'
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'limit_reached':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">🚫 تم الوصول للحد</span>
      case 'warning_high':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">⚠️ تحذير عالي</span>
      case 'warning_medium':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">⚠️ تحذير متوسط</span>
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">✅ نشط</span>
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-900">جاري التحميل...</p>
        </div>
      </div>
    )
  }

  if (error || !stats) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">خطأ في تحميل البيانات</h1>
          <p className="text-red-600 mb-4">{error || 'فشل في تحميل البيانات'}</p>
          <div className="space-x-4">
            <button
              onClick={fetchStats}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            >
              إعادة المحاولة
            </button>
            <button
              onClick={() => router.push('/auth/login')}
              className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700"
            >
              تسجيل الدخول
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">لوحة التحكم</h1>
              <p className="text-gray-900">مرحباً بك، {stats.merchant.businessName}</p>
            </div>
            <div className="flex items-center space-x-4 rtl:space-x-reverse">
              {refreshing && (
                <div className="flex items-center space-x-1 rtl:space-x-reverse text-blue-600">
                  <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-sm">جاري التحديث...</span>
                </div>
              )}
              <button
                onClick={handleLogout}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
              >
                تسجيل الخروج
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        
        {/* Warning Alert */}
        {stats.warning && (
          <div className={`border px-4 py-3 rounded mb-6 ${
            stats.systemStatus === 'limit_reached' 
              ? 'bg-red-100 border-red-400 text-red-700'
              : stats.systemStatus === 'warning_high'
              ? 'bg-red-50 border-red-300 text-red-800'
              : 'bg-yellow-50 border-yellow-300 text-yellow-800'
          }`}>
            <div className="flex items-center">
              <span className="text-2xl mr-3">
                {stats.systemStatus === 'limit_reached' ? '🚫' : '⚠️'}
              </span>
              <div>
                <strong>تنبيه مهم!</strong>
                <p>{stats.warning}</p>
              </div>
            </div>
          </div>
        )}

        {/* Success Message for new users */}
        {!stats.warning && stats.subscription.messagesUsed === 0 && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6">
            <strong>🎉 تم إنشاء حسابك بنجاح!</strong>
            <p>مرحباً بك في منصة AI Shop Mate. يمكنك الآن بدء استخدام الشات بوت الذكي لمتجرك.</p>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          
          {/* Messages Usage Card */}
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
                    <dt className="text-sm font-medium text-gray-900 truncate">
                      الرسائل المستخدمة
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats.subscription.messagesUsed.toLocaleString()} / {stats.subscription.messagesLimit.toLocaleString()}
                    </dd>
                  </dl>
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="mt-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-900">{stats.subscription.usagePercentage}% مستخدم</span>
                  <span className="text-gray-900">{stats.subscription.remainingMessages.toLocaleString()} متبقي</span>
                </div>
                <div className="mt-1 w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${getUsageColor(stats.subscription.usagePercentage)}`}
                    style={{ width: `${Math.min(stats.subscription.usagePercentage, 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Plan Card */}
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
                    <dt className="text-sm font-medium text-gray-900 truncate">
                      خطة الاشتراك
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats.subscription.plan}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {/* Status Card */}
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
                    <dt className="text-sm font-medium text-gray-900 truncate">
                      حالة النظام
                    </dt>
                    <dd className="mt-1">
                      {getStatusBadge(stats.systemStatus)}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {/* Account Status Card */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-bold">👤</span>
                  </div>
                </div>
                <div className="mr-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-900 truncate">
                      حالة الحساب
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats.subscription.status === 'TRIAL' ? 'تجريبي' : 'نشط'}
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
            <p className="text-sm text-gray-900 mb-2">استخدم هذا الرابط في بايو وسائل التواصل الاجتماعي:</p>
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <input
                type="text"
                value={`${typeof window !== 'undefined' ? window.location.origin : 'https://ai-shop-mate.vercel.app'}/chat/${stats.merchant.chatbotId}`}
                readOnly
                className="flex-1 p-2 border border-gray-300 rounded text-sm text-gray-900"
              />
              <button
                onClick={() => navigator.clipboard.writeText(`${window.location.origin}/chat/${stats.merchant.chatbotId}`)}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm"
              >
                نسخ
              </button>
            </div>
          </div>
          
          {/* Service Status */}
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">حالة الخدمة:</span>
              <div className="flex items-center">
                {stats.systemStatus === 'limit_reached' ? (
                  <>
                    <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                    <span className="text-sm text-red-600 font-medium">متوقف - الحد مستنفد</span>
                  </>
                ) : (
                  <>
                    <div className="w-3 h-3 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                    <span className="text-sm text-green-600 font-medium">نشط</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">🚀 الخطوات التالية</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border border-gray-200 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">1. إعداد مصادر البيانات</h3>
              <p className="text-gray-900 text-sm mb-3">أضف روابط منتجاتك وأسعارك من Google Docs أو Sheets</p>
              <button className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 text-sm">
                إضافة مصادر البيانات
              </button>
            </div>

            <div className="p-4 border border-gray-200 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">2. تخصيص الشات بوت</h3>
              <p className="text-gray-900 text-sm mb-3">غير رسالة الترحيب والألوان حسب علامتك التجارية</p>
              <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm">
                تخصيص الشات بوت
              </button>
            </div>

            <div className="p-4 border border-gray-200 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">3. اختبار الشات بوت</h3>
              <p className="text-gray-900 text-sm mb-3">جرب الشات بوت للتأكد من عمله بالشكل المطلوب</p>
              <a
                href={`${window.location.origin}/chat/${stats.merchant.chatbotId}`}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-block px-4 py-2 rounded text-sm ${
                  stats.systemStatus === 'limit_reached'
                    ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                    : 'bg-purple-600 text-white hover:bg-purple-700'
                }`}
                onClick={stats.systemStatus === 'limit_reached' ? (e) => e.preventDefault() : undefined}
              >
                {stats.systemStatus === 'limit_reached' ? 'غير متاح - الحد مستنفد' : 'اختبار الآن'}
              </a>
            </div>

            <div className="p-4 border border-gray-200 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">4. مشاركة الرابط</h3>
              <p className="text-gray-900 text-sm mb-3">ضع الرابط في بايو Instagram، TikTok، وبقية حساباتك</p>
              <button
                onClick={() => navigator.clipboard.writeText(`${window.location.origin}/chat/${stats.merchant.chatbotId}`)}
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
                  <dt className="text-sm text-gray-900">البريد الإلكتروني:</dt>
                  <dd className="text-sm font-medium text-gray-900">{stats.merchant.email}</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-900">اسم المتجر:</dt>
                  <dd className="text-sm font-medium text-gray-900">{stats.merchant.businessName}</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-900">معرف الشات بوت:</dt>
                  <dd className="text-sm font-medium text-gray-900">{stats.merchant.chatbotId}</dd>
                </div>
              </dl>
            </div>
            
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">تفاصيل الاشتراك</h3>
              <dl className="space-y-2">
                <div>
                  <dt className="text-sm text-gray-900">النوع:</dt>
                  <dd className="text-sm font-medium text-gray-900">{stats.subscription.plan}</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-900">الحالة:</dt>
                  <dd className="text-sm font-medium text-gray-900">
                    {stats.subscription.status === 'TRIAL' ? 'فترة تجريبية' : 'نشط'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-900">الحد الشهري:</dt>
                  <dd className="text-sm font-medium text-gray-900">{stats.subscription.messagesLimit.toLocaleString()} رسالة</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-900">آخر تحديث:</dt>
                  <dd className="text-sm font-medium text-gray-900">
                    {new Date(stats.subscription.updatedAt).toLocaleDateString('ar-SA')}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
} 