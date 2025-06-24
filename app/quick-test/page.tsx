'use client'

import { useState } from 'react'

export default function QuickTestPage() {
  const [formData, setFormData] = useState({
    email: 'test@example.com',
    password: 'password123',
    businessName: 'متجر الاختبار',
    chatbotId: 'test-store-' + Date.now(),
    phone: '+966501234567'
  })
  
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const handleTest = async () => {
    setLoading(true)
    setResult(null)
    
    try {
      const response = await fetch('/api/auth/register-supabase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })
      
      const data = await response.json()
      setResult({
        status: response.status,
        success: response.ok,
        data
      })
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4" dir="rtl">
      <div className="max-w-xl mx-auto">
        <div className="bg-white p-8 rounded-lg shadow">
          <h1 className="text-2xl font-bold text-center mb-6">
            🧪 اختبار تسجيل سريع
          </h1>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">البريد الإلكتروني:</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({...prev, email: e.target.value}))}
                className="w-full p-2 border rounded"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">كلمة المرور:</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({...prev, password: e.target.value}))}
                className="w-full p-2 border rounded"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">اسم المتجر:</label>
              <input
                value={formData.businessName}
                onChange={(e) => setFormData(prev => ({...prev, businessName: e.target.value}))}
                className="w-full p-2 border rounded"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">معرف الشات بوت:</label>
              <input
                value={formData.chatbotId}
                onChange={(e) => setFormData(prev => ({...prev, chatbotId: e.target.value}))}
                className="w-full p-2 border rounded"
              />
            </div>

            <button
              onClick={handleTest}
              disabled={loading}
              className="w-full bg-blue-600 text-white p-3 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'جاري التسجيل...' : 'اختبار التسجيل'}
            </button>

            {result && (
              <div className={`p-4 rounded ${result.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                <h3 className="font-bold mb-2">
                  {result.success ? '✅ نجح التسجيل!' : '❌ فشل التسجيل'}
                </h3>
                <pre className="text-xs overflow-auto">
                  {JSON.stringify(result.data || result.error, null, 2)}
                </pre>
              </div>
            )}
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded text-sm">
            <h3 className="font-bold mb-2">📋 الحالة:</h3>
            <ul className="space-y-1">
              <li>✅ Supabase REST API: يعمل</li>
              <li>❌ PostgreSQL Direct: معطل</li>
              <li>🔧 الحل: استخدام REST API</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
} 