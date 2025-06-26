'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import rehypeRaw from 'rehype-raw'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Card from '@/components/ui/Card'
import { formatGregorianTime } from '@/lib/date-utils'

interface Merchant {
  id: string
  businessName: string
  welcomeMessage: string
  primaryColor: string
}

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
  const [customization, setCustomization] = useState<ChatCustomization | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingMerchant, setIsLoadingMerchant] = useState(true)
  const [streamingMessage, setStreamingMessage] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Generate or get session ID
  const [sessionId, setSessionId] = useState('')
  
  useEffect(() => {
    // Generate a unique session ID for this browser session
    let existingSessionId = sessionStorage.getItem('chat_session_id')
    if (!existingSessionId) {
      existingSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      sessionStorage.setItem('chat_session_id', existingSessionId)
    }
    setSessionId(existingSessionId)
  }, [])

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

  // Load merchant info and check basic availability
  useEffect(() => {
    if (!chatbotId) return

    const loadMerchant = async () => {
      try {
        // تحميل بيانات التاجر والتخصيصات بالتوازي
        const [merchantResponse, customizationResponse] = await Promise.all([
          fetch(`/api/merchant/${chatbotId}`),
          fetch(`/api/chat-appearance/${chatbotId}`)
        ])
        
        if (merchantResponse.ok) {
          const merchantData = await merchantResponse.json()
          setMerchant(merchantData)
          
          // تحميل التخصيصات
          if (customizationResponse.ok) {
            const customizationData = await customizationResponse.json()
            setCustomization(customizationData)
            console.log('🎨 Chat customization loaded:', customizationData)
          } else {
            console.log('🎨 No customization found, using defaults')
          }
          
          // Load saved messages from localStorage
          const savedMessages = localStorage.getItem(storageKey)
          console.log('🔍 LOADING FROM LOCALSTORAGE:')
          console.log('Storage key:', storageKey)
          console.log('Saved data exists:', !!savedMessages)
          
          if (savedMessages) {
            try {
              const parsedMessages = JSON.parse(savedMessages).map((msg: any) => ({
                ...msg,
                timestamp: new Date(msg.timestamp)
              }))
              setMessages(parsedMessages)
              console.log('📱 Restored', parsedMessages.length, 'messages from localStorage')
              console.log('📱 First 3 restored messages:')
              parsedMessages.slice(0, 3).forEach((msg: any, index: number) => {
                console.log(`  ${index + 1}. [${msg.role}] "${msg.content.substring(0, 30)}..."`)
              })
              console.log('📱 Last 3 restored messages:')
              parsedMessages.slice(-3).forEach((msg: any, index: number) => {
                console.log(`  ${index + 1}. [${msg.role}] "${msg.content.substring(0, 30)}..."`)
              })
            } catch (error) {
              console.error('❌ Error parsing saved messages:', error)
              console.log('Saved data that failed to parse:', savedMessages?.substring(0, 200) + '...')
              // Start fresh if saved data is corrupted
              const welcomeMsg: Message = {
                id: `welcome_${Date.now()}`,
                role: 'assistant',
                content: merchantData.welcomeMessage || 'مرحبا! كيف يمكنني مساعدتك اليوم؟',
                timestamp: new Date()
              }
              setMessages([welcomeMsg])
              console.log('🆕 Started with fresh welcome message')
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
            console.log('🆕 No saved messages found, started with welcome message')
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
    if (messages.length > 0 && chatbotId) {
      const messagesToSave = messages.map(msg => ({
        ...msg,
        timestamp: msg.timestamp.toISOString() // Ensure timestamp is serializable
      }))
      localStorage.setItem(storageKey, JSON.stringify(messagesToSave))
      console.log('💾 Saved', messages.length, 'messages to localStorage')
      console.log('💾 Storage key:', storageKey)
      console.log('💾 Last 3 messages saved:')
      messages.slice(-3).forEach((msg, index) => {
        console.log(`  ${index + 1}. [${msg.role}] "${msg.content.substring(0, 30)}..."`)
      })
    }
  }, [messages, storageKey, chatbotId])

  // Update welcome message when customization is loaded
  useEffect(() => {
    if (customization && messages.length > 0 && messages[0].role === 'assistant') {
      const currentWelcome = customization.welcomeMessage
      if (messages[0].content !== currentWelcome) {
        setMessages(prev => [
          {
            ...prev[0],
            content: currentWelcome
          },
          ...prev.slice(1)
        ])
        console.log('🎨 Welcome message updated from customization')
      }
    }
  }, [customization])

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingMessage])

  // Auto-resize textarea based on content
  useEffect(() => {
    const textarea = document.querySelector('textarea') as HTMLTextAreaElement
    if (textarea) {
      const autoResize = () => {
        textarea.style.height = 'auto'
        const newHeight = Math.min(textarea.scrollHeight, window.innerWidth < 640 ? 120 : 140)
        textarea.style.height = newHeight + 'px'
      }
      
      textarea.addEventListener('input', autoResize)
      autoResize() // Initial resize
      
      return () => {
        textarea.removeEventListener('input', autoResize)
      }
    }
  }, [inputMessage])

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading || !merchant || !sessionId) return

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
    setIsStreaming(true)
    setStreamingMessage('')

    try {
      console.log('🌊 Starting streaming chat with conversation history...')

      // 🔍 DEBUG: Log current messages state
      console.log('🔍 FRONTEND DEBUG - MESSAGES STATE:')
      console.log('Total messages in state:', updatedMessages.length)
      updatedMessages.forEach((msg, index) => {
        console.log(`${index + 1}. [${msg.role}] "${msg.content.substring(0, 50)}..." (${msg.timestamp.toLocaleTimeString()})`)
      })

      // Prepare conversation history for AI context (last 25 messages excluding current user message)
      const conversationHistory = updatedMessages.slice(-26, -1).map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp.toISOString()
      }))

      console.log('📤 Sending with', conversationHistory.length, 'context messages')
      
      // 🔍 DEBUG: Log what we're sending as history
      console.log('🔍 CONVERSATION HISTORY TO SEND:')
      conversationHistory.forEach((msg, index) => {
        console.log(`${index + 1}. [${msg.role}] "${msg.content.substring(0, 50)}..."`)
      })
      console.log('📨 Current user message:', userMessage.content)

      // Use the main chat endpoint with conversation history
      const response = await fetch(`/api/chat/${chatbotId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage.content,
          sessionId: sessionId,
          conversationHistory: conversationHistory, // Send conversation history
          stream: true
        }),
      })

      // Handle API response
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      // التحقق إذا كان الرد يحتوي على رسالة حد
      const contentType = response.headers.get('content-type')
      if (contentType && contentType.includes('application/json')) {
        const jsonResponse = await response.json()
        
        if (jsonResponse.isLimitReached) {
          console.log('📝 Limit message received:', jsonResponse.response)
          
          // إضافة رسالة الحد كرد من الشات بوت
          const limitMessage: Message = {
            id: `limit_${Date.now()}`,
            role: 'assistant',
            content: jsonResponse.response,
            timestamp: new Date()
          }
          setMessages(prev => [...prev, limitMessage])
          
          setIsLoading(false)
          setIsStreaming(false)
          setStreamingMessage('')
          return
        }
        
        // إذا كان JSON response عادي (غير streaming)
        if (jsonResponse.response) {
          const assistantMessage: Message = {
            id: `assistant_${Date.now()}`,
            role: 'assistant',
            content: jsonResponse.response,
            timestamp: new Date()
          }
          setMessages(prev => [...prev, assistantMessage])
          
          setIsLoading(false)
          setIsStreaming(false)
          setStreamingMessage('')
          return
        }
      }

      // معالجة الـ streaming response العادي
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let accumulatedMessage = ''

      if (!reader) {
        throw new Error('No response body reader available')
      }

      console.log('🚀 Starting to read stream...')

      // 🎬 FRONTEND STREAMING MONITOR
      let frontendChunkCount = 0
      let frontendStartTime = Date.now()
      let lastFrontendChunk = frontendStartTime
      let frontendMaxDelay = 0
      let frontendDelayCount = 0

      console.log('🎬 FRONTEND STREAMING MONITOR STARTED')

      while (true) {
        const chunkReceiveStartTime = Date.now()
        const { done, value } = await reader.read()
        const chunkReceiveEndTime = Date.now()
        
        const receiveDelay = chunkReceiveEndTime - chunkReceiveStartTime
        const timeSinceLastFrontendChunk = chunkReceiveStartTime - lastFrontendChunk

        if (timeSinceLastFrontendChunk > frontendMaxDelay) {
          frontendMaxDelay = timeSinceLastFrontendChunk
        }

        if (timeSinceLastFrontendChunk > 1000) {
          frontendDelayCount++
          console.log(`🐌 FRONTEND DELAY: ${timeSinceLastFrontendChunk}ms between chunks`)
        }

        frontendChunkCount++
        lastFrontendChunk = chunkReceiveEndTime

        // Log every 5th chunk
        if (frontendChunkCount % 5 === 0) {
          console.log(`📥 Frontend chunk ${frontendChunkCount}: receive delay ${receiveDelay}ms, gap ${timeSinceLastFrontendChunk}ms`)
        }
        
        if (done) {
          const frontendTotalTime = Date.now() - frontendStartTime
          console.log('✅ FRONTEND STREAMING SUMMARY:')
          console.log(`📊 Frontend total time: ${frontendTotalTime}ms`)
          console.log(`📦 Frontend chunks received: ${frontendChunkCount}`)
          console.log(`🐌 Frontend max delay: ${frontendMaxDelay}ms`)
          console.log(`⚠️ Frontend delays over 1s: ${frontendDelayCount}`)
          console.log('✅ Stream completed')
          break
        }

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim()
            
            if (data === '[DONE]') {
              console.log('🏁 Stream finished signal received')
              
              // Add the complete message to messages array (will be saved to localStorage automatically)
              if (accumulatedMessage.trim()) {
                const assistantMessage: Message = {
                  id: `assistant_${Date.now()}`,
                  role: 'assistant',
                  content: accumulatedMessage.trim(),
                  timestamp: new Date()
                }
                setMessages(prev => [...prev, assistantMessage])
                console.log('✅ Complete AI response saved to localStorage:', accumulatedMessage.length, 'characters')
                console.log('💾 Final message content:', accumulatedMessage.substring(0, 100) + '...')
              }
              
              setStreamingMessage('')
              setIsStreaming(false)
              setIsLoading(false)
              return
            }

            try {
              const parsed = JSON.parse(data)
              const content = parsed.delta || parsed.content || ''
              
              if (content) {
                accumulatedMessage += content
                setStreamingMessage(accumulatedMessage)
                // console.log('📝 Streaming:', content) // Too verbose
              }
            } catch (parseError) {
              console.error('Error parsing streaming data:', parseError)
            }
          }
        }
      }

    } catch (error) {
      console.error('Error in streaming chat:', error)
      const errorMessage: Message = {
        id: `error_${Date.now()}`,
        role: 'assistant',
        content: 'عذراً، حدث خطأ في النظام. يرجى المحاولة مرة أخرى.',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
      setIsStreaming(false)
      setStreamingMessage('')
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white/70 backdrop-blur-xl rounded-3xl p-12 shadow-2xl border border-white/20">
          <div className="text-center">
            <div className="relative mb-8">
              <div className="w-16 h-16 border-4 border-blue-200 rounded-full animate-spin mx-auto"></div>
              <div className="w-16 h-16 border-4 border-transparent border-t-blue-600 rounded-full animate-spin absolute top-0 left-1/2 transform -translate-x-1/2"></div>
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">جاري تحميل المحادثة</h3>
            <p className="text-gray-600">يرجى الانتظار لحظة...</p>
            <div className="mt-6 flex items-center justify-center space-x-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!merchant) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-pink-50 to-rose-100 flex items-center justify-center p-4">
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-12 shadow-2xl border border-white/20 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-red-400 to-pink-500 rounded-full flex items-center justify-center text-white text-3xl font-bold mx-auto mb-6">
            ❌
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-4">المتجر غير موجود</h1>
          <p className="text-gray-600 mb-6">عذراً، لم نتمكن من العثور على هذا المتجر. يرجى التحقق من الرابط والمحاولة مرة أخرى.</p>
          <button 
            onClick={() => window.history.back()}
            className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 py-3 rounded-2xl font-medium hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1"
          >
            العودة للخلف
          </button>
        </div>
      </div>
    )
  }

  return (
    <div 
      className="min-h-screen relative overflow-hidden"
      style={{ 
        background: customization 
          ? `
            radial-gradient(circle at 20% 80%, ${customization.primaryColor}12 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, ${customization.primaryColor}08 0%, transparent 50%),
            radial-gradient(circle at 40% 40%, ${customization.secondaryColor || customization.primaryColor}06 0%, transparent 50%),
            linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%),
            #f8fafc
          `
          : `
            radial-gradient(circle at 20% 80%, ${merchant.primaryColor}12 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, ${merchant.primaryColor}08 0%, transparent 50%),
            radial-gradient(circle at 40% 40%, ${merchant.primaryColor}06 0%, transparent 50%),
            linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%),
            #f8fafc
          `,
        fontFamily: customization?.fontFamily || 'Inter, system-ui, sans-serif'
      }}
    >
      {/* Advanced Glassmorphism Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Primary Glass Orbs */}
        <div 
          className="absolute -top-20 -right-20 w-40 h-40 rounded-full opacity-30 animate-float"
          style={{
            background: `radial-gradient(circle, ${customization?.primaryColor || merchant.primaryColor}20 0%, transparent 70%)`,
            backdropFilter: 'blur(40px)',
            border: '1px solid rgba(255,255,255,0.1)'
          }}
        ></div>
        <div 
          className="absolute -bottom-20 -left-20 w-60 h-60 rounded-full opacity-20 animate-float-delay"
          style={{
            background: `radial-gradient(circle, ${customization?.primaryColor || merchant.primaryColor}15 0%, transparent 70%)`,
            backdropFilter: 'blur(50px)',
            border: '1px solid rgba(255,255,255,0.08)',
            animationDelay: '2s'
          }}
        ></div>
        
        {/* Floating Glass Particles */}
        <div className="absolute top-1/4 left-1/4 w-3 h-3 bg-white/20 rounded-full blur-sm animate-pulse"></div>
        <div className="absolute top-3/4 right-1/4 w-2 h-2 bg-white/15 rounded-full blur-sm animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-3/4 w-4 h-4 bg-white/10 rounded-full blur-sm animate-pulse" style={{ animationDelay: '3s' }}></div>
        
        {/* Crystal-like geometric shapes */}
        <div className="absolute top-1/3 right-1/3 w-8 h-8 transform rotate-45 opacity-10">
          <div 
            className="w-full h-full border border-white/20 backdrop-blur-sm"
            style={{ 
              background: `linear-gradient(135deg, ${customization?.primaryColor || merchant.primaryColor}10, transparent)`,
              clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)'
            }}
          ></div>
        </div>
      </div>

      {/* CSS for animations */}
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-20px) scale(1.05); }
        }
        @keyframes float-delay {
          0%, 100% { transform: translateY(0px) scale(1) rotate(0deg); }
          50% { transform: translateY(-15px) scale(1.08) rotate(3deg); }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        .animate-float-delay {
          animation: float-delay 8s ease-in-out infinite;
        }
      `}</style>

      {/* Header */}
      <div className="relative z-10">
        <div 
          className="backdrop-blur-xl border-b"
          style={{ 
            background: customization?.headerStyle === 'gradient' 
              ? `linear-gradient(135deg, ${customization.primaryColor}e6, ${customization.secondaryColor}e6)`
              : 'rgba(255, 255, 255, 0.85)',
            borderColor: customization?.primaryColor ? `${customization.primaryColor}20` : 'rgba(0, 0, 0, 0.1)'
          }}
        >
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
            <div className="flex items-center space-x-4 rtl:space-x-reverse">
              
              {/* Avatar */}
              <div className="relative">
                {customization?.logoUrl ? (
                  <div className="relative">
                    <img 
                      src={customization.logoUrl} 
                      alt={merchant.businessName}
                      className="w-14 h-14 rounded-2xl object-cover shadow-lg border-2 border-white/50"
                    />
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 border-2 border-white rounded-full shadow-md"></div>
                  </div>
                ) : (
                  <div className="relative">
                    <div 
                      className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg border-2 border-white/30"
                      style={{ 
                        background: `linear-gradient(135deg, ${customization?.primaryColor || merchant.primaryColor}, ${customization?.secondaryColor || customization?.primaryColor || merchant.primaryColor}cc)`
                      }}
                    >
                      {merchant.businessName.charAt(0)}
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 border-2 border-white rounded-full shadow-md"></div>
                  </div>
                )}
              </div>

              {/* Business Info */}
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-bold text-gray-800 truncate">{merchant.businessName}</h1>
                <div className="flex items-center space-x-2 rtl:space-x-reverse">
                  <div className="flex items-center space-x-1 rtl:space-x-reverse">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium text-green-600">مساعد ذكي متاح الآن</span>
                  </div>
                  {isStreaming && (
                    <div className="flex items-center space-x-1 rtl:space-x-reverse">
                      <div className="flex space-x-1">
                        <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce"></div>
                        <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                      <span className="text-sm font-medium text-blue-600">{customization?.typingIndicator || 'يكتب...'}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Status Indicator */}
              <div className="hidden sm:flex items-center space-x-3 rtl:space-x-reverse">
                <div className="text-right">
                  <div className={`text-sm font-medium ${isStreaming ? 'text-blue-600' : 'text-green-600'}`}>
                    {isStreaming ? 'جاري الكتابة...' : 'متصل'}
                  </div>
                  <div className="text-xs text-gray-500">AI مدعوم بـ</div>
                </div>
                <div className={`w-4 h-4 rounded-full shadow-lg ${isStreaming ? 'bg-blue-500 animate-pulse' : 'bg-green-500'}`}></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Container */}
      <div className="relative z-10 max-w-4xl mx-auto p-2 sm:p-4 lg:p-6">
        <div className="h-[calc(100vh-120px)] sm:h-[calc(100vh-140px)] flex flex-col">
          
          {/* Messages Area */}
          <div className="flex-1 overflow-hidden">
            {/* Glass Container for Messages */}
            <div 
              className="h-full rounded-3xl sm:rounded-[2rem] backdrop-blur-xl border border-white/10 overflow-hidden relative"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                boxShadow: `
                  inset 0 1px 0 rgba(255, 255, 255, 0.1),
                  0 20px 40px rgba(0, 0, 0, 0.05),
                  0 8px 32px rgba(0, 0, 0, 0.02)
                `
              }}
            >
              {/* Inner glass reflection */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none"></div>
              
              <div 
                className="h-full overflow-y-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6"
                style={{
                  scrollbarWidth: 'thin',
                  scrollbarColor: `${customization?.primaryColor || merchant.primaryColor}30 transparent`
                }}
              >
                {messages.map((message, index) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`group relative ${
                      message.role === 'user' 
                        ? 'max-w-[90%] sm:max-w-xs md:max-w-md lg:max-w-2xl ml-2 sm:ml-8 md:ml-12' 
                        : 'max-w-[90%] sm:max-w-xs md:max-w-md lg:max-w-2xl mr-2 sm:mr-8 md:mr-12'
                    }`}>
                      
                      {/* Message Bubble */}
                      <div
                        className={`relative px-3 sm:px-4 lg:px-5 py-3 sm:py-4 backdrop-blur-xl transition-all duration-300 hover:scale-[1.02] ${
                          message.role === 'user'
                            ? 'text-white shadow-lg'
                            : 'border border-white/15 shadow-xl'
                        }`}
                        style={{
                          background: message.role === 'user' 
                            ? `linear-gradient(135deg, ${customization?.userMessageColor || merchant.primaryColor}f0, ${customization?.userMessageColor || merchant.primaryColor}e0)`
                            : `
                              linear-gradient(145deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%),
                              rgba(255, 255, 255, 0.08)
                            `,
                          color: message.role === 'user' 
                            ? 'white' 
                            : (customization?.textColor || '#1f2937'),
                          borderRadius: message.role === 'user' ? '20px 20px 6px 20px' : '20px 20px 20px 6px',
                          boxShadow: message.role === 'user' 
                            ? `0 8px 32px ${customization?.userMessageColor || merchant.primaryColor}30`
                            : `
                              inset 0 1px 0 rgba(255, 255, 255, 0.1),
                              0 8px 32px rgba(0, 0, 0, 0.08)
                            `,
                          ...(customization?.messageStyle === 'flat' && { 
                            boxShadow: 'none', 
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '12px'
                          }),
                          ...(customization?.messageStyle === 'bubble' && { 
                            borderRadius: message.role === 'user' ? '25px 25px 6px 25px' : '25px 25px 25px 6px'
                          }),
                          ...(customization?.messageStyle === 'square' && { 
                            borderRadius: '8px'
                          })
                        }}
                      >
                        
                        {/* Message Content */}
                        {message.role === 'user' ? (
                          <p className="text-sm sm:text-base leading-relaxed whitespace-pre-wrap font-medium">{message.content}</p>
                        ) : (
                          <div className="text-sm sm:text-base leading-relaxed w-full">
                            {/* Simple and effective content rendering */}
                            {(() => {
                              const content = message.content.trim()
                              
                              // Simple check: if content contains HTML tags, use dangerouslySetInnerHTML
                              const hasHTMLTags = content.includes('<') && content.includes('>')
                              
                              if (hasHTMLTags) {
                                // Convert basic markdown to HTML first
                                let processedContent = content
                                  .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // **bold**
                                  .replace(/### (.*?)(\n|$)/g, '<h3 style="font-weight: bold; margin: 4px 0; color: #333;">$1</h3>$2') // ### header
                                  .replace(/## (.*?)(\n|$)/g, '<h2 style="font-weight: bold; margin: 5px 0; color: #333;">$1</h2>$2') // ## header
                                  .replace(/# (.*?)(\n|$)/g, '<h1 style="font-weight: bold; margin: 6px 0; color: #333;">$1</h1>$2') // # header
                                  .replace(/^- (.*?)$/gm, '<li style="margin: 1px 0; color: #333;">$1</li>') // - list items
                                  .replace(/((?:<li.*<\/li>\s*)+)/g, '<ul style="margin: 5px 0; padding-right: 15px; list-style-type: disc;">$1</ul>') // wrap consecutive li in ul
                                  .replace(/\n\n/g, '<div style="margin: 8px 0;"></div>') // paragraph breaks - smaller spacing
                                  .replace(/\n/g, '<br>') // line breaks
                                
                                return (
                                  <div 
                                    dangerouslySetInnerHTML={{ __html: processedContent }}
                                    style={{
                                      color: customization?.textColor || '#1f2937',
                                      width: '100%',
                                      lineHeight: '1.5'
                                    }}
                                  />
                                )
                              }
                              
                              // For pure text/markdown content, use ReactMarkdown
                              return (
                                <ReactMarkdown
                                  remarkPlugins={[remarkGfm]}
                                  rehypePlugins={[rehypeHighlight, rehypeRaw]}
                                  components={{
                                    h1: ({node, ...props}) => <h1 className="text-base sm:text-lg font-bold text-gray-900 mb-1 sm:mb-2" {...props} />,
                                    h2: ({node, ...props}) => <h2 className="text-sm sm:text-base font-bold text-gray-900 mb-1" {...props} />,
                                    h3: ({node, ...props}) => <h3 className="text-xs sm:text-sm font-bold text-gray-900 mb-1" {...props} />,
                                    p: ({node, ...props}) => <p className="text-gray-800 mb-1 sm:mb-2 leading-relaxed" {...props} />,
                                    ul: ({node, ...props}) => <ul className="list-disc list-inside mb-1 sm:mb-2 text-gray-800" {...props} />,
                                    ol: ({node, ...props}) => <ol className="list-decimal list-inside mb-1 sm:mb-2 text-gray-800" {...props} />,
                                    li: ({node, ...props}) => <li className="text-gray-800" {...props} />,
                                    br: ({node, ...props}) => <br {...props} />,
                                    span: ({node, ...props}) => <span {...props} />,
                                    table: ({node, ...props}) => (
                                      <div className="overflow-x-auto mb-2 sm:mb-3 rounded-lg border border-gray-200">
                                        <table className="min-w-full text-xs sm:text-sm bg-white" {...props} />
                                      </div>
                                    ),
                                    thead: ({node, ...props}) => <thead className="bg-gray-50" {...props} />,
                                    th: ({node, ...props}) => <th className="border-b border-gray-200 px-2 sm:px-3 py-1 sm:py-2 font-semibold text-gray-900 text-left text-xs sm:text-sm" {...props} />,
                                    td: ({node, ...props}) => <td className="border-b border-gray-100 px-2 sm:px-3 py-1 sm:py-2 text-gray-800 text-xs sm:text-sm" {...props} />,
                                    code: ({node, className, children, ...props}) => {
                                      const match = /language-(\w+)/.exec(className || '')
                                      return !match ? (
                                        <code className="bg-gray-100 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md text-xs font-mono text-gray-900 border" {...props}>
                                          {children}
                                        </code>
                                      ) : (
                                        <div className="bg-gray-900 p-2 sm:p-3 lg:p-4 rounded-xl text-xs sm:text-sm font-mono text-green-400 overflow-x-auto my-1 sm:my-2 border border-gray-200">
                                          <code {...props}>{children}</code>
                                        </div>
                                      )
                                    },
                                    blockquote: ({node, ...props}) => (
                                      <blockquote className="border-l-3 sm:border-l-4 border-blue-400 pl-3 sm:pl-4 py-1 bg-blue-50 text-gray-800 italic mb-1 sm:mb-2 rounded-r-lg text-sm" {...props} />
                                    ),
                                    hr: ({node, ...props}) => <hr className="border-gray-300 my-2 sm:my-3" {...props} />,
                                    a: ({node, ...props}) => <a className="text-blue-600 hover:text-blue-800 underline font-medium" {...props} />,
                                    strong: ({node, ...props}) => <strong className="font-bold text-gray-900" {...props} />,
                                    em: ({node, ...props}) => <em className="italic text-gray-700" {...props} />,
                                  }}
                                >
                                  {content}
                                </ReactMarkdown>
                              )
                            })()}
                          </div>
                        )}

                        {/* Timestamp */}
                        <div className={`text-xs mt-2 sm:mt-3 flex items-center justify-between ${
                          message.role === 'user' ? 'text-white/80' : 'text-gray-500'
                        }`}>
                          <span className="text-xs">{formatGregorianTime(message.timestamp)}</span>
                          {message.role === 'user' && (
                            <div className="flex items-center space-x-1">
                              <div className="w-1 h-1 bg-white/60 rounded-full"></div>
                              <div className="w-1 h-1 bg-white/60 rounded-full"></div>
                            </div>
                          )}
                        </div>

                        {/* Glass Message tail */}
                        <div 
                          className={`absolute bottom-0 w-3 h-3 sm:w-4 sm:h-4 transform rotate-45 ${
                            message.role === 'user' ? 'right-1.5 sm:right-2' : 'left-1.5 sm:left-2'
                          }`}
                          style={{
                            background: message.role === 'user' 
                              ? `linear-gradient(135deg, ${customization?.userMessageColor || merchant.primaryColor}f0, ${customization?.userMessageColor || merchant.primaryColor}e0)`
                              : `
                                linear-gradient(145deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%),
                                rgba(255, 255, 255, 0.08)
                              `,
                          }}
                        ></div>
                      </div>

                      {/* Avatar for bot messages */}
                      {message.role === 'assistant' && (
                        <div className="absolute -bottom-1 sm:-bottom-2 -left-1 sm:-left-2 md:-left-3">
                          <div 
                            className="w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg border-2 border-white backdrop-blur-sm"
                            style={{ 
                              background: `linear-gradient(135deg, ${customization?.primaryColor || merchant.primaryColor}, ${customization?.secondaryColor || customization?.primaryColor || merchant.primaryColor}cc)`
                            }}
                          >
                            <span className="text-xs sm:text-sm">🤖</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                
                {/* Streaming message display */}
                {isStreaming && streamingMessage && (
                  <div className="flex justify-start">
                    <div className="group relative max-w-[90%] sm:max-w-xs md:max-w-md lg:max-w-2xl mr-2 sm:mr-8 md:mr-12">
                      <div 
                        className="relative px-3 sm:px-4 lg:px-5 py-3 sm:py-4 backdrop-blur-xl border border-white/15 shadow-xl"
                        style={{
                          background: `
                            linear-gradient(145deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%),
                            rgba(255, 255, 255, 0.08)
                          `,
                          color: customization?.textColor || '#1f2937',
                          borderRadius: '20px 20px 20px 6px',
                          boxShadow: `
                            inset 0 1px 0 rgba(255, 255, 255, 0.1),
                            0 8px 32px rgba(0, 0, 0, 0.08)
                          `
                        }}
                      >
                        <div className="text-sm sm:text-base leading-relaxed w-full">
                          {/* Smart content detection - Complex HTML blocks vs Mixed simple content */}
                          {(() => {
                            const content = streamingMessage.trim()
                            
                            // Simple check: if content contains HTML tags, use dangerouslySetInnerHTML
                            const hasHTMLTags = content.includes('<') && content.includes('>')
                            
                            if (hasHTMLTags) {
                              // Convert basic markdown to HTML first
                              let processedContent = content
                                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // **bold**
                                .replace(/### (.*?)(\n|$)/g, '<h3 style="font-weight: bold; margin: 4px 0; color: #333;">$1</h3>$2') // ### header
                                .replace(/## (.*?)(\n|$)/g, '<h2 style="font-weight: bold; margin: 5px 0; color: #333;">$1</h2>$2') // ## header
                                .replace(/# (.*?)(\n|$)/g, '<h1 style="font-weight: bold; margin: 6px 0; color: #333;">$1</h1>$2') // # header
                                .replace(/^- (.*?)$/gm, '<li style="margin: 1px 0; color: #333;">$1</li>') // - list items
                                .replace(/((?:<li.*<\/li>\s*)+)/g, '<ul style="margin: 5px 0; padding-right: 15px; list-style-type: disc;">$1</ul>') // wrap consecutive li in ul
                                .replace(/\n\n/g, '<div style="margin: 8px 0;"></div>') // paragraph breaks - smaller spacing
                                .replace(/\n/g, '<br>') // line breaks
                              
                              return (
                                <div 
                                  dangerouslySetInnerHTML={{ __html: processedContent }}
                                  style={{
                                    color: customization?.textColor || '#1f2937',
                                    width: '100%',
                                    lineHeight: '1.5'
                                  }}
                                />
                              )
                            }
                            
                            // For pure text/markdown content, use ReactMarkdown
                            return (
                              <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                rehypePlugins={[rehypeHighlight, rehypeRaw]}
                                components={{
                                  h1: ({node, ...props}) => <h1 className="text-base sm:text-lg font-bold text-gray-900 mb-1 sm:mb-2" {...props} />,
                                  h2: ({node, ...props}) => <h2 className="text-sm sm:text-base font-bold text-gray-900 mb-1" {...props} />,
                                  h3: ({node, ...props}) => <h3 className="text-xs sm:text-sm font-bold text-gray-900 mb-1" {...props} />,
                                  p: ({node, ...props}) => <p className="text-gray-800 mb-1 sm:mb-2 leading-relaxed" {...props} />,
                                  ul: ({node, ...props}) => <ul className="list-disc list-inside mb-1 sm:mb-2 text-gray-800" {...props} />,
                                  ol: ({node, ...props}) => <ol className="list-decimal list-inside mb-1 sm:mb-2 text-gray-800" {...props} />,
                                  li: ({node, ...props}) => <li className="text-gray-800" {...props} />,
                                  br: ({node, ...props}) => <br {...props} />,
                                  span: ({node, ...props}) => <span {...props} />,
                                  table: ({node, ...props}) => (
                                    <div className="overflow-x-auto mb-2 sm:mb-3 rounded-lg border border-gray-200">
                                      <table className="min-w-full text-xs sm:text-sm bg-white" {...props} />
                                    </div>
                                  ),
                                  thead: ({node, ...props}) => <thead className="bg-gray-50" {...props} />,
                                  th: ({node, ...props}) => <th className="border-b border-gray-200 px-2 sm:px-3 py-1 sm:py-2 font-semibold text-gray-900 text-left text-xs sm:text-sm" {...props} />,
                                  td: ({node, ...props}) => <td className="border-b border-gray-100 px-2 sm:px-3 py-1 sm:py-2 text-gray-800 text-xs sm:text-sm" {...props} />,
                                  code: ({node, className, children, ...props}) => {
                                    const match = /language-(\w+)/.exec(className || '')
                                    return !match ? (
                                      <code className="bg-gray-100 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md text-xs font-mono text-gray-900 border" {...props}>
                                        {children}
                                      </code>
                                    ) : (
                                      <div className="bg-gray-900 p-2 sm:p-3 lg:p-4 rounded-xl text-xs sm:text-sm font-mono text-green-400 overflow-x-auto my-1 sm:my-2 border border-gray-200">
                                        <code {...props}>{children}</code>
                                      </div>
                                    )
                                  },
                                  blockquote: ({node, ...props}) => (
                                    <blockquote className="border-l-3 sm:border-l-4 border-blue-400 pl-3 sm:pl-4 py-1 bg-blue-50 text-gray-800 italic mb-1 sm:mb-2 rounded-r-lg text-sm" {...props} />
                                  ),
                                  hr: ({node, ...props}) => <hr className="border-gray-300 my-2 sm:my-3" {...props} />,
                                  a: ({node, ...props}) => <a className="text-blue-600 hover:text-blue-800 underline font-medium" {...props} />,
                                  strong: ({node, ...props}) => <strong className="font-bold text-gray-900" {...props} />,
                                  em: ({node, ...props}) => <em className="italic text-gray-700" {...props} />,
                                }}
                              >
                                {content}
                              </ReactMarkdown>
                            )
                          })()}
                        </div>
                        
                        {/* Typing indicator */}
                        <div className="flex items-center space-x-2 rtl:space-x-reverse mt-2 sm:mt-3">
                          <div className="flex space-x-1">
                            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-500 rounded-full animate-bounce"></div>
                            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                          </div>
                          <span className="text-xs font-medium text-blue-600">{customization?.typingIndicator || 'يكتب...'}</span>
                          <div className="w-1 h-1 bg-blue-500 rounded-full animate-pulse"></div>
                        </div>

                        {/* Message tail */}
                        <div 
                          className="absolute bottom-0 left-1.5 sm:left-2 w-3 h-3 sm:w-4 sm:h-4 transform rotate-45"
                          style={{ 
                            background: `
                              linear-gradient(145deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%),
                              rgba(255, 255, 255, 0.08)
                            ` 
                          }}
                        ></div>
                      </div>

                      {/* Streaming Avatar */}
                      <div className="absolute -bottom-1 sm:-bottom-2 -left-1 sm:-left-2 md:-left-3">
                        <div 
                          className="w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg border-2 border-white animate-pulse backdrop-blur-sm"
                          style={{ 
                            background: `linear-gradient(135deg, ${customization?.primaryColor || merchant.primaryColor}, ${customization?.secondaryColor || customization?.primaryColor || merchant.primaryColor}cc)`
                          }}
                        >
                          <span className="text-xs sm:text-sm">✨</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Loading indicator for initial processing */}
                {isLoading && !isStreaming && (
                  <div className="flex justify-start">
                    <div className="group relative max-w-[90%] sm:max-w-xs md:max-w-md lg:max-w-2xl mr-2 sm:mr-8 md:mr-12">
                      <div 
                        className="relative px-3 sm:px-4 lg:px-5 py-3 sm:py-4 backdrop-blur-xl border border-white/15 shadow-xl"
                        style={{
                          background: `
                            linear-gradient(145deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%),
                            rgba(255, 255, 255, 0.08)
                          `,
                          borderRadius: '20px 20px 20px 6px'
                        }}
                      >
                        <div className="flex items-center space-x-2 sm:space-x-3 rtl:space-x-reverse">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 sm:w-3 sm:h-3 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 sm:w-3 sm:h-3 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                            <div className="w-2 h-2 sm:w-3 sm:h-3 bg-gradient-to-r from-pink-400 to-red-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                          </div>
                          <span className="text-sm font-medium text-gray-700">جاري التحضير والتفكير...</span>
                        </div>

                        {/* Message tail */}
                        <div 
                          className="absolute bottom-0 left-1.5 sm:left-2 w-3 h-3 sm:w-4 sm:h-4 transform rotate-45"
                          style={{ 
                            background: `
                              linear-gradient(145deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%),
                              rgba(255, 255, 255, 0.08)
                            ` 
                          }}
                        ></div>
                      </div>

                      {/* Loading Avatar */}
                      <div className="absolute -bottom-1 sm:-bottom-2 -left-1 sm:-left-2 md:-left-3">
                        <div 
                          className="w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg border-2 border-white backdrop-blur-sm"
                          style={{ 
                            background: `linear-gradient(135deg, ${customization?.primaryColor || merchant.primaryColor}, ${customization?.secondaryColor || customization?.primaryColor || merchant.primaryColor}cc)`
                          }}
                        >
                          <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>
            </div>
          </div>

          {/* Input Area */}
          <div className="relative z-10 mt-3 sm:mt-4 lg:mt-6">
            <div 
              className="backdrop-blur-2xl border border-white/15 p-3 sm:p-4 shadow-2xl rounded-2xl sm:rounded-3xl"
              style={{
                background: `
                  linear-gradient(145deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.08) 100%),
                  rgba(255, 255, 255, 0.1)
                `,
                boxShadow: `
                  inset 0 1px 0 rgba(255, 255, 255, 0.2),
                  0 20px 40px rgba(0, 0, 0, 0.1),
                  0 8px 32px rgba(0, 0, 0, 0.05)
                `
              }}
            >
              <div className="flex items-end space-x-3 sm:space-x-4 rtl:space-x-reverse">
                
                {/* Input Container */}
                <div className="flex-1 relative">
                  <div className="relative">
                    <textarea
                      value={inputMessage}
                      onChange={(e) => {
                        setInputMessage(e.target.value)
                        // Auto-resize textarea
                        const target = e.target as HTMLTextAreaElement
                        target.style.height = 'auto'
                        const newHeight = Math.min(target.scrollHeight, window.innerWidth < 640 ? 120 : 140)
                        target.style.height = newHeight + 'px'
                      }}
                      onKeyPress={handleKeyPress}
                      placeholder=""
                      className="w-full px-4 sm:px-5 lg:px-6 py-3 sm:py-4 text-sm sm:text-base border-0 bg-white/60 backdrop-blur-md rounded-xl sm:rounded-2xl focus:ring-2 focus:ring-offset-0 transition-all duration-300 placeholder-transparent peer resize-none min-h-[48px] sm:min-h-[56px] max-h-[120px] sm:max-h-[140px] overflow-y-auto leading-relaxed"
                      style={{ 
                        color: customization?.textColor || '#1f2937',
                        fontFamily: customization?.fontFamily || 'Inter, system-ui, sans-serif',
                        borderColor: 'transparent',
                        boxShadow: `
                          inset 0 1px 0 rgba(255, 255, 255, 0.3),
                          0 4px 16px rgba(0, 0, 0, 0.05)
                        `,
                        scrollbarWidth: 'thin',
                        scrollbarColor: `${customization?.primaryColor || merchant.primaryColor}40 transparent`
                      }}
                      disabled={isLoading}
                      dir="rtl"
                      rows={1}
                    />
                    
                    {/* Floating Label */}
                    <label 
                      className={`absolute right-4 sm:right-5 lg:right-6 transition-all duration-300 pointer-events-none ${
                        inputMessage 
                          ? 'top-2 text-xs font-semibold transform -translate-y-1' 
                          : 'top-1/2 transform -translate-y-1/2 text-sm sm:text-base'
                      }`}
                      style={{ 
                        color: inputMessage 
                          ? (customization?.primaryColor || merchant.primaryColor)
                          : '#9ca3af'
                      }}
                    >
                      {customization?.placeholderText || "اكتب رسالتك هنا..."}
                    </label>
                    
                    {/* Character Counter */}
                    {inputMessage.length > 0 && (
                      <div className="absolute left-3 sm:left-4 bottom-2 text-xs text-gray-500 bg-white/80 px-2 py-1 rounded-full backdrop-blur-sm">
                        {inputMessage.length}
                      </div>
                    )}
                    
                    {/* Voice Input Button (Future Feature) */}
                    <button 
                      className="absolute left-3 sm:left-4 top-3 sm:top-4 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gray-100/80 hover:bg-gray-200/80 backdrop-blur-sm flex items-center justify-center transition-all duration-200 shadow-md border border-white/20"
                      disabled
                      title="ميزة الصوت قريباً"
                    >
                      <span className="text-xs sm:text-sm">🎤</span>
                    </button>
                  </div>
                </div>

                {/* Send Button */}
                <div className="relative flex-shrink-0">
                  <button
                    onClick={sendMessage}
                    disabled={isLoading || !inputMessage.trim()}
                    className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl font-medium transition-all duration-300 hover:scale-105 disabled:hover:scale-100 shadow-xl border-0 flex items-center justify-center relative overflow-hidden group backdrop-blur-sm"
                    style={{ 
                      background: !isLoading && inputMessage.trim() 
                        ? `linear-gradient(135deg, ${customization?.primaryColor || merchant.primaryColor}f0, ${customization?.secondaryColor || customization?.primaryColor || merchant.primaryColor}e0)`
                        : 'rgba(229, 231, 235, 0.8)',
                      color: !isLoading && inputMessage.trim() ? 'white' : '#9ca3af',
                      boxShadow: !isLoading && inputMessage.trim() 
                        ? `0 8px 32px ${customization?.primaryColor || merchant.primaryColor}30`
                        : '0 4px 16px rgba(0, 0, 0, 0.1)'
                    }}
                  >
                    {/* Button Background Animation */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                    
                    {/* Button Content */}
                    <div className="relative z-10 flex items-center justify-center">
                      {isLoading ? (
                        <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      ) : inputMessage.trim() ? (
                        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </button>
                  
                  {/* Send Button Tooltip */}
                  {inputMessage.trim() && !isLoading && (
                    <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-gray-900/90 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none shadow-lg">
                      {customization?.sendButtonText || 'إرسال'}
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-900/90 rotate-45"></div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Input Footer */}
              <div className="mt-3 sm:mt-4 flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2 rtl:space-x-reverse text-gray-600">
                  <div className="flex items-center space-x-1 rtl:space-x-reverse">
                    <span className="hidden sm:inline">اضغط</span>
                    <kbd className="px-2 py-1 bg-white/40 backdrop-blur-sm border border-white/30 rounded text-xs font-mono shadow-sm">Enter</kbd>
                    <span className="hidden sm:inline">للإرسال</span>
                  </div>
                  {isStreaming && (
                    <div className="flex items-center space-x-1 rtl:space-x-reverse">
                      <div className="w-1 h-1 bg-blue-500 rounded-full animate-pulse"></div>
                      <span className="text-blue-600 font-medium">استجابة مباشرة</span>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center space-x-2 rtl:space-x-reverse">
                  <div className="flex items-center space-x-1 rtl:space-x-reverse text-gray-500">
                    <span className="hidden sm:inline">مدعوم بـ</span>
                    <span className="font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                      AI Shop Mate
                    </span>
                  </div>
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-500 rounded-full animate-pulse shadow-sm"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}