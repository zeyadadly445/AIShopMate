'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

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
  const [merchantId, setMerchantId] = useState<string | null>(null)
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

    // Get merchant ID from localStorage
    const merchantData = localStorage.getItem('merchantData')
    if (!merchantData) {
      router.push('/auth/login')
      return
    }

    const merchant = JSON.parse(merchantData)
    setMerchantId(merchant.id)

    // Load initial stats
    fetchStats().finally(() => setLoading(false))
    
    // Setup real-time subscription for subscription changes
    console.log('🔄 Setting up real-time subscription for merchant:', merchant.id)
    
    const subscriptionChannel = supabase
      .channel('subscription-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all changes (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'Subscription',
          filter: `merchantId=eq.${merchant.id}`
        },
        (payload) => {
          console.log('🔄 Real-time update received:', payload)
          // Refetch stats when subscription changes
          fetchStats()
        }
      )
      .subscribe((status) => {
        console.log('📡 Subscription status:', status)
        if (status === 'SUBSCRIBED') {
          console.log('✅ Real-time subscription established successfully')
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.log('❌ Real-time subscription failed')
        }
      })

    // Setup real-time subscription for merchant changes
    const merchantChannel = supabase
      .channel('merchant-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public', 
          table: 'Merchant',
          filter: `id=eq.${merchant.id}`
        },
        (payload) => {
          console.log('🔄 Merchant real-time update received:', payload)
          // Refetch stats when merchant data changes
          fetchStats()
        }
      )
      .subscribe()

    // Setup real-time subscription for new messages (to update messagesUsed counter)
    const messagesChannel = supabase
      .channel('messages-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'Message'
        },
        (payload) => {
          console.log('💬 New message detected:', payload)
          // Refetch stats when new messages are added to update usage counter
          fetchStats()
        }
      )
      .subscribe()

    // Cleanup function
    return () => {
      console.log('🔌 Unsubscribing from real-time channels')
      supabase.removeChannel(subscriptionChannel)
      supabase.removeChannel(merchantChannel)
      supabase.removeChannel(messagesChannel)
    }
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

        {/* Usage Monitor - Special Large Card */}
        <div className="bg-white shadow-lg rounded-lg p-6 mb-8 border-l-4 border-blue-500">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              📊 مراقب الاستهلاك المباشر
              <span className="mr-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-1 animate-pulse"></div>
                Live
              </span>
            </h2>
            <div className="text-right">
              <div className="text-sm text-gray-600">آخر تحديث</div>
              <div className="text-xs text-gray-500">{new Date().toLocaleTimeString('ar-SA')}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Usage Progress */}
            <div className="col-span-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">استهلاك الرسائل</span>
                <span className={`text-sm font-bold ${
                  stats.subscription.usagePercentage >= 90 ? 'text-red-600' :
                  stats.subscription.usagePercentage >= 75 ? 'text-yellow-600' : 'text-green-600'
                }`}>
                  {stats.subscription.usagePercentage}%
                </span>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-4 mb-2">
                <div 
                  className={`h-4 rounded-full transition-all duration-500 ${
                    stats.subscription.usagePercentage >= 90 ? 'bg-gradient-to-r from-red-500 to-red-600' :
                    stats.subscription.usagePercentage >= 75 ? 'bg-gradient-to-r from-yellow-500 to-yellow-600' :
                    stats.subscription.usagePercentage >= 50 ? 'bg-gradient-to-r from-blue-500 to-blue-600' :
                    'bg-gradient-to-r from-green-500 to-green-600'
                  }`}
                  style={{ width: `${Math.min(stats.subscription.usagePercentage, 100)}%` }}
                ></div>
              </div>

              <div className="flex justify-between text-xs text-gray-600">
                <span>{stats.subscription.messagesUsed.toLocaleString()} مستخدم</span>
                <span>{stats.subscription.remainingMessages.toLocaleString()} متبقي</span>
                <span>{stats.subscription.messagesLimit.toLocaleString()} إجمالي</span>
              </div>
            </div>

            {/* Status Indicator */}
            <div className="flex flex-col items-center justify-center bg-gray-50 rounded-lg p-4">
              {stats.subscription.usagePercentage >= 100 ? (
                <>
                  <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mb-2 animate-pulse">
                    <span className="text-white text-2xl">🚫</span>
                  </div>
                  <span className="text-red-600 font-bold text-sm">تم الوصول للحد</span>
                  <span className="text-red-500 text-xs">الخدمة متوقفة</span>
                </>
              ) : stats.subscription.usagePercentage >= 90 ? (
                <>
                  <div className="w-16 h-16 bg-red-400 rounded-full flex items-center justify-center mb-2 animate-bounce">
                    <span className="text-white text-2xl">⚠️</span>
                  </div>
                  <span className="text-red-600 font-bold text-sm">تحذير عالي</span>
                  <span className="text-red-500 text-xs">قارب الانتهاء</span>
                </>
              ) : stats.subscription.usagePercentage >= 75 ? (
                <>
                  <div className="w-16 h-16 bg-yellow-400 rounded-full flex items-center justify-center mb-2">
                    <span className="text-white text-2xl">⚡</span>
                  </div>
                  <span className="text-yellow-600 font-bold text-sm">تحذير متوسط</span>
                  <span className="text-yellow-500 text-xs">راقب الاستهلاك</span>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mb-2">
                    <span className="text-white text-2xl">✅</span>
                  </div>
                  <span className="text-green-600 font-bold text-sm">حالة ممتازة</span>
                  <span className="text-green-500 text-xs">استخدام طبيعي</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          
          {/* Messages Usage Card */}
          <div className={`bg-white overflow-hidden shadow rounded-lg border-l-4 ${
            stats.subscription.usagePercentage >= 90 ? 'border-red-500' :
            stats.subscription.usagePercentage >= 75 ? 'border-yellow-500' : 'border-green-500'
          }`}>
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    stats.subscription.usagePercentage >= 90 ? 'bg-red-500' :
                    stats.subscription.usagePercentage >= 75 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}>
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
              
              {/* Quick Status */}
              <div className="mt-3 text-center">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  stats.subscription.usagePercentage >= 90 ? 'bg-red-100 text-red-800' :
                  stats.subscription.usagePercentage >= 75 ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {stats.subscription.usagePercentage >= 90 ? '🚨 حرج' :
                   stats.subscription.usagePercentage >= 75 ? '⚠️ تحذير' : '✅ آمن'}
                </span>
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

        {/* Real-time Usage Analytics */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">📈 تحليلات الاستخدام المفصلة</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Daily Usage Estimate */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">📅 تقدير الاستهلاك اليومي</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-blue-700">المعدل اليومي:</span>
                  <span className="text-sm font-bold text-blue-900">
                    {Math.round(stats.subscription.messagesUsed / Math.max(1, Math.ceil((new Date().getTime() - new Date(stats.subscription.createdAt).getTime()) / (1000 * 60 * 60 * 24))))} رسالة/يوم
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-blue-700">أيام متبقية بالمعدل الحالي:</span>
                  <span className="text-sm font-bold text-blue-900">
                    {stats.subscription.messagesUsed > 0 ? 
                      Math.floor(stats.subscription.remainingMessages / Math.max(1, Math.round(stats.subscription.messagesUsed / Math.max(1, Math.ceil((new Date().getTime() - new Date(stats.subscription.createdAt).getTime()) / (1000 * 60 * 60 * 24)))))) :
                      '∞'
                    } يوم
                  </span>
                </div>
              </div>
            </div>

            {/* Usage Efficiency */}
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="font-semibold text-green-900 mb-2">🎯 كفاءة الاستخدام</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-green-700">درجة الكفاءة:</span>
                  <span className={`text-sm font-bold ${
                    stats.subscription.usagePercentage <= 50 ? 'text-green-900' :
                    stats.subscription.usagePercentage <= 75 ? 'text-yellow-700' : 'text-red-700'
                  }`}>
                    {stats.subscription.usagePercentage <= 50 ? 'ممتازة' :
                     stats.subscription.usagePercentage <= 75 ? 'جيدة' : 'تحتاج مراقبة'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-green-700">توصية:</span>
                  <span className="text-xs text-green-900">
                    {stats.subscription.usagePercentage <= 50 ? 'استخدم أكثر' :
                     stats.subscription.usagePercentage <= 75 ? 'استخدام مثالي' : 'راقب الاستهلاك'}
                  </span>
                </div>
              </div>
            </div>

            {/* System Health */}
            <div className="bg-purple-50 p-4 rounded-lg">
              <h3 className="font-semibold text-purple-900 mb-2">🔧 صحة النظام</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-purple-700">حالة الخدمة:</span>
                  <span className={`text-sm font-bold ${
                    stats.systemStatus === 'limit_reached' ? 'text-red-700' : 'text-green-700'
                  }`}>
                    {stats.systemStatus === 'limit_reached' ? '🚫 متوقف' : '✅ نشط'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-purple-700">آخر نشاط:</span>
                  <span className="text-xs text-purple-900">منذ دقائق</span>
                </div>
              </div>
            </div>
          </div>

          {/* Usage Timeline Prediction */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-3">📊 توقعات الاستهلاك</h3>
            <div className="space-y-3">
              {[
                { period: 'أسبوع', usage: Math.min(100, stats.subscription.usagePercentage + (stats.subscription.usagePercentage * 0.1)), days: 7 },
                { period: 'أسبوعين', usage: Math.min(100, stats.subscription.usagePercentage + (stats.subscription.usagePercentage * 0.25)), days: 14 },
                { period: 'شهر', usage: Math.min(100, stats.subscription.usagePercentage + (stats.subscription.usagePercentage * 0.5)), days: 30 }
              ].map((prediction, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">خلال {prediction.period}:</span>
                  <div className="flex items-center space-x-2 rtl:space-x-reverse">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          prediction.usage >= 90 ? 'bg-red-500' :
                          prediction.usage >= 75 ? 'bg-yellow-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(prediction.usage, 100)}%` }}
                      ></div>
                    </div>
                    <span className={`text-xs font-medium ${
                      prediction.usage >= 90 ? 'text-red-600' :
                      prediction.usage >= 75 ? 'text-yellow-600' : 'text-green-600'
                    }`}>
                      {Math.round(prediction.usage)}%
                    </span>
                  </div>
                </div>
              ))}
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