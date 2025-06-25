'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getAdminSession, setAdminSession } from '@/lib/admin-auth-db'

export default function AdminLoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [attempts, setAttempts] = useState(0)
  const router = useRouter()

  useEffect(() => {
    // التحقق من وجود جلسة مدير نشطة
    const session = getAdminSession()
    if (session) {
      router.push('/admin/dashboard-db')
    }
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      console.log('🔐 Attempting database-based admin login...')
      
      const response = await fetch('/api/admin/auth/login-db', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        console.log('✅ Database login successful!')
        setAdminSession(data.token)
        router.push('/admin/dashboard-db')
      } else {
        console.log('❌ Database login failed:', data.error)
        setError(data.error || 'فشل في تسجيل الدخول')
        setAttempts(prev => prev + 1)
      }
    } catch (err) {
      console.error('خطأ في الاتصال:', err)
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
          <div className="mx-auto h-20 w-20 bg-red-600 rounded-full flex items-center justify-center">
            <span className="text-3xl">🔐</span>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-white">
            دخول المدير
          </h2>
          <p className="mt-2 text-center text-sm text-gray-400">
            AI Shop Mate - لوحة التحكم الإدارية
          </p>
          <div className="mt-4 p-4 bg-red-900/20 border border-red-800 rounded-lg">
            <p className="text-red-300 text-sm text-center">
              ⚠️ وصول مقيد للمدراء المصرح لهم فقط
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
                className="relative block w-full px-3 py-3 border border-gray-600 bg-gray-800 text-white rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                placeholder="أدخل اسم المستخدم"
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
                className="relative block w-full px-3 py-3 border border-gray-600 bg-gray-800 text-white rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                placeholder="أدخل كلمة المرور"
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
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
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
              <p className="text-xs text-gray-400 mb-2">🗃️ نظام قاعدة البيانات</p>
              <p className="text-xs text-gray-500">
                يتم التحقق من بيانات المدير من قاعدة بيانات Supabase
              </p>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
} 