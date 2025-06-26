'use client'

import React, { useEffect, useState } from 'react'
import Card from '@/components/ui/Card'

interface MerchantInfo {
  businessName: string
  primaryColor: string
  email?: string
  subscription?: {
    plan: string
    status: string
    messagesLimit: number
    messagesUsed: number
    lastReset: string
  }
}

interface LimitReachedPageProps {
  params: Promise<{ chatbotId: string }>
}

export default function LimitReachedPage({ params }: LimitReachedPageProps) {
  const [chatbotId, setChatbotId] = useState<string>('')
  const [merchant, setMerchant] = useState<MerchantInfo | null>(null)
  const [loading, setLoading] = useState(true)

  // Resolve params and get chatbotId
  useEffect(() => {
    const resolveChatbotId = async () => {
      const resolvedParams = await params
      setChatbotId(resolvedParams.chatbotId)
    }
    resolveChatbotId()
  }, [params])

  // Load basic merchant info
  useEffect(() => {
    if (!chatbotId) return

    const loadMerchant = async () => {
      try {
        const response = await fetch(`/api/merchant/${chatbotId}`)
        if (response.ok) {
          const merchantData = await response.json()
          setMerchant(merchantData)
        }
      } catch (error) {
        console.error('Error loading merchant:', error)
      } finally {
        setLoading(false)
      }
    }

    loadMerchant()
  }, [chatbotId])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    )
  }

  return (
    <div 
      className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100"
      style={{ 
        background: merchant?.primaryColor 
          ? `linear-gradient(135deg, ${merchant.primaryColor}10, ${merchant.primaryColor}05)`
          : undefined
      }}
    >
      {/* Header */}
      {merchant && (
        <div className="bg-white shadow-lg border-b-4 border-red-500">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-center space-x-4 rtl:space-x-reverse">
              {/* Logo or Initial */}
              <div 
                className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
                style={{ backgroundColor: merchant.primaryColor }}
              >
                {merchant.businessName.charAt(0)}
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">{merchant.businessName}</h1>
                <p className="text-sm text-red-600">⚠️ الخدمة غير متاحة مؤقتاً</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-2xl mx-auto p-4 pt-16">
        <Card className="text-center p-8 bg-white shadow-xl">
          
          {/* Error Icon */}
          <div className="text-red-500 text-8xl mb-6">
            🚫
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            تم الوصول للحد الشهري
          </h1>

          {/* Main Message */}
          <div className="text-gray-700 mb-8 leading-relaxed">
            <p className="text-lg mb-4">
              عذراً، لقد تم استنفاد الحد الشهري من الرسائل المسموح بها لهذا المتجر.
            </p>
            
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-start">
                <div className="text-red-500 text-xl mr-3">⚠️</div>
                <div className="text-right">
                  <h3 className="font-semibold text-red-800 mb-2">ما الذي حدث؟</h3>
                  <p className="text-red-700 text-sm">
                    وصل صاحب المتجر للحد الأقصى من الرسائل المسموح بها في خطة الاشتراك الحالية، 
                    وبالتالي تم إيقاف خدمة الشات بوت مؤقتاً.
                  </p>
                  
                  {/* عرض معلومات الاشتراك التفصيلية */}
                  {merchant?.subscription && (
                    <div className="mt-4 bg-red-100 border border-red-300 rounded p-3">
                      <h4 className="font-semibold text-red-900 mb-2">📊 تفاصيل الاشتراك:</h4>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="font-medium">الخطة:</span>
                          <div className="text-red-800">{merchant.subscription.plan}</div>
                        </div>
                        <div>
                          <span className="font-medium">الحالة:</span>
                          <div className="text-red-800">{merchant.subscription.status}</div>
                        </div>
                        <div>
                          <span className="font-medium">الرسائل المستخدمة:</span>
                          <div className="text-red-800">{merchant.subscription.messagesUsed.toLocaleString()}</div>
                        </div>
                        <div>
                          <span className="font-medium">الحد الأقصى:</span>
                          <div className="text-red-800">{merchant.subscription.messagesLimit.toLocaleString()}</div>
                        </div>
                      </div>
                      <div className="mt-2">
                        <div className="bg-red-200 rounded-full h-2 w-full">
                          <div 
                            className="bg-red-600 h-2 rounded-full" 
                            style={{ 
                              width: `${Math.min((merchant.subscription.messagesUsed / merchant.subscription.messagesLimit) * 100, 100)}%` 
                            }}
                          ></div>
                        </div>
                        <div className="text-xs text-red-700 mt-1 text-center">
                          {Math.round((merchant.subscription.messagesUsed / merchant.subscription.messagesLimit) * 100)}% مستخدم
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-start">
                <div className="text-blue-500 text-xl mr-3">💡</div>
                <div className="text-right">
                  <h3 className="font-semibold text-blue-800 mb-2">ماذا يمكنك فعله؟</h3>
                  <ul className="text-blue-700 text-sm space-y-1 list-disc list-inside">
                    <li>تواصل مع صاحب المتجر مباشرة</li>
                    <li>جرب مرة أخرى في بداية الشهر القادم</li>
                    <li>تابع صفحات التواصل الاجتماعي للمتجر</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Info */}
          {merchant && (
            <div className="border-t border-gray-200 pt-6">
              <h3 className="font-semibold text-gray-900 mb-4">📞 طرق التواصل البديلة</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {merchant.email && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-gray-600 text-sm mb-1">البريد الإلكتروني</div>
                    <a 
                      href={`mailto:${merchant.email}`}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      {merchant.email}
                    </a>
                  </div>
                )}
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-gray-600 text-sm mb-1">المتجر</div>
                  <div className="font-medium text-gray-900">{merchant.businessName}</div>
                </div>
              </div>

              <div className="mt-6 text-sm text-gray-600">
                💡 <strong>نصيحة:</strong> احفظ هذا الرابط وجرب مرة أخرى لاحقاً، قد تعود الخدمة للعمل عند تجديد الاشتراك.
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="flex items-center justify-center space-x-2 rtl:space-x-reverse text-sm text-gray-600">
              <span>مدعوم بـ</span>
              <span className="font-semibold text-blue-600">AI Shop Mate</span>
              <span>•</span>
              <span>منصة الشات بوت الذكي للمتاجر</span>
            </div>
          </div>

        </Card>
      </div>
    </div>
  )
} 