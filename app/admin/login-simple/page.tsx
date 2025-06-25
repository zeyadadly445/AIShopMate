'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getSimpleAdminSession, setSimpleAdminSession } from '@/lib/admin-auth-simple'

export default function SimpleAdminLoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [attempts, setAttempts] = useState(0)
  const router = useRouter()

  useEffect(() => {
    // التحقق من وجود جلسة نشطة
    const session = getSimpleAdminSession()
    if (session) {
      console.log('✅ Active session found, redirecting to dashboard')
      router.push('/admin/dashboard-simple')
    }
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      console.log('🔐 Attempting simple admin login for:', username)
      
      const response = await fetch('/api/admin/auth/login-simple', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        console.log('✅ Simple login successful!')
        
        // حفظ الجلسة في localStorage
        setSimpleAdminSession(data.session)
        
        // الانتقال إلى Dashboard
        router.push('/admin/dashboard-simple')
      } else {
        console.log('❌ Simple login failed:', data.error)
        setError(data.error || 'فشل في تسجيل الدخول')
        setAttempts(prev => prev + 1)
      }
    } catch (err) {
      console.error('❌ Connection error:', err)
      setError('خطأ في الاتصال بالخادم')
      setAttempts(prev => prev + 1)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8" dir="rtl">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-20 w-20 bg-green-600 rounded-full flex items-center justify-center">
            <span className="text-3xl">🔐</span>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-white">
            دخول المدير - نظام بسيط
          </h2>
          <p className="mt-2 text-center text-sm text-gray-400">
            AI Shop Mate - نظام إدارة محسن
          </p>
          <div className="mt-4 p-4 bg-green-900/20 border border-green-800 rounded-lg">
            <p className="text-green-300 text-sm text-center">
              ✅ نظام محسن بدون JWT - أسرع وأكثر استقراراً
            </p>
          </div>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-2">
                اسم المستخدم
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="relative block w-full px-3 py-3 border border-gray-600 bg-gray-800 text-white rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="admin_zeyadd"
              />
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                كلمة المرور
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="relative block w-full px-3 py-3 border border-gray-600 bg-gray-800 text-white rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="Admin@2024!"
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-900/50 border border-red-800 text-red-300 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {attempts > 0 && (
            <div className="text-center text-sm text-gray-400">
              محاولات فاشلة: {attempts}
              {attempts >= 3 && (
                <div className="text-red-400 mt-1">
                  ⚠️ تحذير: محاولات متعددة فاشلة
                </div>
              )}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-2"></div>
                  جاري التحقق...
                </div>
              ) : (
                'تسجيل الدخول'
              )}
            </button>
          </div>

          <div className="text-center">
            <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
              <p className="text-xs text-green-400 mb-2">🚀 النظام الجديد - بدون JWT</p>
              <p className="text-xs text-gray-500">
                نظام محسن للأمان مع أداء فائق
              </p>
              <div className="mt-2 flex justify-center space-x-4 rtl:space-x-reverse text-xs">
                <span className="text-green-400">✅ سريع</span>
                <span className="text-green-400">✅ مستقر</span>
                <span className="text-green-400">✅ آمن</span>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
} 