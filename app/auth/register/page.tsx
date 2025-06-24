'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Card from '@/components/ui/Card'

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    businessName: '',
    chatbotId: '',
    phone: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [idAvailable, setIdAvailable] = useState<boolean | null>(null)
  const [checkingId, setCheckingId] = useState(false)
  const router = useRouter()

  const handleInputChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }))
    
    // Reset availability check when chatbotId changes
    if (field === 'chatbotId') {
      setIdAvailable(null)
    }
  }

  const checkIdAvailability = async () => {
    if (!formData.chatbotId || formData.chatbotId.length < 3) return
    
    setCheckingId(true)
    try {
      const response = await fetch(`/api/auth/check-id?chatbotId=${encodeURIComponent(formData.chatbotId)}`)
      const data = await response.json()
      setIdAvailable(data.available)
    } catch (err) {
      console.error('Error checking ID availability')
    } finally {
      setCheckingId(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('كلمات المرور غير متطابقة')
      setLoading(false)
      return
    }

    if (formData.password.length < 6) {
      setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل')
      setLoading(false)
      return
    }

    if (!formData.chatbotId || formData.chatbotId.length < 3) {
      setError('اسم المتجر يجب أن يكون 3 أحرف على الأقل')
      setLoading(false)
      return
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          businessName: formData.businessName,
          chatbotId: formData.chatbotId,
          phone: formData.phone
        })
      })

      if (response.ok) {
        const data = await response.json()
        localStorage.setItem('token', data.token)
        router.push('/dashboard')
      } else {
        const data = await response.json()
        setError(data.error || 'حدث خطأ في إنشاء الحساب')
      }
    } catch (err) {
      setError('حدث خطأ في الاتصال')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center">
            <div className="bg-blue-600 text-white p-3 rounded-lg">
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            إنشاء حساب جديد
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            ابدأ رحلتك مع الذكاء الاصطناعي لمتجرك
          </p>
        </div>

        {/* Register Form */}
        <Card className="mt-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <Input
              label="البريد الإلكتروني"
              type="email"
              value={formData.email}
              onChange={handleInputChange('email')}
              placeholder="أدخل بريدك الإلكتروني"
              required
              icon={
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                </svg>
              }
            />

            <Input
              label="اسم المتجر"
              value={formData.businessName}
              onChange={handleInputChange('businessName')}
              placeholder="مثال: متجر الإلكترونيات"
              required
              icon={
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h4a2 2 0 012 2v2a2 2 0 01-2 2H8a2 2 0 01-2-2v-2z" clipRule="evenodd" />
                </svg>
              }
            />

            <div>
              <Input
                label="اسم الرابط المخصص"
                value={formData.chatbotId}
                onChange={handleInputChange('chatbotId')}
                placeholder="مثال: electronics-store"
                required
                onBlur={checkIdAvailability}
                icon={
                  checkingId ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                  ) : idAvailable === true ? (
                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : idAvailable === false ? (
                    <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
                    </svg>
                  )
                }
              />
              <p className="mt-1 text-xs text-gray-500">
                سيكون رابط متجرك: ai-shop-mate.vercel.app/<span className="font-medium">{formData.chatbotId || 'اسم-المتجر'}</span>
              </p>
              {idAvailable === false && (
                <p className="mt-1 text-sm text-red-600">هذا الاسم مستخدم بالفعل</p>
              )}
              {idAvailable === true && (
                <p className="mt-1 text-sm text-green-600">الاسم متاح!</p>
              )}
            </div>

            <Input
              label="رقم الهاتف (اختياري)"
              type="tel"
              value={formData.phone}
              onChange={handleInputChange('phone')}
              placeholder="مثال: +201234567890"
              icon={
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                </svg>
              }
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="كلمة المرور"
                type="password"
                value={formData.password}
                onChange={handleInputChange('password')}
                placeholder="6 أحرف على الأقل"
                required
              />

              <Input
                label="تأكيد كلمة المرور"
                type="password"
                value={formData.confirmPassword}
                onChange={handleInputChange('confirmPassword')}
                placeholder="أعد كتابة كلمة المرور"
                required
              />
            </div>

            <Button 
              type="submit" 
              loading={loading}
              className="w-full"
              size="lg"
              disabled={idAvailable === false}
            >
              إنشاء الحساب
            </Button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">أو</span>
              </div>
            </div>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                لديك حساب بالفعل؟{' '}
                <Link href="/auth/login" className="font-medium text-blue-600 hover:text-blue-500">
                  تسجيل الدخول
                </Link>
              </p>
            </div>
          </div>
        </Card>

        {/* Back to Home */}
        <div className="text-center">
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">
            ← العودة للصفحة الرئيسية
          </Link>
        </div>
      </div>
    </div>
  )
} 