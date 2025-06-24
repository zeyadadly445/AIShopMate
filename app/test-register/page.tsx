'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'

export default function TestRegisterPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    businessName: '',
    chatbotId: '',
    phone: ''
  })
  
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const handleSubmit = async (apiEndpoint: string) => {
    setLoading(true)
    setResult(null)
    
    try {
      const response = await fetch(apiEndpoint, {
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
        data,
        endpoint: apiEndpoint
      })
    } catch (error) {
      setResult({
        status: 'error',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        endpoint: apiEndpoint
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4" dir="rtl">
      <div className="max-w-2xl mx-auto">
        <Card className="p-8">
          <h1 className="text-3xl font-bold text-center mb-8 text-gray-900">
            🧪 اختبار التسجيل
          </h1>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                البريد الإلكتروني
              </label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({...prev, email: e.target.value}))}
                placeholder="example@email.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                كلمة المرور
              </label>
              <Input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({...prev, password: e.target.value}))}
                placeholder="كلمة المرور"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                اسم المتجر
              </label>
              <Input
                value={formData.businessName}
                onChange={(e) => setFormData(prev => ({...prev, businessName: e.target.value}))}
                placeholder="متجر الأحذية"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                معرف الشات بوت
              </label>
              <Input
                value={formData.chatbotId}
                onChange={(e) => setFormData(prev => ({...prev, chatbotId: e.target.value}))}
                placeholder="shoes-store"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                رقم الهاتف (اختياري)
              </label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({...prev, phone: e.target.value}))}
                placeholder="+966501234567"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button
                onClick={() => handleSubmit('/api/auth/register')}
                disabled={loading}
                variant="secondary"
                className="w-full"
              >
                {loading ? 'جاري الاختبار...' : 'اختبار API الأصلي'}
              </Button>

              <Button
                onClick={() => handleSubmit('/api/auth/register-supabase')}
                disabled={loading}
                className="w-full"
              >
                {loading ? 'جاري الاختبار...' : 'اختبار Supabase REST API'}
              </Button>
            </div>

            {result && (
              <Card className={`p-4 ${result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                <h3 className="font-bold mb-2">
                  {result.success ? '✅ نجح!' : '❌ فشل'}
                </h3>
                <p className="text-sm mb-2">
                  <strong>Endpoint:</strong> {result.endpoint}
                </p>
                <p className="text-sm mb-2">
                  <strong>Status:</strong> {result.status}
                </p>
                <div className="text-sm">
                  <strong>Response:</strong>
                  <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
                    {JSON.stringify(result.data || result.error, null, 2)}
                  </pre>
                </div>
              </Card>
            )}
          </div>

          <div className="mt-8 p-4 bg-blue-50 rounded">
            <h3 className="font-bold text-blue-900 mb-2">💡 تعليمات:</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• املأ جميع الحقول المطلوبة</li>
              <li>• اختبر API الأصلي أولاً لرؤية الخطأ</li>
              <li>• ثم اختبر Supabase REST API</li>
              <li>• إذا نجح REST API، فالمشكلة في PostgreSQL connection</li>
            </ul>
          </div>
        </Card>
      </div>
    </div>
  )
} 