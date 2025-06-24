'use client'

import React, { useState, useEffect, useRef } from 'react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Card from '@/components/ui/Card'

interface Merchant {
  id: string
  businessName: string
  welcomeMessage: string
  primaryColor: string
  logoUrl?: string
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface ChatPageProps {
  params: Promise<{ chatbotId: string }>
}

export default function ChatPage({ params }: ChatPageProps) {
  const [chatbotId, setChatbotId] = useState<string>('')
  const [merchant, setMerchant] = useState<Merchant | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingMerchant, setIsLoadingMerchant] = useState(true)
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Resolve params and get chatbotId
  useEffect(() => {
    const resolveChatbotId = async () => {
      const resolvedParams = await params
      setChatbotId(resolvedParams.chatbotId)
    }
    resolveChatbotId()
  }, [params])

  // Load merchant info
  useEffect(() => {
    if (!chatbotId) return

    const loadMerchant = async () => {
      try {
        const response = await fetch(`/api/merchant/${chatbotId}`)
        if (response.ok) {
          const merchantData = await response.json()
          setMerchant(merchantData)
          
          // Add welcome message
          const welcomeMsg: Message = {
            id: `welcome_${Date.now()}`,
            role: 'assistant',
            content: merchantData.welcomeMessage || 'مرحبا! كيف يمكنني مساعدتك اليوم؟',
            timestamp: new Date()
          }
          setMessages([welcomeMsg])
        } else {
          console.error('Merchant not found')
        }
      } catch (error) {
        console.error('Error loading merchant:', error)
      } finally {
        setIsLoadingMerchant(false)
      }
    }

    loadMerchant()
  }, [chatbotId])

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading || !merchant) return

    const userMessage: Message = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: inputMessage.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setIsLoading(true)

    try {
      const response = await fetch(`/api/chat/${chatbotId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage.content,
          sessionId,
          conversationHistory: messages.slice(-30) // Last 30 messages for context
        }),
      })

      if (response.ok) {
        const data = await response.json()
        const assistantMessage: Message = {
          id: `assistant_${Date.now()}`,
          role: 'assistant',
          content: data.response,
          timestamp: new Date()
        }
        setMessages(prev => [...prev, assistantMessage])
      } else {
        throw new Error('Failed to get response')
      }
    } catch (error) {
      console.error('Error sending message:', error)
      const errorMessage: Message = {
        id: `error_${Date.now()}`,
        role: 'assistant',
        content: 'عذراً، حدث خطأ في النظام. يرجى المحاولة مرة أخرى.',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  if (isLoadingMerchant) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحميل المحادثة...</p>
        </div>
      </div>
    )
  }

  if (!merchant) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center">
        <Card className="max-w-md mx-auto text-center p-8">
          <div className="text-red-500 text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-4">المتجر غير موجود</h1>
          <p className="text-gray-600">عذراً، لم نتمكن من العثور على هذا المتجر.</p>
        </Card>
      </div>
    )
  }

  return (
    <div 
      className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50"
      style={{ 
        background: `linear-gradient(135deg, ${merchant.primaryColor}10, ${merchant.primaryColor}05)`
      }}
    >
      {/* Header */}
      <div 
        className="bg-white shadow-lg border-b-4"
        style={{ borderBottomColor: merchant.primaryColor }}
      >
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center space-x-4 rtl:space-x-reverse">
            {merchant.logoUrl ? (
              <img 
                src={merchant.logoUrl} 
                alt={merchant.businessName}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <div 
                className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
                style={{ backgroundColor: merchant.primaryColor }}
              >
                {merchant.businessName.charAt(0)}
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold text-gray-800">{merchant.businessName}</h1>
              <p className="text-sm text-gray-500">مساعد ذكي • متاح الآن</p>
            </div>
            <div className="flex-1"></div>
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-green-600 font-medium">متصل</span>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Container */}
      <div className="max-w-4xl mx-auto p-4 h-[calc(100vh-120px)] flex flex-col">
        
        {/* Messages */}
        <div className="flex-1 overflow-y-auto mb-4 space-y-4 pb-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs sm:max-w-md lg:max-w-lg px-4 py-3 rounded-2xl ${
                  message.role === 'user'
                    ? 'text-white shadow-lg'
                    : 'bg-white text-gray-800 shadow-md border'
                }`}
                style={{
                  backgroundColor: message.role === 'user' ? merchant.primaryColor : undefined
                }}
              >
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                <p className={`text-xs mt-2 ${
                  message.role === 'user' ? 'text-white/80' : 'text-gray-500'
                }`}>
                  {message.timestamp.toLocaleTimeString('ar-SA', { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    hour12: true
                  })}
                </p>
              </div>
            </div>
          ))}
          
          {/* Loading indicator */}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white text-gray-800 shadow-md border px-4 py-3 rounded-2xl">
                <div className="flex items-center space-x-2 rtl:space-x-reverse">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                  <span className="text-sm text-gray-500">جاري الكتابة...</span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="bg-white rounded-2xl shadow-lg border p-4">
          <div className="flex items-end space-x-3 rtl:space-x-reverse">
            <div className="flex-1">
              <Input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="اكتب رسالتك هنا..."
                className="resize-none border-0 focus:ring-0 text-base"
                disabled={isLoading}
                dir="rtl"
              />
            </div>
            <Button
              onClick={sendMessage}
              disabled={isLoading || !inputMessage.trim()}
              className="px-6 py-3 rounded-xl font-medium transition-all duration-200 hover:scale-105"
              style={{ 
                backgroundColor: merchant.primaryColor,
                borderColor: merchant.primaryColor
              }}
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                'إرسال'
              )}
            </Button>
          </div>
          
          <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
            <p>اضغط Enter للإرسال • Shift + Enter للسطر الجديد</p>
            <p className="flex items-center space-x-1 rtl:space-x-reverse">
              <span>مدعوم بـ</span>
              <span className="font-semibold" style={{ color: merchant.primaryColor }}>
                AI Shop Mate
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
} 