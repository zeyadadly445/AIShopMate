'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Card from '@/components/ui/Card'

interface ChatCustomization {
  primaryColor: string
  secondaryColor: string
  backgroundColor: string
  userMessageColor: string
  botMessageColor: string
  textColor: string
  fontFamily: string
  borderRadius: string
  headerStyle: string
  messageStyle: string
  animationStyle: string
  logoUrl?: string
  welcomeMessage: string
  placeholderText: string
  sendButtonText: string
  typingIndicator: string
}

interface CustomizePageProps {
  params: Promise<{ chatbotId: string }>
}

export default function CustomizePage({ params }: CustomizePageProps) {
  const [chatbotId, setChatbotId] = useState<string>('')
  const [customization, setCustomization] = useState<ChatCustomization>({
    primaryColor: '#007bff',
    secondaryColor: '#6c757d',
    backgroundColor: '#ffffff',
    userMessageColor: '#007bff',
    botMessageColor: '#f8f9fa',
    textColor: '#333333',
    fontFamily: 'Inter',
    borderRadius: 'medium',
    headerStyle: 'modern',
    messageStyle: 'rounded',
    animationStyle: 'smooth',
    welcomeMessage: 'مرحبا! كيف يمكنني مساعدتك؟',
    placeholderText: 'اكتب رسالتك هنا...',
    sendButtonText: 'إرسال',
    typingIndicator: 'يكتب...'
  })
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [savedMessage, setSavedMessage] = useState('')
  const [previewMessages, setPreviewMessages] = useState([
    { role: 'assistant', content: customization.welcomeMessage },
    { role: 'user', content: 'مرحبا، أريد معرفة المزيد عن منتجاتكم' },
    { role: 'assistant', content: 'أهلاً وسهلاً! يسعدني مساعدتك. لدينا مجموعة رائعة من المنتجات المميزة.' }
  ])
  const [activeTab, setActiveTab] = useState<'appearance' | 'messages' | 'preview'>('appearance')
  const router = useRouter()

  // Resolve params and get chatbotId
  useEffect(() => {
    const resolveChatbotId = async () => {
      const resolvedParams = await params
      setChatbotId(resolvedParams.chatbotId)
    }
    resolveChatbotId()
  }, [params])

  // Load existing customization
  useEffect(() => {
    if (!chatbotId) return

    const loadCustomization = async () => {
      try {
        setIsLoading(true)
        const response = await fetch(`/api/chat-appearance/${chatbotId}`)
        
        if (response.ok) {
          const data = await response.json()
          setCustomization(prev => ({ ...prev, ...data }))
        }
      } catch (error) {
        console.error('Error loading customization:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadCustomization()
  }, [chatbotId])

  // Update preview when customization changes
  useEffect(() => {
    setPreviewMessages(prev => [
      { role: 'assistant', content: customization.welcomeMessage },
      ...prev.slice(1)
    ])
  }, [customization.welcomeMessage])

  const saveCustomization = async () => {
    if (!chatbotId) return

    try {
      setIsSaving(true)
      console.log('🔄 Starting save process...')
      
      const response = await fetch(`/api/chat-appearance/${chatbotId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(customization),
      })

      const responseData = await response.json()
      console.log('📡 API Response:', responseData)

      if (response.ok) {
        setSavedMessage('✅ تم حفظ التخصيصات بنجاح!')
        setTimeout(() => setSavedMessage(''), 3000)
        console.log('✅ Save completed successfully')
      } else {
        console.error('❌ Save failed:', responseData)
        
        // رسائل خطأ مخصصة حسب نوع المشكلة
        let errorMessage = '❌ حدث خطأ في الحفظ'
        
        if (responseData.hint) {
          errorMessage += `\n💡 ${responseData.hint}`
        } else if (responseData.error === 'ChatCustomization table not found') {
          errorMessage = '❌ جدول التخصيصات غير موجود\n💡 يجب تطبيق SQL script أولاً'
        } else if (responseData.error === 'Merchant not found') {
          errorMessage = '❌ التاجر غير موجود\n💡 تحقق من chatbotId'
        } else if (responseData.details) {
          errorMessage += `\n📝 التفاصيل: ${responseData.details}`
        }
        
        setSavedMessage(errorMessage)
        setTimeout(() => setSavedMessage(''), 5000) // وقت أطول لرسائل الخطأ المفصلة
        
        throw new Error(responseData.error || 'فشل في حفظ التخصيصات')
      }
    } catch (error) {
      console.error('❌ Critical error in save process:', error)
      
      if (!savedMessage.includes('❌')) {
        setSavedMessage('❌ خطأ في الاتصال بالخادم\n💡 تحقق من اتصال الإنترنت والخادم')
        setTimeout(() => setSavedMessage(''), 5000)
      }
    } finally {
      setIsSaving(false)
    }
  }

  const resetToDefaults = () => {
    setCustomization({
      primaryColor: '#007bff',
      secondaryColor: '#6c757d',
      backgroundColor: '#ffffff',
      userMessageColor: '#007bff',
      botMessageColor: '#f8f9fa',
      textColor: '#333333',
      fontFamily: 'Inter',
      borderRadius: 'medium',
      headerStyle: 'modern',
      messageStyle: 'rounded',
      animationStyle: 'smooth',
      welcomeMessage: 'مرحبا! كيف يمكنني مساعدتك؟',
      placeholderText: 'اكتب رسالتك هنا...',
      sendButtonText: 'إرسال',
      typingIndicator: 'يكتب...'
    })
  }

  const testChatbot = () => {
    window.open(`/chat/${chatbotId}`, '_blank')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-900">جاري تحميل التخصيصات...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4 rtl:space-x-reverse">
              <button
                onClick={() => router.back()}
                className="text-gray-600 hover:text-gray-900 p-2 rounded-lg hover:bg-gray-100"
              >
                ← العودة
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">🎨 تخصيص مظهر الشات</h1>
                <p className="text-gray-600">اضبط ألوان وأسلوب صفحة الشات حسب علامتك التجارية</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 rtl:space-x-reverse">
              <button
                onClick={testChatbot}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center"
              >
                🔗 اختبار الشات
              </button>
              <button
                onClick={saveCustomization}
                disabled={isSaving}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center"
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin ml-2"></div>
                    جاري الحفظ...
                  </>
                ) : (
                  '💾 حفظ التخصيصات'
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Save Message */}
      {savedMessage && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className={`p-4 rounded-lg text-right ${
            savedMessage.includes('✅') 
              ? 'bg-green-100 text-green-800 border border-green-300' 
              : 'bg-red-100 text-red-800 border border-red-300'
          }`}>
            <div className="whitespace-pre-line text-sm font-medium">
              {savedMessage}
            </div>
            {savedMessage.includes('❌') && (
              <div className="mt-3 pt-3 border-t border-red-200">
                <p className="text-xs text-red-600 mb-2">🔧 خطوات استكشاف الأخطاء:</p>
                <ul className="text-xs text-red-600 space-y-1">
                  <li>• تحقق من تطبيق SQL في Supabase</li>
                  <li>• راجع console في المتصفح للتفاصيل</li>
                  <li>• استخدم أداة التشخيص: <code className="bg-red-200 px-1 rounded">/api/debug-customization?chatbotId={chatbotId}</code></li>
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <div className="flex space-x-1 rtl:space-x-reverse bg-gray-100 p-1 rounded-lg w-fit">
          <button
            onClick={() => setActiveTab('appearance')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'appearance'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            🎨 المظهر والألوان
          </button>
          <button
            onClick={() => setActiveTab('messages')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'messages'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            💬 النصوص والرسائل
          </button>
          <button
            onClick={() => setActiveTab('preview')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'preview'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            👁️ المعاينة
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Settings Panel */}
          <div className="lg:col-span-2">
            {activeTab === 'appearance' && (
              <Card className="p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">🎨 إعدادات المظهر</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Primary Colors */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-gray-900">الألوان الأساسية</h3>
                    
                    <div>
                      <label className="block text-sm font-bold text-gray-900 mb-2">
                        اللون الأساسي (Header & User Messages)
                      </label>
                      <div className="flex items-center space-x-3 rtl:space-x-reverse">
                        <input
                          type="color"
                          value={customization.primaryColor}
                          onChange={(e) => setCustomization(prev => ({ ...prev, primaryColor: e.target.value }))}
                          className="w-12 h-10 rounded border border-gray-300"
                        />
                        <Input
                          value={customization.primaryColor}
                          onChange={(e) => setCustomization(prev => ({ ...prev, primaryColor: e.target.value }))}
                          className="flex-1 text-gray-900 font-medium"
                          placeholder="#007bff"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-900 mb-2">
                        اللون الثانوي
                      </label>
                      <div className="flex items-center space-x-3 rtl:space-x-reverse">
                        <input
                          type="color"
                          value={customization.secondaryColor}
                          onChange={(e) => setCustomization(prev => ({ ...prev, secondaryColor: e.target.value }))}
                          className="w-12 h-10 rounded border border-gray-300"
                        />
                        <Input
                          value={customization.secondaryColor}
                          onChange={(e) => setCustomization(prev => ({ ...prev, secondaryColor: e.target.value }))}
                          className="flex-1 text-gray-900 font-medium"
                          placeholder="#6c757d"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-900 mb-2">
                        خلفية الصفحة
                      </label>
                      <div className="flex items-center space-x-3 rtl:space-x-reverse">
                        <input
                          type="color"
                          value={customization.backgroundColor}
                          onChange={(e) => setCustomization(prev => ({ ...prev, backgroundColor: e.target.value }))}
                          className="w-12 h-10 rounded border border-gray-300"
                        />
                        <Input
                          value={customization.backgroundColor}
                          onChange={(e) => setCustomization(prev => ({ ...prev, backgroundColor: e.target.value }))}
                          className="flex-1 text-gray-900 font-medium"
                          placeholder="#ffffff"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Message Colors */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-gray-900">ألوان الرسائل</h3>
                    
                    <div>
                      <label className="block text-sm font-bold text-gray-900 mb-2">
                        لون رسائل المستخدم
                      </label>
                      <div className="flex items-center space-x-3 rtl:space-x-reverse">
                        <input
                          type="color"
                          value={customization.userMessageColor}
                          onChange={(e) => setCustomization(prev => ({ ...prev, userMessageColor: e.target.value }))}
                          className="w-12 h-10 rounded border border-gray-300"
                        />
                        <Input
                          value={customization.userMessageColor}
                          onChange={(e) => setCustomization(prev => ({ ...prev, userMessageColor: e.target.value }))}
                          className="flex-1 text-gray-900 font-medium"
                          placeholder="#007bff"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-900 mb-2">
                        لون رسائل البوت
                      </label>
                      <div className="flex items-center space-x-3 rtl:space-x-reverse">
                        <input
                          type="color"
                          value={customization.botMessageColor}
                          onChange={(e) => setCustomization(prev => ({ ...prev, botMessageColor: e.target.value }))}
                          className="w-12 h-10 rounded border border-gray-300"
                        />
                        <Input
                          value={customization.botMessageColor}
                          onChange={(e) => setCustomization(prev => ({ ...prev, botMessageColor: e.target.value }))}
                          className="flex-1 text-gray-900 font-medium"
                          placeholder="#f8f9fa"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-900 mb-2">
                        لون النص
                      </label>
                      <div className="flex items-center space-x-3 rtl:space-x-reverse">
                        <input
                          type="color"
                          value={customization.textColor}
                          onChange={(e) => setCustomization(prev => ({ ...prev, textColor: e.target.value }))}
                          className="w-12 h-10 rounded border border-gray-300"
                        />
                        <Input
                          value={customization.textColor}
                          onChange={(e) => setCustomization(prev => ({ ...prev, textColor: e.target.value }))}
                          className="flex-1 text-gray-900 font-medium"
                          placeholder="#333333"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Style Options */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-gray-900">خيارات التصميم</h3>
                    
                    <div>
                      <label className="block text-sm font-bold text-gray-900 mb-2">
                        نوع الخط
                      </label>
                      <select
                        value={customization.fontFamily}
                        onChange={(e) => setCustomization(prev => ({ ...prev, fontFamily: e.target.value }))}
                        className="w-full p-2 border border-gray-300 rounded-lg text-gray-900 font-medium"
                      >
                        <option value="Inter">Inter (حديث)</option>
                        <option value="Cairo">Cairo (عربي)</option>
                        <option value="Tajawal">Tajawal (عربي مبسط)</option>
                        <option value="system-ui">النظام الافتراضي</option>
                        <option value="serif">Serif (كلاسيكي)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-900 mb-2">
                        انحناء الحواف
                      </label>
                      <select
                        value={customization.borderRadius}
                        onChange={(e) => setCustomization(prev => ({ ...prev, borderRadius: e.target.value }))}
                        className="w-full p-2 border border-gray-300 rounded-lg text-gray-900 font-medium"
                      >
                        <option value="small">مربع (8px)</option>
                        <option value="medium">متوسط (12px)</option>
                        <option value="large">دائري (16px)</option>
                        <option value="full">دائري تماماً</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-900 mb-2">
                        نمط الحركة
                      </label>
                      <select
                        value={customization.animationStyle}
                        onChange={(e) => setCustomization(prev => ({ ...prev, animationStyle: e.target.value }))}
                        className="w-full p-2 border border-gray-300 rounded-lg text-gray-900 font-medium"
                      >
                        <option value="none">بدون حركة</option>
                        <option value="smooth">ناعم</option>
                        <option value="bouncy">مرن</option>
                        <option value="fast">سريع</option>
                      </select>
                    </div>
                  </div>

                  {/* Advanced Options */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-gray-900">خيارات متقدمة</h3>
                    
                    <div>
                      <label className="block text-sm font-bold text-gray-900 mb-2">
                        أسلوب الهيدر
                      </label>
                      <select
                        value={customization.headerStyle}
                        onChange={(e) => setCustomization(prev => ({ ...prev, headerStyle: e.target.value }))}
                        className="w-full p-2 border border-gray-300 rounded-lg text-gray-900 font-medium"
                      >
                        <option value="modern">حديث</option>
                        <option value="classic">كلاسيكي</option>
                        <option value="minimal">بسيط</option>
                        <option value="gradient">متدرج</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-900 mb-2">
                        أسلوب الرسائل
                      </label>
                      <select
                        value={customization.messageStyle}
                        onChange={(e) => setCustomization(prev => ({ ...prev, messageStyle: e.target.value }))}
                        className="w-full p-2 border border-gray-300 rounded-lg text-gray-900 font-medium"
                      >
                        <option value="rounded">دائري</option>
                        <option value="square">مربع</option>
                        <option value="bubble">فقاعة</option>
                        <option value="flat">مسطح</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-900 mb-2">
                        رابط الصورة الشخصية (اختياري)
                      </label>
                      <Input
                        value={customization.logoUrl || ''}
                        onChange={(e) => setCustomization(prev => ({ ...prev, logoUrl: e.target.value }))}
                        placeholder="https://example.com/logo.png"
                        className="text-gray-900 font-medium"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-gray-200 flex justify-between">
                  <button
                    onClick={resetToDefaults}
                    className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
                  >
                    🔄 إعادة تعيين
                  </button>
                  <div className="space-x-3 rtl:space-x-reverse">
                    <button
                      onClick={() => setActiveTab('preview')}
                      className="bg-blue-100 text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-200"
                    >
                      👁️ معاينة
                    </button>
                    <button
                      onClick={saveCustomization}
                      disabled={isSaving}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      💾 حفظ
                    </button>
                  </div>
                </div>
              </Card>
            )}

            {activeTab === 'messages' && (
              <Card className="p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">💬 تخصيص النصوص</h2>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-2">
                      رسالة الترحيب
                    </label>
                    <textarea
                      value={customization.welcomeMessage}
                      onChange={(e) => setCustomization(prev => ({ ...prev, welcomeMessage: e.target.value }))}
                      className="w-full p-3 border border-gray-300 rounded-lg resize-none text-gray-900 font-medium"
                      rows={3}
                      placeholder="مرحبا! كيف يمكنني مساعدتك اليوم؟"
                    />
                    <p className="text-xs text-gray-800 mt-1 font-medium">
                      هذه هي أول رسالة يراها العميل عند فتح الشات
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-900 mb-2">
                        نص صندوق الإدخال
                      </label>
                      <Input
                        value={customization.placeholderText}
                        onChange={(e) => setCustomization(prev => ({ ...prev, placeholderText: e.target.value }))}
                        placeholder="اكتب رسالتك هنا..."
                        className="text-gray-900 font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-900 mb-2">
                        نص زر الإرسال
                      </label>
                      <Input
                        value={customization.sendButtonText}
                        onChange={(e) => setCustomization(prev => ({ ...prev, sendButtonText: e.target.value }))}
                        placeholder="إرسال"
                        className="text-gray-900 font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-900 mb-2">
                        نص مؤشر الكتابة
                      </label>
                      <Input
                        value={customization.typingIndicator}
                        onChange={(e) => setCustomization(prev => ({ ...prev, typingIndicator: e.target.value }))}
                        placeholder="يكتب..."
                        className="text-gray-900 font-medium"
                      />
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="text-sm font-bold text-blue-900 mb-2">ℹ️ ملاحظة مهمة</h4>
                    <p className="text-sm text-blue-800 font-medium">
                      رسائل الحدود (تجاوز الحد اليومي/الشهري) والرسائل الإجبارية يتم توليدها تلقائياً بناءً على لغة المستخدم ولا يمكن تخصيصها لضمان وضوح المعلومات المهمة.
                    </p>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-gray-200 flex justify-end">
                  <button
                    onClick={saveCustomization}
                    disabled={isSaving}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-bold"
                  >
                    💾 حفظ النصوص
                  </button>
                </div>
              </Card>
            )}

            {activeTab === 'preview' && (
              <Card className="p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">👁️ معاينة مباشرة</h2>
                <p className="text-gray-600 mb-6">هذه معاينة لكيفية ظهور الشات مع التخصيصات الحالية</p>
                
                <div className="border border-gray-300 rounded-lg overflow-hidden bg-gray-100">
                  {/* Live Preview will be rendered here */}
                  <div className="text-center py-8 text-gray-500">
                    🚧 معاينة مباشرة ستكون متاحة قريباً
                  </div>
                </div>

                <div className="mt-6 flex justify-center">
                  <button
                    onClick={testChatbot}
                    className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 flex items-center"
                  >
                    🔗 اختبار الشات الحقيقي
                  </button>
                </div>
              </Card>
            )}
          </div>

          {/* Quick Preview Panel */}
          <div className="lg:col-span-1">
            <Card className="p-4 sticky top-6">
              <h3 className="font-semibold text-gray-900 mb-4">معاينة سريعة</h3>
              
              {/* Mini Chat Preview */}
              <div 
                className="rounded-lg overflow-hidden"
                style={{ 
                  background: `linear-gradient(135deg, ${customization.primaryColor}10, ${customization.backgroundColor})`
                }}
              >
                {/* Mini Header */}
                <div 
                  className="p-3 text-white text-sm"
                  style={{ backgroundColor: customization.primaryColor }}
                >
                  <div className="flex items-center space-x-2 rtl:space-x-reverse">
                    <div className="w-6 h-6 bg-white/20 rounded-full"></div>
                    <span>متجرك</span>
                  </div>
                </div>

                {/* Mini Messages */}
                <div className="p-3 space-y-2 max-h-48 overflow-y-auto">
                  {previewMessages.map((message, index) => (
                    <div
                      key={index}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs px-3 py-2 text-xs`}
                        style={{
                          backgroundColor: message.role === 'user' ? customization.userMessageColor : customization.botMessageColor,
                          color: message.role === 'user' ? 'white' : customization.textColor,
                          borderRadius: customization.borderRadius === 'small' ? '8px' : 
                                       customization.borderRadius === 'medium' ? '12px' :
                                       customization.borderRadius === 'large' ? '16px' : '9999px',
                          fontFamily: customization.fontFamily
                        }}
                      >
                        {message.content}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Mini Input */}
                <div className="p-3 bg-white">
                  <div className="flex items-center space-x-2 rtl:space-x-reverse">
                    <div 
                      className="flex-1 px-3 py-2 bg-gray-100 text-xs"
                      style={{ 
                        borderRadius: customization.borderRadius === 'small' ? '8px' : 
                                     customization.borderRadius === 'medium' ? '12px' :
                                     customization.borderRadius === 'large' ? '16px' : '9999px',
                        fontFamily: customization.fontFamily,
                        color: customization.textColor
                      }}
                    >
                      {customization.placeholderText}
                    </div>
                    <div 
                      className="px-3 py-2 text-white text-xs"
                      style={{ 
                        backgroundColor: customization.primaryColor,
                        borderRadius: customization.borderRadius === 'small' ? '8px' : 
                                     customization.borderRadius === 'medium' ? '12px' :
                                     customization.borderRadius === 'large' ? '16px' : '9999px'
                      }}
                    >
                      {customization.sendButtonText}
                    </div>
                  </div>
                </div>
              </div>

              {/* Color Palette */}
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">لوحة الألوان</h4>
                <div className="grid grid-cols-3 gap-2">
                  <div 
                    className="h-8 rounded"
                    style={{ backgroundColor: customization.primaryColor }}
                    title="اللون الأساسي"
                  ></div>
                  <div 
                    className="h-8 rounded"
                    style={{ backgroundColor: customization.userMessageColor }}
                    title="رسائل المستخدم"
                  ></div>
                  <div 
                    className="h-8 rounded border"
                    style={{ backgroundColor: customization.botMessageColor }}
                    title="رسائل البوت"
                  ></div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="mt-4 space-y-2">
                <button
                  onClick={() => setActiveTab('appearance')}
                  className="w-full text-left px-3 py-2 text-sm rounded hover:bg-gray-100"
                >
                  🎨 تعديل الألوان
                </button>
                <button
                  onClick={() => setActiveTab('messages')}
                  className="w-full text-left px-3 py-2 text-sm rounded hover:bg-gray-100"
                >
                  💬 تعديل النصوص
                </button>
                <button
                  onClick={testChatbot}
                  className="w-full text-left px-3 py-2 text-sm rounded hover:bg-gray-100 text-green-600"
                >
                  🔗 اختبار مباشر
                </button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
} 