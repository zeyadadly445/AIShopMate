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
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Storage key for this specific chatbot
  const storageKey = `chat_${chatbotId}_messages`

  // Resolve params and get chatbotId
  useEffect(() => {
    const resolveChatbotId = async () => {
      const resolvedParams = await params
      setChatbotId(resolvedParams.chatbotId)
    }
    resolveChatbotId()
  }, [params])

  // Load merchant info and restore chat history
  useEffect(() => {
    if (!chatbotId) return

    const loadMerchant = async () => {
      try {
        const response = await fetch(`/api/merchant/${chatbotId}`)
        if (response.ok) {
          const merchantData = await response.json()
          setMerchant(merchantData)
          
          // Load saved messages from localStorage
          const savedMessages = localStorage.getItem(storageKey)
          
          if (savedMessages) {
            try {
              const parsedMessages = JSON.parse(savedMessages).map((msg: any) => ({
                ...msg,
                timestamp: new Date(msg.timestamp)
              }))
              setMessages(parsedMessages)
              console.log('📱 Restored', parsedMessages.length, 'messages from local storage')
            } catch (error) {
              console.error('Error parsing saved messages:', error)
              // Start fresh if saved data is corrupted
              const welcomeMsg: Message = {
                id: `welcome_${Date.now()}`,
                role: 'assistant',
                content: merchantData.welcomeMessage || 'مرحبا! كيف يمكنني مساعدتك اليوم؟',
                timestamp: new Date()
              }
              setMessages([welcomeMsg])
            }
          } else {
            // No saved messages, start with welcome message
            const welcomeMsg: Message = {
              id: `welcome_${Date.now()}`,
              role: 'assistant',
              content: merchantData.welcomeMessage || 'مرحبا! كيف يمكنني مساعدتك اليوم؟',
              timestamp: new Date()
            }
            setMessages([welcomeMsg])
          }
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
  }, [chatbotId, storageKey])

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(storageKey, JSON.stringify(messages))
      console.log('💾 Saved', messages.length, 'messages to local storage')
    }
  }, [messages, storageKey])

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

    // Add user message immediately
    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setInputMessage('')
    setIsLoading(true)

    try {
      // Prepare conversation history for AI context (last 20 messages)
      const conversationHistory = updatedMessages.slice(-20).map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp.toISOString()
      }))

      console.log('📤 Sending message with', conversationHistory.length, 'context messages')

      const response = await fetch(`/api/chat-local/${chatbotId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage.content,
          conversationHistory: conversationHistory.slice(0, -1) // Don't include the current message
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
        console.log('✅ AI response received and saved locally')
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

  const clearChatHistory = () => {
    if (confirm('هل تريد مسح جميع الرسائل؟ هذا الإجراء لا يمكن التراجع عنه.')) {
      localStorage.removeItem(storageKey)
      // Reset to welcome message only
      if (merchant) {
        const welcomeMsg: Message = {
          id: `welcome_${Date.now()}`,
          role: 'assistant',
          content: merchant.welcomeMessage || 'مرحبا! كيف يمكنني مساعدتك اليوم؟',
          timestamp: new Date()
        }
        setMessages([welcomeMsg])
        console.log('🗑️ Chat history cleared')
      }
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
            <div className="flex items-center space-x-3 rtl:space-x-reverse">
              <button
                onClick={clearChatHistory}
                className="p-2 text-gray-500 hover:text-red-600 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                title="مسح المحادثة"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-green-600 font-medium">متصل</span>
                <span className="text-xs text-gray-400">• محفوظ محلياً</span>
              </div>
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