import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ chatbotId: string }> }
) {
  console.log('🚀 Chat API with Local Storage (No DB Conversations)')
  
  try {
    // 1. Get chatbotId
    const { chatbotId } = await params
    console.log('📍 ChatbotId:', chatbotId)
    
    // 2. Parse request body
    const body = await request.json()
    const { message, sessionId, conversationHistory = [], stream = true } = body
    console.log('📥 Request:', { 
      hasMessage: !!message, 
      hasSessionId: !!sessionId, 
      stream,
      messageLength: message?.length,
      historyLength: conversationHistory?.length
    })

    // 🔍 DEBUG: Log conversation history details
    console.log('🔍 CONVERSATION HISTORY DEBUG:')
    console.log('History Length:', conversationHistory?.length || 0)
    if (conversationHistory && conversationHistory.length > 0) {
      conversationHistory.forEach((msg: any, index: number) => {
        console.log(`Message ${index + 1}: [${msg.role}] "${msg.content?.substring(0, 50)}..."`)
      })
    } else {
      console.log('❌ NO CONVERSATION HISTORY RECEIVED!')
    }
    console.log('Current Message:', message)

    // 3. Validate required fields
    if (!chatbotId || !message) {
      console.error('❌ Missing required fields')
      return NextResponse.json({
        error: 'Missing required fields: chatbotId, message'
      }, { status: 400 })
    }

    // 4. Get merchant data (for business context only)
    console.log('🔍 Getting merchant data...')
    const { data: merchant, error: merchantError } = await supabaseAdmin
      .from('Merchant')
      .select(`
        id,
        businessName,
        welcomeMessage,
        primaryColor,
        isActive
      `)
      .eq('chatbotId', chatbotId)
      .single()

    if (merchantError || !merchant) {
      console.error('❌ Merchant not found:', merchantError?.message)
      return NextResponse.json({
        error: 'Merchant not found',
        details: merchantError?.message
      }, { status: 404 })
    }
    
    console.log('✅ Merchant found:', merchant.businessName)

    // التحقق من حالة التاجر
    if (!merchant.isActive) {
      return NextResponse.json(
        { 
          response: 'عذراً، الخدمة غير متاحة حالياً. يرجى المحاولة لاحقاً.',
          reason: 'merchant_inactive'
        },
        { status: 403 }
      )
    }

    // 5. فحص الحدود باستخدام الدالة الجديدة
    const { data: limitsCheck, error: limitsError } = await supabaseAdmin
      .rpc('check_message_limits', { merchant_id: merchant.id })

    if (limitsError) {
      console.error('Error checking limits:', limitsError)
      return NextResponse.json(
        { error: 'Failed to check subscription limits' },
        { status: 500 }
      )
    }

    const limits = limitsCheck && limitsCheck[0]
    if (!limits || !limits.can_send) {
      console.log('🚫 Message limit reached:', limits?.reason)
      return NextResponse.json(
        { 
          response: limits?.reason === 'تم تجاوز الحد اليومي' 
            ? 'عذراً، تم تجاوز الحد اليومي للرسائل. يمكنك المحاولة غداً.' 
            : 'عذراً، تم تجاوز حد الرسائل المسموح. يرجى التواصل مع صاحب المتجر.',
          redirectTo: `/chat/${chatbotId}/limit-reached`,
          reason: limits?.reason === 'تم تجاوز الحد اليومي' ? 'daily_limit_reached' : 'monthly_limit_reached',
          limits: {
            daily_remaining: limits?.daily_remaining || 0,
            monthly_remaining: limits?.monthly_remaining || 0
          }
        },
        { status: 403 }
      )
    }

    // 6. Prepare AI context with conversation history from frontend
    console.log('🤖 Preparing AI context with local conversation history...')
    const businessContext = `أنت مساعد ذكي لمتجر "${merchant.businessName}". تحدث باللغة العربية بطريقة مهذبة ومفيدة وقدم ردود مفصلة ومساعدة. تذكر المحادثة السابقة واستخدمها في ردودك.`
    
    // Use conversation history sent from frontend (last 25 messages)
    const recentHistory = conversationHistory?.slice(-25) || []
    console.log(`📜 Using ${recentHistory.length} messages from local history`)

    // 7. Generate AI response
    if (stream) {
      // Return streaming response 
      return await generateStreamingResponse(message, businessContext, recentHistory, merchant)
    } else {
      // Return regular response
      const aiResponse = await generateRegularResponse(message, businessContext, recentHistory)

      // استهلاك رسالة واحدة باستخدام الدالة الجديدة
      const { data: consumeResult, error: consumeError } = await supabaseAdmin
        .rpc('consume_message', { merchant_id: merchant.id })

      if (consumeError) {
        console.error('❌ Error consuming message:', consumeError)
      } else {
        const result = consumeResult && consumeResult[0]
        if (result && result.success) {
          console.log('✅ Message consumed successfully:', {
            dailyRemaining: result.daily_remaining,
            monthlyRemaining: result.monthly_remaining
          })
        }
      }

      return NextResponse.json({ 
        response: aiResponse,
        usage: consumeResult && consumeResult[0] ? {
          daily_remaining: consumeResult[0].daily_remaining,
          monthly_remaining: consumeResult[0].monthly_remaining
        } : undefined
      })
    }

  } catch (error) {
    console.error('💥 API Error:', error)
    console.error('💥 Error stack:', error instanceof Error ? error.stack : 'No stack')
    
    return NextResponse.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Streaming response with Local Storage (No DB saving)
async function generateStreamingResponse(
  message: string, 
  context: string, 
  conversationHistory: any[],
  merchant: any
): Promise<Response> {
  console.log('🌊 Starting streaming response (Local Storage Mode)...')

  // Use Environment Variables from Vercel
  const apiKey = process.env.CHUTES_AI_API_KEY
  const apiUrl = process.env.CHUTES_AI_API_URL || 'https://llm.chutes.ai/v1/chat/completions'
  const model = process.env.CHUTES_AI_MODEL || 'deepseek-ai/DeepSeek-V3-0324'

  console.log('🔑 Using ENV:', {
    hasApiKey: !!apiKey,
    apiUrl,
    model,
    historyLength: conversationHistory?.length
  })

  if (!apiKey) {
    console.error('❌ CHUTES_AI_API_KEY not found in environment variables')
    throw new Error('AI API key not configured')
  }

  // Build proper messages array for AI API (CORRECT FORMAT)
  const messages = []
  
  // 1. Add system message with business context
  messages.push({
    role: "system",
    content: context
  })

  // 2. Add conversation history as separate messages
  if (conversationHistory && conversationHistory.length > 0) {
    console.log('🔄 Adding conversation history to AI messages...')
    conversationHistory.forEach((msg: any, index: number) => {
      const cleanRole = msg.role === 'user' ? 'user' : 'assistant'
      messages.push({
        role: cleanRole,
        content: msg.content
      })
      console.log(`📝 Added history message ${index + 1}: [${cleanRole}] "${msg.content?.substring(0, 50)}..."`)
    })
    console.log(`📝 Added ${conversationHistory.length} history messages to AI context`)
  } else {
    console.log('⚠️ No conversation history to add!')
  }

  // 3. Add current user message
  messages.push({
    role: "user",
    content: message
  })

  console.log(`🎯 Total messages sent to AI: ${messages.length} (1 system + ${conversationHistory.length} history + 1 current)`)
  
  // 🔍 DEBUG: Show final messages array structure  
  console.log('🔍 FINAL MESSAGES SENT TO AI:')
  messages.forEach((msg, index) => {
    console.log(`${index + 1}. [${msg.role}] "${msg.content?.substring(0, 100)}..."`)
  })

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: model,
        messages: messages, // Use proper messages array format
        stream: true,
        max_tokens: 128000,
        temperature: 0.7
      })
    })

    console.log(`📦 AI API Status: ${response.status}`)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ AI API error:', response.status, errorText)
      throw new Error(`AI API error: ${response.status}`)
    }

    // Create streaming response (no database saving)
    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader()
        const decoder = new TextDecoder()
        let accumulatedContent = ''
        let chunkCount = 0
        let totalBytes = 0
        const startTime = Date.now()
        let lastChunkTime = startTime
        let maxDelay = 0
        let delayCount = 0

        if (!reader) {
          controller.error(new Error('No response body'))
          return
        }

        console.log('🎬 STREAMING PERFORMANCE MONITOR STARTED')
        console.log(`⏰ Start time: ${new Date(startTime).toISOString()}`)

        try {
          while (true) {
            const chunkStartTime = Date.now()
            const { done, value } = await reader.read()
            const chunkEndTime = Date.now()
            const readDelay = chunkEndTime - chunkStartTime
            
            if (done) {
              const totalTime = Date.now() - startTime
              console.log('✅ STREAMING PERFORMANCE SUMMARY:')
              console.log(`📊 Total time: ${totalTime}ms`)
              console.log(`📦 Total chunks: ${chunkCount}`)
              console.log(`📏 Total bytes: ${totalBytes}`)
              console.log(`📈 Average chunk size: ${Math.round(totalBytes / chunkCount || 0)} bytes`)
              console.log(`⏱️ Average time per chunk: ${Math.round(totalTime / chunkCount || 0)}ms`)
              console.log(`🐌 Max delay between chunks: ${maxDelay}ms`)
              console.log(`⚠️ Delays over 1000ms: ${delayCount}`)
              console.log(`🔤 Final response length: ${accumulatedContent.length} characters`)
              
              // استهلاك رسالة واحدة بعد اكتمال الرد
              if (accumulatedContent.trim()) {
                const { data: consumeResult, error: consumeError } = await supabaseAdmin
                  .rpc('consume_message', { merchant_id: merchant.id })

                if (consumeError) {
                  console.error('❌ Error consuming message:', consumeError)
                } else {
                  const result = consumeResult && consumeResult[0]
                  if (result && result.success) {
                    console.log('✅ Message consumed successfully:', {
                      dailyRemaining: result.daily_remaining,
                      monthlyRemaining: result.monthly_remaining,
                      consumptionDetails: result.message
                    })
                  }
                }
              }
              
              controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'))
              controller.close()
              break
            }

            // Track timing and delays
            const timeSinceLastChunk = chunkStartTime - lastChunkTime
            if (timeSinceLastChunk > maxDelay) {
              maxDelay = timeSinceLastChunk
            }
            if (timeSinceLastChunk > 1000) { // Delays over 1 second
              delayCount++
              console.log(`🐌 SIGNIFICANT DELAY: ${timeSinceLastChunk}ms since last chunk`)
            }

            chunkCount++
            totalBytes += value.length
            lastChunkTime = chunkEndTime

            // Log every 10th chunk for monitoring
            if (chunkCount % 10 === 0) {
              console.log(`📦 Chunk ${chunkCount}: ${value.length} bytes, read delay: ${readDelay}ms, since last: ${timeSinceLastChunk}ms`)
            }

            const chunk = decoder.decode(value, { stream: true })
            const lines = chunk.split('\n')

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6).trim()
                
                if (data === '[DONE]') continue
                
                try {
                  const parsed = JSON.parse(data)
                  const content = parsed.choices?.[0]?.delta?.content || ''
                  
                  if (content) {
                    accumulatedContent += content
                    
                    // Send chunk to client (will be saved in localStorage by frontend)
                    controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({
                      content: content,
                      delta: content
                    })}\n\n`))
                  }
                } catch (parseError) {
                  console.error('Parse error:', parseError)
                }
              }
            }
          }
        } catch (streamError) {
          const errorTime = Date.now() - startTime
          console.error(`❌ STREAMING ERROR after ${errorTime}ms:`, streamError)
          console.error(`📊 Processed ${chunkCount} chunks, ${totalBytes} bytes before error`)
          controller.error(streamError)
        }
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    })

  } catch (error) {
    console.error('❌ Streaming error:', error)
    throw error
  }
}

// Regular response with Local Storage (No DB saving)
async function generateRegularResponse(message: string, context: string, conversationHistory: any[]): Promise<string> {
  console.log('📝 Generating regular response (Local Storage Mode)...')

  // Use Environment Variables from Vercel
  const apiKey = process.env.CHUTES_AI_API_KEY
  const apiUrl = process.env.CHUTES_AI_API_URL || 'https://llm.chutes.ai/v1/chat/completions'
  const model = process.env.CHUTES_AI_MODEL || 'deepseek-ai/DeepSeek-V3-0324'

  if (!apiKey) {
    console.warn('❌ CHUTES_AI_API_KEY not found')
    return 'عذراً، خدمة الذكاء الاصطناعي غير متاحة حالياً. يرجى المحاولة مرة أخرى لاحقاً.'
  }

  // Build proper messages array for AI API (CORRECT FORMAT)
  const messages = []
  
  // 1. Add system message with business context
  messages.push({
    role: "system",
    content: context
  })

  // 2. Add conversation history as separate messages
  if (conversationHistory && conversationHistory.length > 0) {
    conversationHistory.forEach((msg: any) => {
      messages.push({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content
      })
    })
    console.log(`📝 Added ${conversationHistory.length} history messages to AI context`)
  }

  // 3. Add current user message
  messages.push({
    role: "user",
    content: message
  })

  console.log(`🎯 Total messages sent to AI: ${messages.length} (1 system + ${conversationHistory.length} history + 1 current)`)

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: model,
        messages: messages, // Use proper messages array format
        stream: false,
        max_tokens: 128000,
        temperature: 0.7
      })
    })

    console.log(`📦 AI API Status: ${response.status}`)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ AI API error:', response.status, errorText)
      throw new Error(`AI API error: ${response.status}`)
    }

    const data = await response.json()
    console.log("✅ AI Response received (Local Storage Mode)")
    
    if (data.choices?.[0]?.message?.content) {
      let aiResponse = data.choices[0].message.content.trim()
      // Clean up response
      aiResponse = aiResponse.replace(/^(مساعد|المساعد|أنا|مرحباً،?|أهلاً،?)\s*/i, '')
      return aiResponse || 'شكراً لك على تواصلك معنا. كيف يمكنني مساعدتك؟'
    } else {
      throw new Error('Invalid AI response format')
    }

  } catch (error) {
    console.error('❌ AI generation error:', error)
    return `عذراً، خدمة الذكاء الاصطناعي غير متاحة حالياً. يرجى المحاولة مرة أخرى لاحقاً.`
  }
} 