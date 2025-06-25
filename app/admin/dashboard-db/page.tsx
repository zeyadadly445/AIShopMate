'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getAdminSession, clearAdminSession } from '@/lib/admin-auth-db'

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

export default function AdminDashboardDbPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedMerchant, setSelectedMerchant] = useState<Merchant | null>(null)
  const [view, setView] = useState<'overview' | 'merchants' | 'analytics'>('overview')
  const [searchTerm, setSearchTerm] = useState('')
  const router = useRouter()

  useEffect(() => {
    // التحقق من صلاحيات المدير
    const session = getAdminSession()
    if (!session) {
      router.push('/admin/login-db')
      return
    }

    fetchDashboardData()
    
    // تحديث البيانات كل دقيقة
    const interval = setInterval(fetchDashboardData, 60000)
    return () => clearInterval(interval)
  }, [router])

  const fetchDashboardData = async () => {
    try {
      const session = getAdminSession()
      if (!session) {
        router.push('/admin/login-db')
        return
      }

      console.log('🔍 Fetching database admin dashboard data...')

      const response = await fetch('/api/admin/dashboard-db', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        }
      })

      if (!response.ok) {
        if (response.status === 403) {
          clearAdminSession()
          router.push('/admin/login-db')
          return
        }
        throw new Error(`HTTP ${response.status}`)
      }

      const dashboardData = await response.json()
      console.log('✅ Database dashboard data loaded successfully')
      setData(dashboardData)
      setError('')
    } catch (err) {
      console.error('خطأ في جلب بيانات لوحة الإدارة:', err)
      setError('فشل في تحميل البيانات')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    clearAdminSession()
    router.push('/admin/login-db')
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto"></div>
          <p className="mt-4 text-white">جاري تحميل لوحة الإدارة...</p>
          <p className="mt-2 text-sm text-green-400">🗃️ نظام قاعدة البيانات</p>
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
            onClick={fetchDashboardData}
            className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700"
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
              <div className="h-10 w-10 bg-red-600 rounded-full flex items-center justify-center">
                <span className="text-xl">👨‍💼</span>
              </div>
              <div>
                <h1 className="text-xl font-bold">لوحة التحكم الإدارية</h1>
                <p className="text-sm text-gray-400">مرحباً، {data.adminSession.username}</p>
                <p className="text-xs text-green-400">🗃️ نظام قاعدة البيانات (DB ID: {data.adminSession.dbId})</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4 rtl:space-x-reverse">
              <div className="text-sm text-gray-400">
                آخر تحديث: {new Date(data.lastUpdated).toLocaleTimeString('ar-SA')}
              </div>
              <button
                onClick={fetchDashboardData}
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
          <nav className="flex space-x-8 rtl:space-x-reverse">
            {[
              { key: 'overview', label: '🏠 نظرة عامة' },
              { key: 'merchants', label: '👥 المستخدمين' },
              { key: 'analytics', label: '📊 التحليلات' }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setView(tab.key as any)}
                className={`py-4 px-6 border-b-2 font-medium text-sm transition-colors ${
                  view === tab.key
                    ? 'border-red-500 text-red-400'
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
                  <div className="flex justify-between">
                    <span className="text-gray-400">المحادثات الإجمالية:</span>
                    <span className="font-semibold">{data.stats.totalConversations}</span>
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
                        <div className="h-8 w-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
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
                    placeholder="البحث في المستخدمين..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-center space-x-4 rtl:space-x-reverse">
                  <span className="text-sm text-gray-400">
                    إجمالي: {filteredMerchants.length} مستخدم
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

        {/* Analytics Tab */}
        {view === 'analytics' && (
          <div className="space-y-6">
            <div className="text-center py-12">
              <h3 className="text-2xl font-bold text-gray-400 mb-4">📊 قسم التحليلات</h3>
              <p className="text-gray-500">سيتم إضافة المزيد من التحليلات والرسوم البيانية قريباً</p>
              <div className="mt-4 p-4 bg-green-900/20 border border-green-800 rounded-lg">
                <p className="text-green-300 text-sm">🗃️ نظام قاعدة البيانات نشط</p>
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
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  زيارة الشات بوت
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 