'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getAdminSession, setAdminSession } from '@/lib/admin-auth'

export default function AdminLoginPage() {
  const [credentials, setCredentials] = useState({
    username: '',
    password: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [attempts, setAttempts] = useState(0)
  const router = useRouter()

  useEffect(() => {
    // إذا كان المدير مسجل دخول بالفعل، توجيه إلى الداشبورد
    const session = getAdminSession()
    if (session) {
      router.push('/admin/dashboard')
    }
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (attempts >= 5) {
      setError('تم تجاوز عدد المحاولات المسموح. يرجى الانتظار.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials)
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setAdminSession(data.token)
        console.log('✅ تم تسجيل دخول المدير بنجاح')
        router.push('/admin/dashboard')
      } else {
        setError(data.error || 'فشل في تسجيل الدخول')
        setAttempts(prev => prev + 1)
      }
    } catch (error) {
      console.error('خطأ في تسجيل الدخول:', error)
      setError('خطأ في الاتصال بالخادم')
      setAttempts(prev => prev + 1)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-800 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto h-20 w-20 bg-red-600 rounded-full flex items-center justify-center mb-6">
            <span className="text-3xl">🔒</span>
          </div>
          <h2 className="text-4xl font-bold text-white mb-2">
            لوحة التحكم الإدارية
          </h2>
          <p className="text-gray-300 text-lg">
            AI Shop Mate - نظام الإدارة
          </p>
          <div className="mt-2 text-xs text-red-400 font-mono">
            RESTRICTED ACCESS ONLY
          </div>
        </div>

        {/* Warning Banner */}
        <div className="bg-red-900/50 border border-red-600 rounded-lg p-4 text-center">
          <div className="flex items-center justify-center mb-2">
            <span className="text-2xl mr-2">⚠️</span>
            <span className="text-red-300 font-bold">تحذير أمني</span>
          </div>
          <p className="text-red-200 text-sm">
            هذه منطقة محظورة. جميع محاولات الدخول مسجلة ومراقبة.
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-white/5 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-white/10">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {error && (
              <div className="bg-red-900/70 border border-red-600 text-red-200 px-4 py-3 rounded-lg text-center">
                <div className="flex items-center justify-center">
                  <span className="text-xl mr-2">🚨</span>
                  {error}
                </div>
                {attempts > 0 && (
                  <div className="text-xs mt-1 text-red-300">
                    المحاولة {attempts} من 5
                  </div>
                )}
              </div>
            )}

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-200 mb-2">
                اسم المستخدم
              </label>
              <input
                id="username"
                type="text"
                required
                value={credentials.username}
                onChange={(e) => setCredentials(prev => ({
                  ...prev,
                  username: e.target.value
                }))}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="أدخل اسم المستخدم"
                disabled={loading || attempts >= 5}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-200 mb-2">
                كلمة المرور
              </label>
              <input
                id="password"
                type="password"
                required
                value={credentials.password}
                onChange={(e) => setCredentials(prev => ({
                  ...prev,
                  password: e.target.value
                }))}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="أدخل كلمة المرور"
                disabled={loading || attempts >= 5}
              />
            </div>

            <button
              type="submit"
              disabled={loading || attempts >= 5}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  جاري التحقق...
                </div>
              ) : attempts >= 5 ? (
                'تم حظر المحاولات'
              ) : (
                'دخول آمن'
              )}
            </button>
          </form>

          {/* Security Info */}
          <div className="mt-6 pt-6 border-t border-white/10">
            <div className="text-center text-xs text-gray-400 space-y-1">
              <p>🔐 محمي بتشفير AES-256</p>
              <p>🕵️ مراقبة أمنية نشطة</p>
              <p>⏰ انتهاء الجلسة: 24 ساعة</p>
            </div>
          </div>
        </div>

        {/* Footer Warning */}
        <div className="text-center text-xs text-gray-500">
          <p>© 2024 AI Shop Mate - نظام إدارة محمي</p>
          <p className="mt-1">الوصول غير المصرح به يعتبر مخالفة قانونية</p>
        </div>
      </div>
    </div>
  )
} 