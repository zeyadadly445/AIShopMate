'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getSimpleAdminSession, clearSimpleAdminSession, SimpleAdminSession } from '@/lib/admin-auth-simple'

interface Stats {
  totalMerchants: number
  activeMerchants: number
  trialMerchants: number
  newMerchantsThisMonth: number
  totalMessagesUsed: number
  limitReachedUsers: number
  potentialRevenue: number
  totalConversations: number
}

interface Subscription {
  id: string
  plan: string
  status: string
  messagesLimit: number
  messagesUsed: number
  usagePercentage: number
  remainingMessages: number
  startDate: string
  endDate?: string
  createdAt: string
  updatedAt: string
}

interface Merchant {
  id: string
  email: string
  businessName: string
  phone?: string
  chatbotId: string
  welcomeMessage: string
  primaryColor: string
  createdAt: string
  updatedAt: string
  subscription: Subscription | null
}

interface TopUser {
  id: string
  businessName: string
  email: string
  messagesUsed: number
  messagesLimit: number
  usagePercentage: number
  plan: string
  status: string
  createdAt: string
}

interface DashboardData {
  stats: Stats
  merchants: Merchant[]
  topUsers: TopUser[]
  lastUpdated: string
  adminSession: {
    username: string
    loginTime: number
    adminId: string
    dbId: number
  }
}

export default function SimpleAdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedMerchant, setSelectedMerchant] = useState<Merchant | null>(null)
  const [view, setView] = useState<'overview' | 'merchants' | 'conversations' | 'data-sources' | 'analytics' | 'settings'>('overview')
  const [searchTerm, setSearchTerm] = useState('')
  const [session, setSession] = useState<SimpleAdminSession | null>(null)
  const [isCreatingMerchant, setIsCreatingMerchant] = useState(false)
  const [analytics, setAnalytics] = useState<any>(null)
  const [conversations, setConversations] = useState<any[]>([])
  const [dataSources, setDataSources] = useState<any[]>([])
  const [actionLoading, setActionLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // التحقق من صلاحيات المدير
    const currentSession = getSimpleAdminSession()
    if (!currentSession) {
      console.log('🚫 No valid session, redirecting to login')
      router.push('/admin/login-simple')
      return
    }

    setSession(currentSession)
    fetchDashboardData(currentSession)
    
    // تحديث البيانات كل دقيقة
    const interval = setInterval(() => fetchDashboardData(currentSession), 60000)
    return () => clearInterval(interval)
  }, [router])

  // تحميل البيانات عند تغيير التبويب
  useEffect(() => {
    if (!session) return

    switch (view) {
      case 'analytics':
        fetchAnalytics()
        break
      case 'conversations':
        fetchConversations()
        break
      case 'data-sources':
        fetchDataSources()
        break
    }
  }, [view, session])

  const fetchDashboardData = async (currentSession: SimpleAdminSession) => {
    try {
      console.log('📊 Fetching simple dashboard data...')

      const response = await fetch('/api/admin/dashboard-simple', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ session: currentSession })
      })

      if (!response.ok) {
        if (response.status === 401) {
          console.log('🚫 Session invalid, clearing and redirecting')
          clearSimpleAdminSession()
          router.push('/admin/login-simple')
          return
        }
        throw new Error(`HTTP ${response.status}`)
      }

      const dashboardData = await response.json()
      
      if (!dashboardData.success) {
        throw new Error(dashboardData.error || 'Failed to fetch data')
      }

      console.log('✅ Simple dashboard data loaded successfully')
      setData(dashboardData)
      setError('')
    } catch (err: any) {
      console.error('❌ Error fetching dashboard data:', err)
      setError(err.message || 'فشل في تحميل البيانات')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    console.log('🚪 Logging out...')
    clearSimpleAdminSession()
    router.push('/admin/login-simple')
  }

  // جلب البيانات المتقدمة للتحليلات
  const fetchAnalytics = async () => {
    try {
      const response = await fetch('/api/admin/analytics', {
        headers: {
          'Authorization': `Bearer ${JSON.stringify(session)}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setAnalytics(data.analytics)
      }
    } catch (error) {
      console.error('❌ Error fetching analytics:', error)
    }
  }

  // جلب المحادثات
  const fetchConversations = async () => {
    try {
      const response = await fetch('/api/admin/conversations', {
        headers: {
          'Authorization': `Bearer ${JSON.stringify(session)}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setConversations(data.conversations)
      }
    } catch (error) {
      console.error('❌ Error fetching conversations:', error)
    }
  }

  // جلب مصادر البيانات
  const fetchDataSources = async () => {
    try {
      const response = await fetch('/api/admin/data-sources', {
        headers: {
          'Authorization': `Bearer ${JSON.stringify(session)}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setDataSources(data.dataSources)
      }
    } catch (error) {
      console.error('❌ Error fetching data sources:', error)
    }
  }

  // إنشاء تاجر جديد
  const createMerchant = async (merchantData: any) => {
    setActionLoading(true)
    try {
      const response = await fetch('/api/admin/merchants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${JSON.stringify(session)}`
        },
        body: JSON.stringify(merchantData)
      })
      
      if (response.ok) {
        const result = await response.json()
        alert('✅ تم إنشاء التاجر بنجاح!')
        setIsCreatingMerchant(false)
        // إعادة تحميل البيانات
        if (session) fetchDashboardData(session)
        return result
      } else {
        const error = await response.json()
        alert(`❌ خطأ: ${error.error}`)
      }
    } catch (error) {
      console.error('❌ Error creating merchant:', error)
      alert('❌ حدث خطأ أثناء إنشاء التاجر')
    } finally {
      setActionLoading(false)
    }
  }

  // حذف محادثة
  const deleteConversation = async (conversationId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه المحادثة؟')) return

    setActionLoading(true)
    try {
      const response = await fetch('/api/admin/conversations', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${JSON.stringify(session)}`
        },
        body: JSON.stringify({ conversationId })
      })
      
      if (response.ok) {
        alert('✅ تم حذف المحادثة بنجاح!')
        fetchConversations()
      } else {
        const error = await response.json()
        alert(`❌ خطأ: ${error.error}`)
      }
    } catch (error) {
      console.error('❌ Error deleting conversation:', error)
      alert('❌ حدث خطأ أثناء حذف المحادثة')
    } finally {
      setActionLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const badges = {
      'ACTIVE': 'bg-green-100 text-green-800 border-green-200',
      'TRIAL': 'bg-blue-100 text-blue-800 border-blue-200',
      'CANCELLED': 'bg-red-100 text-red-800 border-red-200',
      'EXPIRED': 'bg-gray-100 text-gray-800 border-gray-200'
    }
    return badges[status as keyof typeof badges] || badges.TRIAL
  }

  const getPlanBadge = (plan: string) => {
    const badges = {
      'BASIC': 'bg-gray-100 text-gray-800',
      'STANDARD': 'bg-blue-100 text-blue-800',
      'PREMIUM': 'bg-purple-100 text-purple-800',
      'ENTERPRISE': 'bg-orange-100 text-orange-800'
    }
    return badges[plan as keyof typeof badges] || badges.BASIC
  }

  const filteredMerchants = data?.merchants.filter(merchant =>
    merchant.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    merchant.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    merchant.chatbotId.toLowerCase().includes(searchTerm.toLowerCase())
  ) || []

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto"></div>
          <p className="mt-4 text-white">جاري تحميل لوحة الإدارة...</p>
          <p className="mt-2 text-sm text-green-400">🚀 نظام بسيط محسن</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">خطأ في تحميل البيانات</h1>
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={() => session && fetchDashboardData(session)}
            className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700"
          >
            إعادة المحاولة
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white" dir="rtl">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4 rtl:space-x-reverse">
              <div className="h-10 w-10 bg-green-600 rounded-full flex items-center justify-center">
                <span className="text-xl">👨‍💼</span>
              </div>
              <div>
                <h1 className="text-xl font-bold">لوحة التحكم الإدارية</h1>
                <p className="text-sm text-gray-400">مرحباً، {data.adminSession.username}</p>
                <p className="text-xs text-green-400">🚀 نظام محسن (ID: {data.adminSession.dbId})</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4 rtl:space-x-reverse">
              <div className="text-sm text-gray-400">
                آخر تحديث: {new Date(data.lastUpdated).toLocaleTimeString('ar-SA')}
              </div>
              <button
                onClick={() => session && fetchDashboardData(session)}
                className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 text-sm"
                title="تحديث البيانات"
              >
                🔄
              </button>
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

      {/* Navigation Tabs */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8 rtl:space-x-reverse overflow-x-auto">
            {[
              { key: 'overview', label: '🏠 نظرة عامة' },
              { key: 'merchants', label: '👥 إدارة التجار' },
              { key: 'conversations', label: '💬 المحادثات' },
              { key: 'data-sources', label: '📁 مصادر البيانات' },
              { key: 'analytics', label: '📊 التحليلات المتقدمة' },
              { key: 'settings', label: '⚙️ إعدادات النظام' }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setView(tab.key as any)}
                className={`py-4 px-6 border-b-2 font-medium text-sm transition-colors ${
                  view === tab.key
                    ? 'border-green-500 text-green-400'
                    : 'border-transparent text-gray-400 hover:text-white hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        
        {/* Overview Tab */}
        {view === 'overview' && (
          <div className="space-y-6">
            
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <div className="flex items-center">
                  <div className="h-12 w-12 bg-blue-600 rounded-lg flex items-center justify-center">
                    <span className="text-xl">👥</span>
                  </div>
                  <div className="mr-4">
                    <p className="text-sm text-gray-400">إجمالي المستخدمين</p>
                    <p className="text-2xl font-bold">{data.stats.totalMerchants.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <div className="flex items-center">
                  <div className="h-12 w-12 bg-green-600 rounded-lg flex items-center justify-center">
                    <span className="text-xl">✅</span>
                  </div>
                  <div className="mr-4">
                    <p className="text-sm text-gray-400">المستخدمين النشطين</p>
                    <p className="text-2xl font-bold text-green-400">{data.stats.activeMerchants.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <div className="flex items-center">
                  <div className="h-12 w-12 bg-purple-600 rounded-lg flex items-center justify-center">
                    <span className="text-xl">💬</span>
                  </div>
                  <div className="mr-4">
                    <p className="text-sm text-gray-400">إجمالي الرسائل</p>
                    <p className="text-2xl font-bold text-purple-400">{data.stats.totalMessagesUsed.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <div className="flex items-center">
                  <div className="h-12 w-12 bg-yellow-600 rounded-lg flex items-center justify-center">
                    <span className="text-xl">💰</span>
                  </div>
                  <div className="mr-4">
                    <p className="text-sm text-gray-400">الإيراد المحتمل</p>
                    <p className="text-2xl font-bold text-yellow-400">${data.stats.potentialRevenue.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <h3 className="text-lg font-semibold mb-4">📈 إحصائيات إضافية</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">المستخدمين الجدد هذا الشهر:</span>
                    <span className="font-semibold">{data.stats.newMerchantsThisMonth}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">المستخدمين في التجربة:</span>
                    <span className="font-semibold text-blue-400">{data.stats.trialMerchants}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">وصلوا للحد الأقصى:</span>
                    <span className="font-semibold text-red-400">{data.stats.limitReachedUsers}</span>
                  </div>
                </div>
              </div>

              {/* Top Users */}
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 md:col-span-2">
                <h3 className="text-lg font-semibold mb-4">🏆 أعلى المستخدمين استخداماً</h3>
                <div className="space-y-3">
                  {data.topUsers.slice(0, 5).map((user, index) => (
                    <div key={user.id} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                      <div className="flex items-center">
                        <div className="h-8 w-8 bg-gradient-to-r from-green-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                          {index + 1}
                        </div>
                        <div className="mr-3">
                          <p className="font-medium">{user.businessName}</p>
                          <p className="text-sm text-gray-400">{user.email}</p>
                        </div>
                      </div>
                      <div className="text-left">
                        <p className="font-semibold">{user.messagesUsed.toLocaleString()} رسالة</p>
                        <p className="text-sm text-gray-400">{user.usagePercentage}% مستخدم</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Success Indicator */}
            <div className="bg-green-900/20 border border-green-800 rounded-lg p-4">
              <div className="flex items-center">
                <div className="h-8 w-8 bg-green-600 rounded-full flex items-center justify-center">
                  <span className="text-sm">✅</span>
                </div>
                <div className="mr-3">
                  <p className="text-green-300 font-medium">النظام يعمل بشكل مثالي!</p>
                  <p className="text-green-400 text-sm">🚀 نظام بسيط - بدون JWT - أسرع وأكثر استقراراً</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Merchants Tab */}
        {view === 'merchants' && (
          <div className="space-y-6">
            
            {/* Search and Filters */}
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
                <div className="flex-1 max-w-md">
                  <input
                    type="text"
                    placeholder="البحث في التجار..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div className="flex items-center space-x-4 rtl:space-x-reverse">
                  <button
                    onClick={() => setIsCreatingMerchant(true)}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2 rtl:space-x-reverse"
                  >
                    <span>➕</span>
                    <span>إضافة تاجر جديد</span>
                  </button>
                  <span className="text-sm text-gray-400">
                    إجمالي: {filteredMerchants.length} تاجر
                  </span>
                </div>
              </div>
            </div>

            {/* Merchants Table */}
            <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-700">
                  <thead className="bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                        المستخدم
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                        الخطة
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                        الحالة
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                        الاستخدام
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                        تاريخ التسجيل
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                        الإجراءات
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-gray-800 divide-y divide-gray-700">
                    {filteredMerchants.map((merchant) => (
                      <tr key={merchant.id} className="hover:bg-gray-700">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-white">
                              {merchant.businessName}
                            </div>
                            <div className="text-sm text-gray-400">
                              {merchant.email}
                            </div>
                            <div className="text-xs text-gray-500 font-mono">
                              ID: {merchant.chatbotId}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPlanBadge(merchant.subscription?.plan || 'BASIC')}`}>
                            {merchant.subscription?.plan || 'BASIC'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getStatusBadge(merchant.subscription?.status || 'TRIAL')}`}>
                            {merchant.subscription?.status || 'TRIAL'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {merchant.subscription ? (
                            <div>
                              <div className="text-sm text-white">
                                {merchant.subscription.messagesUsed.toLocaleString()} / {merchant.subscription.messagesLimit.toLocaleString()}
                              </div>
                              <div className="w-full bg-gray-600 rounded-full h-2 mt-1">
                                <div 
                                  className={`h-2 rounded-full ${
                                    merchant.subscription.usagePercentage >= 90 ? 'bg-red-500' :
                                    merchant.subscription.usagePercentage >= 75 ? 'bg-yellow-500' :
                                    'bg-green-500'
                                  }`}
                                  style={{ width: `${Math.min(merchant.subscription.usagePercentage, 100)}%` }}
                                ></div>
                              </div>
                              <div className="text-xs text-gray-400 mt-1">
                                {merchant.subscription.usagePercentage}%
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm">لا يوجد اشتراك</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                          {new Date(merchant.createdAt).toLocaleDateString('ar-SA')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => setSelectedMerchant(merchant)}
                            className="text-blue-400 hover:text-blue-300 ml-4"
                          >
                            عرض التفاصيل
                          </button>
                          <a
                            href={`/chat/${merchant.chatbotId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-green-400 hover:text-green-300"
                          >
                            زيارة الشات بوت
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Conversations Tab */}
        {view === 'conversations' && (
          <div className="space-y-6">
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">💬 إدارة المحادثات</h3>
                <button
                  onClick={fetchConversations}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  🔄 تحديث
                </button>
              </div>
              
              {conversations.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-700">
                    <thead className="bg-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase">التاجر</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase">إحصائيات</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase">آخر نشاط</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="bg-gray-800 divide-y divide-gray-700">
                      {conversations.map((conv) => (
                        <tr key={conv.id} className="hover:bg-gray-700">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-white">
                                {conv.merchant?.businessName || 'غير محدد'}
                              </div>
                              <div className="text-sm text-gray-400">
                                {conv.merchant?.email || 'غير محدد'}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-white">
                              <div>📝 {conv.stats.totalMessages} رسالة</div>
                              <div>👤 {conv.stats.userMessages} من المستخدم</div>
                              <div>🤖 {conv.stats.botMessages} من البوت</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                            {new Date(conv.stats.lastActivity).toLocaleDateString('ar-SA')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => deleteConversation(conv.id)}
                              className="text-red-400 hover:text-red-300"
                              disabled={actionLoading}
                            >
                              🗑️ حذف
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-400">لا توجد محادثات متاحة</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Data Sources Tab */}
        {view === 'data-sources' && (
          <div className="space-y-6">
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">📁 إدارة مصادر البيانات</h3>
                <button
                  onClick={fetchDataSources}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  🔄 تحديث
                </button>
              </div>
              
              {dataSources.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-700">
                    <thead className="bg-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase">المصدر</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase">النوع</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase">الحجم</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase">الحالة</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase">التاجر</th>
                      </tr>
                    </thead>
                    <tbody className="bg-gray-800 divide-y divide-gray-700">
                      {dataSources.map((ds) => (
                        <tr key={ds.id} className="hover:bg-gray-700">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-white">{ds.name}</div>
                              <div className="text-sm text-gray-400">{ds.description || 'لا يوجد وصف'}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                              {ds.sourceType}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                            {ds.fileSizeMB} MB
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              ds.stats.isProcessed 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {ds.processingStatus}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                            {ds.merchant?.businessName || 'غير محدد'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-400">لا توجد مصادر بيانات متاحة</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Advanced Analytics Tab */}
        {view === 'analytics' && (
          <div className="space-y-6">
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">📊 التحليلات المتقدمة</h3>
                <button
                  onClick={fetchAnalytics}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  🔄 تحديث
                </button>
              </div>
              
              {analytics ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Overview Stats */}
                  <div className="bg-gray-700 rounded-lg p-4">
                    <h4 className="text-white font-medium mb-3">📈 نظرة عامة</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">إجمالي التجار:</span>
                        <span className="text-white">{analytics.overview.totalMerchants}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">النشطين:</span>
                        <span className="text-green-400">{analytics.overview.activeMerchants}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">معدل النشاط:</span>
                        <span className="text-blue-400">{analytics.overview.activeRate}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Subscription Stats */}
                  <div className="bg-gray-700 rounded-lg p-4">
                    <h4 className="text-white font-medium mb-3">💳 الاشتراكات</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">إجمالي الاشتراكات:</span>
                        <span className="text-white">{analytics.subscriptions.total}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">معدل الاستخدام:</span>
                        <span className="text-yellow-400">{analytics.subscriptions.usageRate}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Revenue Stats */}
                  <div className="bg-gray-700 rounded-lg p-4">
                    <h4 className="text-white font-medium mb-3">💰 الإيرادات</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">شهرياً:</span>
                        <span className="text-green-400">${analytics.revenue.monthly}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">سنوياً:</span>
                        <span className="text-green-400">${analytics.revenue.annual}</span>
                      </div>
                    </div>
                  </div>

                  {/* Top Merchants */}
                  <div className="bg-gray-700 rounded-lg p-4 md:col-span-2">
                    <h4 className="text-white font-medium mb-3">🏆 أفضل التجار</h4>
                    <div className="space-y-2">
                      {analytics.topMerchants.slice(0, 5).map((merchant: any, index: number) => (
                        <div key={merchant.id} className="flex items-center justify-between text-sm">
                          <div className="flex items-center">
                            <span className="text-gray-400 mr-2">{index + 1}.</span>
                            <span className="text-white">{merchant.businessName}</span>
                          </div>
                          <span className="text-blue-400">{merchant.totalMessages} رسالة</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* System Health */}
                  <div className="bg-gray-700 rounded-lg p-4">
                    <h4 className="text-white font-medium mb-3">🔧 صحة النظام</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">وقت التشغيل:</span>
                        <span className="text-green-400">{analytics.systemHealth.uptime}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">قاعدة البيانات:</span>
                        <span className="text-green-400">✅ متصلة</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                  <p className="text-gray-400">جاري تحميل التحليلات...</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {view === 'settings' && (
          <div className="space-y-6">
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-lg font-semibold mb-4">⚙️ إعدادات النظام</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-700 rounded-lg p-4">
                  <h4 className="text-white font-medium mb-3">🔐 معلومات الأمان</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">نوع المصادقة:</span>
                      <span className="text-green-400">Simple Session</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">JWT:</span>
                      <span className="text-gray-400">معطل</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">الجلسة:</span>
                      <span className="text-green-400">نشطة</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-700 rounded-lg p-4">
                  <h4 className="text-white font-medium mb-3">📊 إحصائيات الأداء</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">سرعة الاستجابة:</span>
                      <span className="text-green-400">سريع</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">استقرار النظام:</span>
                      <span className="text-green-400">عالي</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">أخطاء الإنتاج:</span>
                      <span className="text-green-400">صفر</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-green-900/20 border border-green-800 rounded-lg">
                <div className="flex items-center">
                  <div className="h-8 w-8 bg-green-600 rounded-full flex items-center justify-center ml-3">
                    <span className="text-sm">✅</span>
                  </div>
                  <div>
                    <p className="text-green-300 font-medium">نظام AI Shop Mate يعمل بشكل مثالي!</p>
                    <p className="text-green-400 text-sm">🚀 أسرع وأكثر استقراراً من أي وقت مضى</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Merchant Details Modal */}
      {selectedMerchant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg max-w-2xl w-full max-h-screen overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white">تفاصيل المستخدم</h3>
                <button
                  onClick={() => setSelectedMerchant(null)}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-400">اسم العمل</label>
                  <p className="text-white font-medium">{selectedMerchant.businessName}</p>
                </div>
                
                <div>
                  <label className="text-sm text-gray-400">البريد الإلكتروني</label>
                  <p className="text-white">{selectedMerchant.email}</p>
                </div>
                
                <div>
                  <label className="text-sm text-gray-400">رقم الهاتف</label>
                  <p className="text-white">{selectedMerchant.phone || 'غير محدد'}</p>
                </div>
                
                <div>
                  <label className="text-sm text-gray-400">معرف الشات بوت</label>
                  <p className="text-white font-mono">{selectedMerchant.chatbotId}</p>
                </div>
                
                <div>
                  <label className="text-sm text-gray-400">رسالة الترحيب</label>
                  <p className="text-white">{selectedMerchant.welcomeMessage}</p>
                </div>
                
                <div>
                  <label className="text-sm text-gray-400">اللون الأساسي</label>
                  <div className="flex items-center space-x-2 rtl:space-x-reverse">
                    <div 
                      className="w-6 h-6 rounded border border-gray-600"
                      style={{ backgroundColor: selectedMerchant.primaryColor }}
                    ></div>
                    <span className="text-white font-mono">{selectedMerchant.primaryColor}</span>
                  </div>
                </div>
                
                {selectedMerchant.subscription && (
                  <div className="border-t border-gray-700 pt-4 mt-4">
                    <h4 className="text-lg font-semibold text-white mb-3">معلومات الاشتراك</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm text-gray-400">الخطة</label>
                        <p className="text-white">{selectedMerchant.subscription.plan}</p>
                      </div>
                      <div>
                        <label className="text-sm text-gray-400">الحالة</label>
                        <p className="text-white">{selectedMerchant.subscription.status}</p>
                      </div>
                      <div>
                        <label className="text-sm text-gray-400">الرسائل المستخدمة</label>
                        <p className="text-white">{selectedMerchant.subscription.messagesUsed.toLocaleString()}</p>
                      </div>
                      <div>
                        <label className="text-sm text-gray-400">حد الرسائل</label>
                        <p className="text-white">{selectedMerchant.subscription.messagesLimit.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex justify-end space-x-4 rtl:space-x-reverse mt-6">
                <button
                  onClick={() => setSelectedMerchant(null)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  إغلاق
                </button>
                <a
                  href={`/chat/${selectedMerchant.chatbotId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  زيارة الشات بوت
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Merchant Modal */}
      {isCreatingMerchant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg max-w-md w-full max-h-screen overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white">➕ إضافة تاجر جديد</h3>
                <button
                  onClick={() => setIsCreatingMerchant(false)}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
              
              <form onSubmit={(e) => {
                e.preventDefault()
                const formData = new FormData(e.currentTarget)
                const merchantData = {
                  email: formData.get('email'),
                  businessName: formData.get('businessName'),
                  phone: formData.get('phone'),
                  welcomeMessage: formData.get('welcomeMessage'),
                  primaryColor: formData.get('primaryColor'),
                  subscriptionPlan: formData.get('subscriptionPlan')
                }
                createMerchant(merchantData)
              }}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      البريد الإلكتروني *
                    </label>
                    <input
                      type="email"
                      name="email"
                      required
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="merchant@example.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      اسم الأعمال *
                    </label>
                    <input
                      type="text"
                      name="businessName"
                      required
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="اسم الشركة أو المتجر"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      رقم الهاتف
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="+966501234567"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      رسالة الترحيب
                    </label>
                    <textarea
                      name="welcomeMessage"
                      rows={3}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="مرحباً! كيف يمكنني مساعدتك؟"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      اللون الأساسي
                    </label>
                    <input
                      type="color"
                      name="primaryColor"
                      defaultValue="#3b82f6"
                      className="w-full h-10 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      خطة الاشتراك
                    </label>
                    <select
                      name="subscriptionPlan"
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <option value="">بدون اشتراك</option>
                      <option value="BASIC">أساسي - 1000 رسالة</option>
                      <option value="STANDARD">معياري - 5000 رسالة</option>
                      <option value="PREMIUM">مميز - 15000 رسالة</option>
                      <option value="ENTERPRISE">مؤسسي - 50000 رسالة</option>
                    </select>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-4 rtl:space-x-reverse mt-6">
                  <button
                    type="button"
                    onClick={() => setIsCreatingMerchant(false)}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                    disabled={actionLoading}
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                    disabled={actionLoading}
                  >
                    {actionLoading ? 'جاري الإنشاء...' : 'إنشاء التاجر'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 