'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
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
        // تحميل بيانات التاجر
        const response = await fetch(`/api/merchant/${chatbotId}`)
        if (response.ok) {
          const merchantData = await response.json()
          setMerchant(merchantData)
          
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-900">جاري تحميل المحادثة...</p>
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
          <p className="text-gray-900">عذراً، لم نتمكن من العثور على هذا المتجر.</p>
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
              <p className="text-sm text-gray-900">مساعد ذكي • متاح الآن</p>
            </div>
            <div className="flex-1"></div>
            <div className="flex items-center space-x-3 rtl:space-x-reverse">
              <div className={`w-3 h-3 rounded-full ${isStreaming ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`}></div>
              <span className={`text-sm font-medium ${isStreaming ? 'text-yellow-600' : 'text-green-600'}`}>
                {isStreaming ? 'يكتب...' : 'متصل'}
              </span>
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
                {message.role === 'user' ? (
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                ) : (
                  <div className="text-sm leading-relaxed prose prose-sm max-w-none">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeHighlight]}
                      components={{
                        // Style headings
                        h1: ({node, ...props}) => <h1 className="text-lg font-bold text-gray-900 mb-2" {...props} />,
                        h2: ({node, ...props}) => <h2 className="text-base font-bold text-gray-900 mb-2" {...props} />,
                        h3: ({node, ...props}) => <h3 className="text-sm font-bold text-gray-900 mb-1" {...props} />,
                        // Style paragraphs
                        p: ({node, ...props}) => <p className="text-gray-800 mb-2 leading-relaxed" {...props} />,
                        // Style lists
                        ul: ({node, ...props}) => <ul className="list-disc list-inside mb-2 text-gray-800" {...props} />,
                        ol: ({node, ...props}) => <ol className="list-decimal list-inside mb-2 text-gray-800" {...props} />,
                        li: ({node, ...props}) => <li className="text-gray-800 mb-1" {...props} />,
                        // Style tables
                        table: ({node, ...props}) => (
                          <div className="overflow-x-auto mb-3">
                            <table className="min-w-full border-collapse border border-gray-300 text-xs" {...props} />
                          </div>
                        ),
                        thead: ({node, ...props}) => <thead className="bg-gray-100" {...props} />,
                        th: ({node, ...props}) => <th className="border border-gray-300 px-2 py-1 font-bold text-gray-900 text-left" {...props} />,
                        td: ({node, ...props}) => <td className="border border-gray-300 px-2 py-1 text-gray-800" {...props} />,
                        // Style code blocks
                        code: ({node, className, children, ...props}) => {
                          const match = /language-(\w+)/.exec(className || '')
                          return !match ? (
                            <code className="bg-gray-100 px-1 py-0.5 rounded text-xs font-mono text-gray-900" {...props}>
                              {children}
                            </code>
                          ) : (
                            <code className="block bg-gray-100 p-2 rounded text-xs font-mono text-gray-900 overflow-x-auto" {...props}>
                              {children}
                            </code>
                          )
                        },
                        // Style blockquotes
                        blockquote: ({node, ...props}) => (
                          <blockquote className="border-l-4 border-blue-500 pl-3 py-1 bg-blue-50 text-gray-800 italic mb-2" {...props} />
                        ),
                        // Style horizontal rules
                        hr: ({node, ...props}) => <hr className="border-gray-300 my-3" {...props} />,
                        // Style links
                        a: ({node, ...props}) => <a className="text-blue-600 hover:text-blue-800 underline" {...props} />,
                        // Style strong/bold text
                        strong: ({node, ...props}) => <strong className="font-bold text-gray-900" {...props} />,
                        // Style emphasis/italic text
                        em: ({node, ...props}) => <em className="italic text-gray-800" {...props} />,
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  </div>
                )}
                <p className={`text-xs mt-2 ${
                  message.role === 'user' ? 'text-white/80' : 'text-gray-900'
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
          
          {/* Streaming message display */}
          {isStreaming && streamingMessage && (
            <div className="flex justify-start">
              <div className="bg-white text-gray-800 shadow-md border px-4 py-3 rounded-2xl max-w-xs sm:max-w-md lg:max-w-lg">
                <div className="text-sm leading-relaxed prose prose-sm max-w-none">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeHighlight]}
                    components={{
                      // Style headings
                      h1: ({node, ...props}) => <h1 className="text-lg font-bold text-gray-900 mb-2" {...props} />,
                      h2: ({node, ...props}) => <h2 className="text-base font-bold text-gray-900 mb-2" {...props} />,
                      h3: ({node, ...props}) => <h3 className="text-sm font-bold text-gray-900 mb-1" {...props} />,
                      // Style paragraphs
                      p: ({node, ...props}) => <p className="text-gray-800 mb-2 leading-relaxed" {...props} />,
                      // Style lists
                      ul: ({node, ...props}) => <ul className="list-disc list-inside mb-2 text-gray-800" {...props} />,
                      ol: ({node, ...props}) => <ol className="list-decimal list-inside mb-2 text-gray-800" {...props} />,
                      li: ({node, ...props}) => <li className="text-gray-800 mb-1" {...props} />,
                      // Style tables
                      table: ({node, ...props}) => (
                        <div className="overflow-x-auto mb-3">
                          <table className="min-w-full border-collapse border border-gray-300 text-xs" {...props} />
                        </div>
                      ),
                      thead: ({node, ...props}) => <thead className="bg-gray-100" {...props} />,
                      th: ({node, ...props}) => <th className="border border-gray-300 px-2 py-1 font-bold text-gray-900 text-left" {...props} />,
                      td: ({node, ...props}) => <td className="border border-gray-300 px-2 py-1 text-gray-800" {...props} />,
                      // Style code blocks
                      code: ({node, className, children, ...props}) => {
                        const match = /language-(\w+)/.exec(className || '')
                        return !match ? (
                          <code className="bg-gray-100 px-1 py-0.5 rounded text-xs font-mono text-gray-900" {...props}>
                            {children}
                          </code>
                        ) : (
                          <code className="block bg-gray-100 p-2 rounded text-xs font-mono text-gray-900 overflow-x-auto" {...props}>
                            {children}
                          </code>
                        )
                      },
                      // Style blockquotes
                      blockquote: ({node, ...props}) => (
                        <blockquote className="border-l-4 border-blue-500 pl-3 py-1 bg-blue-50 text-gray-800 italic mb-2" {...props} />
                      ),
                      // Style horizontal rules
                      hr: ({node, ...props}) => <hr className="border-gray-300 my-3" {...props} />,
                      // Style links
                      a: ({node, ...props}) => <a className="text-blue-600 hover:text-blue-800 underline" {...props} />,
                      // Style strong/bold text
                      strong: ({node, ...props}) => <strong className="font-bold text-gray-900" {...props} />,
                      // Style emphasis/italic text
                      em: ({node, ...props}) => <em className="italic text-gray-800" {...props} />,
                    }}
                  >
                    {streamingMessage}
                  </ReactMarkdown>
                </div>
                <div className="flex items-center space-x-2 rtl:space-x-reverse mt-2">
                  <div className="flex space-x-1">
                    <div className="w-1 h-1 bg-blue-500 rounded-full animate-pulse"></div>
                    <div className="w-1 h-1 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-1 h-1 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                  <span className="text-xs text-blue-500">يكتب...</span>
                </div>
              </div>
            </div>
          )}
          
          {/* Loading indicator for initial processing */}
          {isLoading && !isStreaming && (
            <div className="flex justify-start">
              <div className="bg-white text-gray-800 shadow-md border px-4 py-3 rounded-2xl">
                <div className="flex items-center space-x-2 rtl:space-x-reverse">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                  <span className="text-sm text-gray-900">جاري التحضير...</span>
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
                className="resize-none border-0 focus:ring-0 text-base text-gray-900"
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
          
          <div className="mt-3 flex items-center justify-end text-xs text-gray-900">
            <p className="flex items-center space-x-1 rtl:space-x-reverse">
              <span>مدعوم بـ</span>
              <span className="font-semibold" style={{ color: merchant.primaryColor }}>
                AI Shop Mate
              </span>
              {isStreaming && (
                <span className="text-blue-500 animate-pulse">• live streaming</span>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}