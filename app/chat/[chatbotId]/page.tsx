'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
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
          ? `linear-gradient(135deg, ${customization.primaryColor}08, ${customization.backgroundColor}, ${customization.primaryColor}05)`
          : `linear-gradient(135deg, ${merchant.primaryColor}08, #f8fafc, ${merchant.primaryColor}05)`,
        fontFamily: customization?.fontFamily || 'Inter, system-ui, sans-serif'
      }}
    >
      {/* Animated Background Shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/10 to-purple-400/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-pink-400/10 to-orange-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-indigo-400/5 to-cyan-400/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '4s' }}></div>
      </div>

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
      <div className="relative z-10 max-w-4xl mx-auto p-4 sm:p-6">
        <div className="h-[calc(100vh-140px)] flex flex-col">
          
          {/* Messages Area */}
          <div className="flex-1 overflow-hidden">
            <div 
              className="h-full overflow-y-auto px-2 pb-4 space-y-6"
              style={{
                scrollbarWidth: 'thin',
                scrollbarColor: `${customization?.primaryColor || merchant.primaryColor}40 transparent`
              }}
            >
              <style jsx>{`
                div::-webkit-scrollbar {
                  width: 6px;
                }
                div::-webkit-scrollbar-track {
                  background: transparent;
                }
                div::-webkit-scrollbar-thumb {
                  background: ${customization?.primaryColor || merchant.primaryColor}40;
                  border-radius: 10px;
                }
                div::-webkit-scrollbar-thumb:hover {
                  background: ${customization?.primaryColor || merchant.primaryColor}60;
                }
              `}</style>

              {messages.map((message, index) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`group relative max-w-xs sm:max-w-md lg:max-w-2xl ${message.role === 'user' ? 'ml-12' : 'mr-12'}`}>
                    
                    {/* Message Bubble */}
                    <div
                      className={`relative px-5 py-4 shadow-lg backdrop-blur-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 ${
                        message.role === 'user'
                          ? 'text-white'
                          : 'border border-white/20'
                      }`}
                      style={{
                        background: message.role === 'user' 
                          ? `linear-gradient(135deg, ${customization?.userMessageColor || merchant.primaryColor}, ${customization?.userMessageColor || merchant.primaryColor}dd)`
                          : `rgba(255, 255, 255, 0.95)`,
                        color: message.role === 'user' 
                          ? 'white' 
                          : (customization?.textColor || '#1f2937'),
                        borderRadius: message.role === 'user' ? '24px 24px 8px 24px' : '24px 24px 24px 8px',
                        ...(customization?.messageStyle === 'flat' && { 
                          boxShadow: 'none', 
                          border: '1px solid rgba(0,0,0,0.1)',
                          borderRadius: '12px'
                        }),
                        ...(customization?.messageStyle === 'bubble' && { 
                          borderRadius: message.role === 'user' ? '28px 28px 8px 28px' : '28px 28px 28px 8px'
                        }),
                        ...(customization?.messageStyle === 'square' && { 
                          borderRadius: '8px'
                        })
                      }}
                    >
                      
                      {/* Message Content */}
                      {message.role === 'user' ? (
                        <p className="text-sm leading-relaxed whitespace-pre-wrap font-medium">{message.content}</p>
                      ) : (
                        <div className="text-sm leading-relaxed prose prose-sm max-w-none">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            rehypePlugins={[rehypeHighlight]}
                            components={{
                              h1: ({node, ...props}) => <h1 className="text-lg font-bold text-gray-900 mb-3 border-b border-gray-200 pb-2" {...props} />,
                              h2: ({node, ...props}) => <h2 className="text-base font-bold text-gray-900 mb-2" {...props} />,
                              h3: ({node, ...props}) => <h3 className="text-sm font-bold text-gray-900 mb-2" {...props} />,
                              p: ({node, ...props}) => <p className="text-gray-800 mb-3 leading-relaxed" {...props} />,
                              ul: ({node, ...props}) => <ul className="list-disc list-inside mb-3 text-gray-800 space-y-1" {...props} />,
                              ol: ({node, ...props}) => <ol className="list-decimal list-inside mb-3 text-gray-800 space-y-1" {...props} />,
                              li: ({node, ...props}) => <li className="text-gray-800" {...props} />,
                              table: ({node, ...props}) => (
                                <div className="overflow-x-auto mb-4 rounded-lg border border-gray-200">
                                  <table className="min-w-full text-xs bg-white" {...props} />
                                </div>
                              ),
                              thead: ({node, ...props}) => <thead className="bg-gray-50" {...props} />,
                              th: ({node, ...props}) => <th className="border-b border-gray-200 px-3 py-2 font-semibold text-gray-900 text-left" {...props} />,
                              td: ({node, ...props}) => <td className="border-b border-gray-100 px-3 py-2 text-gray-800" {...props} />,
                              code: ({node, className, children, ...props}) => {
                                const match = /language-(\w+)/.exec(className || '')
                                return !match ? (
                                  <code className="bg-gray-100 px-2 py-1 rounded-md text-xs font-mono text-gray-900 border" {...props}>
                                    {children}
                                  </code>
                                ) : (
                                  <div className="bg-gray-900 p-4 rounded-xl text-xs font-mono text-green-400 overflow-x-auto my-3 border border-gray-200">
                                    <code {...props}>{children}</code>
                                  </div>
                                )
                              },
                              blockquote: ({node, ...props}) => (
                                <blockquote className="border-l-4 border-blue-400 pl-4 py-2 bg-blue-50 text-gray-800 italic mb-3 rounded-r-lg" {...props} />
                              ),
                              hr: ({node, ...props}) => <hr className="border-gray-300 my-4" {...props} />,
                              a: ({node, ...props}) => <a className="text-blue-600 hover:text-blue-800 underline font-medium" {...props} />,
                              strong: ({node, ...props}) => <strong className="font-bold text-gray-900" {...props} />,
                              em: ({node, ...props}) => <em className="italic text-gray-700" {...props} />,
                            }}
                          >
                            {message.content}
                          </ReactMarkdown>
                        </div>
                      )}

                      {/* Timestamp */}
                      <div className={`text-xs mt-3 flex items-center justify-between ${
                        message.role === 'user' ? 'text-white/80' : 'text-gray-500'
                      }`}>
                        <span>{formatGregorianTime(message.timestamp)}</span>
                        {message.role === 'user' && (
                          <div className="flex items-center space-x-1">
                            <div className="w-1 h-1 bg-white/60 rounded-full"></div>
                            <div className="w-1 h-1 bg-white/60 rounded-full"></div>
                          </div>
                        )}
                      </div>

                      {/* Message tail */}
                      <div 
                        className={`absolute bottom-0 w-4 h-4 transform rotate-45 ${
                          message.role === 'user' ? 'right-2' : 'left-2'
                        }`}
                        style={{
                          background: message.role === 'user' 
                            ? `linear-gradient(135deg, ${customization?.userMessageColor || merchant.primaryColor}, ${customization?.userMessageColor || merchant.primaryColor}dd)`
                            : 'rgba(255, 255, 255, 0.95)',
                        }}
                      ></div>
                    </div>

                    {/* Avatar for bot messages */}
                    {message.role === 'assistant' && (
                      <div className="absolute -bottom-2 -left-3">
                        <div 
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg border-2 border-white"
                          style={{ 
                            background: `linear-gradient(135deg, ${customization?.primaryColor || merchant.primaryColor}, ${customization?.secondaryColor || customization?.primaryColor || merchant.primaryColor}cc)`
                          }}
                        >
                          🤖
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {/* Streaming message display */}
              {isStreaming && streamingMessage && (
                <div className="flex justify-start">
                  <div className="group relative max-w-xs sm:max-w-md lg:max-w-2xl mr-12">
                    <div 
                      className="relative px-5 py-4 backdrop-blur-sm border border-white/20 shadow-lg"
                      style={{
                        background: 'rgba(255, 255, 255, 0.95)',
                        color: customization?.textColor || '#1f2937',
                        borderRadius: '24px 24px 24px 8px',
                      }}
                    >
                      <div className="text-sm leading-relaxed prose prose-sm max-w-none">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          rehypePlugins={[rehypeHighlight]}
                          components={{
                            h1: ({node, ...props}) => <h1 className="text-lg font-bold text-gray-900 mb-3 border-b border-gray-200 pb-2" {...props} />,
                            h2: ({node, ...props}) => <h2 className="text-base font-bold text-gray-900 mb-2" {...props} />,
                            h3: ({node, ...props}) => <h3 className="text-sm font-bold text-gray-900 mb-2" {...props} />,
                            p: ({node, ...props}) => <p className="text-gray-800 mb-3 leading-relaxed" {...props} />,
                            code: ({node, className, children, ...props}) => {
                              const match = /language-(\w+)/.exec(className || '')
                              return !match ? (
                                <code className="bg-gray-100 px-2 py-1 rounded-md text-xs font-mono text-gray-900 border" {...props}>
                                  {children}
                                </code>
                              ) : (
                                <div className="bg-gray-900 p-4 rounded-xl text-xs font-mono text-green-400 overflow-x-auto my-3 border border-gray-200">
                                  <code {...props}>{children}</code>
                                </div>
                              )
                            },
                          }}
                        >
                          {streamingMessage}
                        </ReactMarkdown>
                      </div>
                      
                      {/* Typing indicator */}
                      <div className="flex items-center space-x-2 rtl:space-x-reverse mt-3">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                        <span className="text-xs text-blue-600 font-medium">{customization?.typingIndicator || 'يكتب...'}</span>
                        <div className="w-1 h-1 bg-blue-500 rounded-full animate-pulse"></div>
                      </div>

                      {/* Message tail */}
                      <div 
                        className="absolute bottom-0 left-2 w-4 h-4 transform rotate-45"
                        style={{ background: 'rgba(255, 255, 255, 0.95)' }}
                      ></div>
                    </div>

                    {/* Streaming Avatar */}
                    <div className="absolute -bottom-2 -left-3">
                      <div 
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg border-2 border-white animate-pulse"
                        style={{ 
                          background: `linear-gradient(135deg, ${customization?.primaryColor || merchant.primaryColor}, ${customization?.secondaryColor || customization?.primaryColor || merchant.primaryColor}cc)`
                        }}
                      >
                        ✨
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Loading indicator for initial processing */}
              {isLoading && !isStreaming && (
                <div className="flex justify-start">
                  <div className="group relative max-w-xs sm:max-w-md lg:max-w-2xl mr-12">
                    <div 
                      className="relative px-5 py-4 backdrop-blur-sm border border-white/20 shadow-lg"
                      style={{
                        background: 'rgba(255, 255, 255, 0.95)',
                        borderRadius: '24px 24px 24px 8px'
                      }}
                    >
                      <div className="flex items-center space-x-3 rtl:space-x-reverse">
                        <div className="flex space-x-1">
                          <div className="w-3 h-3 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full animate-bounce"></div>
                          <div className="w-3 h-3 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-3 h-3 bg-gradient-to-r from-pink-400 to-red-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                        <span className="text-sm text-gray-700 font-medium">جاري التحضير والتفكير...</span>
                      </div>

                      {/* Message tail */}
                      <div 
                        className="absolute bottom-0 left-2 w-4 h-4 transform rotate-45"
                        style={{ background: 'rgba(255, 255, 255, 0.95)' }}
                      ></div>
                    </div>

                    {/* Loading Avatar */}
                    <div className="absolute -bottom-2 -left-3">
                      <div 
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg border-2 border-white"
                        style={{ 
                          background: `linear-gradient(135deg, ${customization?.primaryColor || merchant.primaryColor}, ${customization?.secondaryColor || customization?.primaryColor || merchant.primaryColor}cc)`
                        }}
                      >
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input Area */}
          <div className="relative z-10 mt-6">
            <div 
              className="backdrop-blur-xl border border-white/20 p-4 shadow-2xl"
              style={{
                background: 'rgba(255, 255, 255, 0.85)',
                borderRadius: '28px',
              }}
            >
              <div className="flex items-end space-x-4 rtl:space-x-reverse">
                
                {/* Input Container */}
                <div className="flex-1 relative">
                  <div className="relative">
                    <Input
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder=""
                      className="w-full px-6 py-4 text-base border-0 bg-white/60 backdrop-blur-sm rounded-2xl focus:ring-2 focus:ring-offset-0 transition-all duration-300 placeholder-transparent peer resize-none min-h-[56px]"
                      style={{ 
                        color: customization?.textColor || '#1f2937',
                        fontFamily: customization?.fontFamily || 'Inter, system-ui, sans-serif',
                        borderColor: 'transparent'
                      }}
                      disabled={isLoading}
                      dir="rtl"
                    />
                    
                    {/* Floating Label */}
                    <label 
                      className={`absolute right-6 transition-all duration-300 pointer-events-none ${
                        inputMessage 
                          ? 'top-2 text-xs font-medium' 
                          : 'top-1/2 transform -translate-y-1/2 text-base'
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
                      <div className="absolute left-3 bottom-2 text-xs text-gray-400">
                        {inputMessage.length}
                      </div>
                    )}
                    
                    {/* Voice Input Button (Future Feature) */}
                    <button 
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-all duration-200"
                      disabled
                    >
                      🎤
                    </button>
                  </div>
                </div>

                {/* Send Button */}
                <div className="relative">
                  <Button
                    onClick={sendMessage}
                    disabled={isLoading || !inputMessage.trim()}
                    className="w-14 h-14 rounded-2xl font-medium transition-all duration-300 hover:scale-105 disabled:hover:scale-100 shadow-lg border-0 flex items-center justify-center relative overflow-hidden group"
                    style={{ 
                      background: !isLoading && inputMessage.trim() 
                        ? `linear-gradient(135deg, ${customization?.primaryColor || merchant.primaryColor}, ${customization?.secondaryColor || customization?.primaryColor || merchant.primaryColor}cc)`
                        : '#e5e7eb',
                      color: !isLoading && inputMessage.trim() ? 'white' : '#9ca3af'
                    }}
                  >
                    {/* Button Background Animation */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                    
                    {/* Button Content */}
                    <div className="relative z-10">
                      {isLoading ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      ) : inputMessage.trim() ? (
                        <div className="flex items-center justify-center">
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center">
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </Button>
                  
                  {/* Send Button Tooltip */}
                  {inputMessage.trim() && !isLoading && (
                    <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-3 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                      {customization?.sendButtonText || 'إرسال'}
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Input Footer */}
              <div className="mt-4 flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2 rtl:space-x-reverse text-gray-500">
                  <div className="flex items-center space-x-1 rtl:space-x-reverse">
                    <span>اضغط</span>
                    <kbd className="px-2 py-1 bg-gray-100 border border-gray-200 rounded text-xs font-mono">Enter</kbd>
                    <span>للإرسال</span>
                  </div>
                  {isStreaming && (
                    <div className="flex items-center space-x-1 rtl:space-x-reverse">
                      <div className="w-1 h-1 bg-blue-500 rounded-full animate-pulse"></div>
                      <span className="text-blue-600 font-medium">استجابة مباشرة</span>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center space-x-2 rtl:space-x-reverse">
                  <div className="flex items-center space-x-1 rtl:space-x-reverse text-gray-400">
                    <span>مدعوم بـ</span>
                    <span className="font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                      AI Shop Mate
                    </span>
                  </div>
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}