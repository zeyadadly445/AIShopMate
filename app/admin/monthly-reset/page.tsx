'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface SubscriptionInfo {
  id: string
  plan: string
  status: string
  messagesLimit: number
  messagesUsed: number
  lastReset: string
  merchantId: string
  businessName: string
  email: string
  daysSinceReset: number
}

interface ResetSummary {
  total: number
  eligibleForReset: number
  needsResetButIneligible: number
  upToDate: number
}

export default function MonthlyResetPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<ResetSummary | null>(null)
  const [eligibleForReset, setEligibleForReset] = useState<SubscriptionInfo[]>([])
  const [needsResetButIneligible, setNeedsResetButIneligible] = useState<SubscriptionInfo[]>([])
  const [upToDate, setUpToDate] = useState<SubscriptionInfo[]>([])
  const [selectedTab, setSelectedTab] = useState<'eligible' | 'ineligible' | 'uptodate'>('eligible')
  const [resetting, setResetting] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  useEffect(() => {
    checkAdminAuth()
    loadResetData()
  }, [])

  const checkAdminAuth = () => {
    const adminSession = localStorage.getItem('adminSession')
    if (!adminSession) {
      router.push('/admin/login')
      return
    }

    try {
      const session = JSON.parse(adminSession)
      const now = Date.now()
      const sessionAge = now - session.loginTime
      
      if (sessionAge > 24 * 60 * 60 * 1000) {
        localStorage.removeItem('adminSession')
        router.push('/admin/login')
      }
    } catch {
      router.push('/admin/login')
    }
  }

  const loadResetData = async () => {
    try {
      const adminSession = localStorage.getItem('adminSession')
      if (!adminSession) return

      const response = await fetch('/api/admin/monthly-reset', {
        headers: {
          'Authorization': `Bearer ${adminSession}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setSummary(data.summary)
        setEligibleForReset(data.details.eligibleForReset)
        setNeedsResetButIneligible(data.details.needsResetButIneligible)
        setUpToDate(data.details.upToDate)
      }
    } catch (error) {
      console.error('Error loading reset data:', error)
    } finally {
      setLoading(false)
    }
  }

  const executeReset = async (subscriptionIds?: string[]) => {
    if (!confirm('هل أنت متأكد من تنفيذ التجديد الشهري؟')) return

    setResetting(true)
    try {
      const adminSession = localStorage.getItem('adminSession')
      if (!adminSession) return

      const response = await fetch('/api/admin/monthly-reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminSession}`
        },
        body: JSON.stringify({ subscriptionIds })
      })

      if (response.ok) {
        const result = await response.json()
        alert(`تم التجديد بنجاح!\nنجح: ${result.summary.successful}\nفشل: ${result.summary.failed}`)
        loadResetData() // إعادة تحميل البيانات
        setSelectedIds([])
      } else {
        const error = await response.json()
        alert(`خطأ في التجديد: ${error.error}`)
      }
    } catch (error) {
      console.error('Error executing reset:', error)
      alert('حدث خطأ في التجديد')
    } finally {
      setResetting(false)
    }
  }

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(sid => sid !== id)
        : [...prev, id]
    )
  }

  const selectAll = () => {
    const currentList = selectedTab === 'eligible' ? eligibleForReset : 
                       selectedTab === 'ineligible' ? needsResetButIneligible : upToDate
    const allIds = currentList.map(item => item.id)
    setSelectedIds(allIds)
  }

  const clearSelection = () => {
    setSelectedIds([])
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">جاري التحميل...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6" dir="rtl">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">🔄 إدارة التجديد الشهري</h1>
            <p className="text-gray-400 mt-2">إدارة تجديد الرسائل الشهرية للحسابات المفعلة</p>
          </div>
          <div className="flex space-x-4 rtl:space-x-reverse">
            <button
              onClick={() => router.push('/admin/dashboard')}
              className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg"
            >
              ← العودة للوحة الإدارة
            </button>
            <button
              onClick={() => loadResetData()}
              className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg"
            >
              🔄 تحديث البيانات
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
              <h3 className="text-lg font-semibold text-gray-300 mb-2">إجمالي الاشتراكات</h3>
              <p className="text-3xl font-bold text-blue-400">{summary.total}</p>
            </div>
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
              <h3 className="text-lg font-semibold text-gray-300 mb-2">مؤهل للتجديد</h3>
              <p className="text-3xl font-bold text-green-400">{summary.eligibleForReset}</p>
            </div>
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
              <h3 className="text-lg font-semibold text-gray-300 mb-2">يحتاج تجديد (غير مفعل)</h3>
              <p className="text-3xl font-bold text-yellow-400">{summary.needsResetButIneligible}</p>
            </div>
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
              <h3 className="text-lg font-semibold text-gray-300 mb-2">محدث</h3>
              <p className="text-3xl font-bold text-gray-400">{summary.upToDate}</p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex space-x-4 rtl:space-x-reverse">
            <button
              onClick={() => executeReset()}
              disabled={resetting || summary?.eligibleForReset === 0}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 px-6 py-2 rounded-lg font-semibold"
            >
              {resetting ? 'جاري التجديد...' : `🔄 تجديد جميع المؤهلين (${summary?.eligibleForReset || 0})`}
            </button>
            
            {selectedIds.length > 0 && (
              <button
                onClick={() => executeReset(selectedIds)}
                disabled={resetting}
                className="bg-orange-600 hover:bg-orange-700 px-4 py-2 rounded-lg"
              >
                تجديد المحدد ({selectedIds.length})
              </button>
            )}
          </div>

          <div className="flex space-x-2 rtl:space-x-reverse">
            <button
              onClick={selectAll}
              className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-sm"
            >
              تحديد الكل
            </button>
            <button
              onClick={clearSelection}
              className="bg-gray-600 hover:bg-gray-700 px-3 py-1 rounded text-sm"
            >
              إلغاء التحديد
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 rtl:space-x-reverse mb-6">
          <button
            onClick={() => setSelectedTab('eligible')}
            className={`px-4 py-2 rounded-lg font-medium ${
              selectedTab === 'eligible' 
                ? 'bg-green-600 text-white' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            مؤهل للتجديد ({eligibleForReset.length})
          </button>
          <button
            onClick={() => setSelectedTab('ineligible')}
            className={`px-4 py-2 rounded-lg font-medium ${
              selectedTab === 'ineligible' 
                ? 'bg-yellow-600 text-white' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            يحتاج تجديد (غير مفعل) ({needsResetButIneligible.length})
          </button>
          <button
            onClick={() => setSelectedTab('uptodate')}
            className={`px-4 py-2 rounded-lg font-medium ${
              selectedTab === 'uptodate' 
                ? 'bg-gray-600 text-white' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            محدث ({upToDate.length})
          </button>
        </div>

        {/* Content */}
        <div className="bg-gray-800 rounded-lg border border-gray-700">
          {selectedTab === 'eligible' && (
            <SubscriptionList 
              subscriptions={eligibleForReset} 
              title="الاشتراكات المؤهلة للتجديد الشهري"
              color="green"
              selectedIds={selectedIds}
              onToggleSelection={toggleSelection}
              showSelection={true}
            />
          )}
          
          {selectedTab === 'ineligible' && (
            <SubscriptionList 
              subscriptions={needsResetButIneligible} 
              title="تحتاج تجديد لكن غير مفعلة"
              color="yellow"
              selectedIds={selectedIds}
              onToggleSelection={toggleSelection}
              showSelection={false}
            />
          )}
          
          {selectedTab === 'uptodate' && (
            <SubscriptionList 
              subscriptions={upToDate} 
              title="الاشتراكات المحدثة"
              color="gray"
              selectedIds={selectedIds}
              onToggleSelection={toggleSelection}
              showSelection={false}
            />
          )}
        </div>
      </div>
    </div>
  )
}

interface SubscriptionListProps {
  subscriptions: SubscriptionInfo[]
  title: string
  color: 'green' | 'yellow' | 'gray'
  selectedIds: string[]
  onToggleSelection: (id: string) => void
  showSelection: boolean
}

function SubscriptionList({ 
  subscriptions, 
  title, 
  color, 
  selectedIds, 
  onToggleSelection, 
  showSelection 
}: SubscriptionListProps) {
  const colorClasses = {
    green: 'border-green-500 bg-green-900/20',
    yellow: 'border-yellow-500 bg-yellow-900/20',
    gray: 'border-gray-500 bg-gray-900/20'
  }

  if (subscriptions.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-400 text-lg">لا توجد اشتراكات في هذه الفئة</p>
      </div>
    )
  }

  return (
    <div className="p-6">
      <h3 className="text-xl font-bold mb-4">{title}</h3>
      <div className="space-y-3">
        {subscriptions.map((subscription) => (
          <div 
            key={subscription.id}
            className={`p-4 rounded-lg border ${colorClasses[color]} ${
              selectedIds.includes(subscription.id) ? 'ring-2 ring-blue-500' : ''
            }`}
          >
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4 rtl:space-x-reverse">
                {showSelection && (
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(subscription.id)}
                    onChange={() => onToggleSelection(subscription.id)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                )}
                <div>
                  <h4 className="font-semibold text-white">{subscription.businessName}</h4>
                  <p className="text-gray-400 text-sm">{subscription.email}</p>
                </div>
              </div>
              
              <div className="text-right space-y-1">
                <div className="flex items-center space-x-2 rtl:space-x-reverse">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    subscription.status === 'ACTIVE' ? 'bg-green-600' : 
                    subscription.status === 'TRIAL' ? 'bg-blue-600' : 'bg-red-600'
                  }`}>
                    {subscription.status}
                  </span>
                  <span className="text-sm text-gray-400">{subscription.plan}</span>
                </div>
                
                <div className="text-sm">
                  <span className="text-gray-300">
                    {subscription.messagesUsed.toLocaleString()} / {subscription.messagesLimit.toLocaleString()}
                  </span>
                  <span className="text-gray-500 mr-2">
                    ({subscription.daysSinceReset} يوم من آخر تجديد)
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
} 