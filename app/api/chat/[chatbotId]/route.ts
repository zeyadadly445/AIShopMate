import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ chatbotId: string }> }
) {
  try {
    const { chatbotId } = await params
    console.log('🚀 Chat API called with chatbotId:', chatbotId)
    
    // Parse request body with error handling
    let requestBody
    try {
      requestBody = await request.json()
      console.log('📥 Request body parsed:', { 
        hasMessage: !!requestBody.message, 
        hasSessionId: !!requestBody.sessionId,
        stream: requestBody.stream 
      })
    } catch (parseError) {
      console.error('❌ Error parsing request body:', parseError)
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }

    const { message, sessionId, conversationHistory = [], stream = true } = requestBody

    if (!chatbotId || !message || !sessionId) {
      console.error('❌ Missing required fields:', { chatbotId, message: !!message, sessionId: !!sessionId })
      return NextResponse.json(
        { 
          error: 'chatbotId, message, and sessionId are required',
          received: { chatbotId, hasMessage: !!message, hasSessionId: !!sessionId }
        },
        { status: 400 }
      )
    }

    console.log('🔍 Looking up merchant...')
    // 1. Fetch merchant data
    const { data: merchant, error: merchantError } = await supabaseAdmin
      .from('Merchant')
      .select(`
        id,
        businessName,
        welcomeMessage,
        primaryColor,
        subscription:Subscription(
          messagesLimit,
          messagesUsed,
          status
        ),
        dataSources:MerchantDataSource(
          type,
          title,
          url,
          isActive
        )
      `)
      .eq('chatbotId', chatbotId)
      .single()

    if (merchantError || !merchant) {
      console.error('❌ Merchant lookup failed:', {
        chatbotId,
        error: merchantError?.message,
        errorCode: merchantError?.code,
        foundMerchant: !!merchant
      })
      return NextResponse.json({ 
        error: 'Merchant not found',
        chatbotId,
        details: merchantError?.message || 'No merchant found with this chatbot ID'
      }, { status: 404 })
    }

    console.log('✅ Merchant found:', merchant.businessName)

    // 2. Check subscription limits
    const subscription = Array.isArray(merchant.subscription) 
      ? merchant.subscription[0] 
      : merchant.subscription

    if (subscription) {
      if (subscription.status !== 'ACTIVE' && subscription.status !== 'TRIAL') {
        console.log('❌ Subscription inactive:', subscription.status)
        return NextResponse.json(
          { response: 'عذراً، انتهت صلاحية الاشتراك. يرجى التواصل مع صاحب المتجر.' },
          { status: 200 }
        )
      }

      if (subscription.messagesUsed >= subscription.messagesLimit) {
        console.log('❌ Message limit exceeded:', subscription.messagesUsed, '>=', subscription.messagesLimit)
        return NextResponse.json(
          { response: 'عذراً، تم استنفاد حد الرسائل المسموح. يرجى التواصل مع صاحب المتجر.' },
          { status: 200 }
        )
      }
    }

    console.log('🔍 Finding/creating conversation...')
    // 3. Find or create conversation
    let conversationId = null
    
    const { data: existingConversation, error: convFindError } = await supabaseAdmin
      .from('Conversation')
      .select('id')
      .eq('merchantId', merchant.id)
      .eq('sessionId', sessionId)
      .single()

    if (convFindError && convFindError.code !== 'PGRST116') {
      console.error('❌ Error finding conversation:', convFindError)
      return NextResponse.json(
        { error: 'Database error while finding conversation' },
        { status: 500 }
      )
    }

    if (existingConversation) {
      conversationId = existingConversation.id
      console.log('✅ Found existing conversation:', conversationId)
    } else {
      console.log('🆕 Creating new conversation...')
      const { data: newConversation, error: convError } = await supabaseAdmin
        .from('Conversation')
        .insert({
          merchantId: merchant.id,
          sessionId: sessionId
        })
        .select('id')
        .single()

      if (convError) {
        console.error('❌ Error creating conversation:', convError)
        return NextResponse.json(
          { error: 'Failed to create conversation' },
          { status: 500 }
        )
      }
      conversationId = newConversation.id
      console.log('✅ Created new conversation:', conversationId)
    }

    console.log('💾 Storing user message...')
    // 4. Store user message
    const { error: userMessageError } = await supabaseAdmin
      .from('Message')
      .insert({
        conversationId,
        role: 'USER',
        content: message
      })

    if (userMessageError) {
      console.error('⚠️ Error storing user message:', userMessageError)
    } else {
      console.log('✅ User message stored')
    }

    console.log('📜 Getting conversation history...')
    // 5. Get conversation history
    const { data: messageHistory, error: historyError } = await supabaseAdmin
      .from('Message')
      .select('role, content, createdAt')
      .eq('conversationId', conversationId)
      .order('createdAt', { ascending: true })
      .limit(20)

    if (historyError) {
      console.error('⚠️ Error getting message history:', historyError)
    }

    const conversationHistoryFromDB = messageHistory || []
    console.log('📝 Got', conversationHistoryFromDB.length, 'messages from history')

    // 6. Prepare simplified context for AI (to avoid complexity issues)
    const businessContext = `أنت مساعد ذكي لمتجر "${merchant.businessName}". تحدث باللغة العربية بشكل مفصل ومفيد.

معلومات المتجر:
${merchant.dataSources?.filter((ds: any) => ds.isActive).map((ds: any) => 
  `- ${ds.type}: ${ds.title}`
).join('\n') || 'متجر للمنتجات والخدمات'}

كن مهذباً ومساعداً وركز على خدمات المتجر.`

    // 7. Generate AI response using enhanced streaming
    if (stream) {
      console.log('🌊 Starting enhanced streaming response...')
      // For streaming, we return the stream directly
      try {
        const streamResponse = await generateEnhancedAIStreamResponse(message, businessContext, conversationHistoryFromDB, merchant, conversationId)
        
        // Update message usage count before streaming
        if (subscription) {
          console.log('📊 Updating message usage count...')
          const { error: updateError } = await supabaseAdmin
            .from('Subscription')
            .update({ 
              messagesUsed: subscription.messagesUsed + 1 
            })
            .eq('merchantId', merchant.id)

          if (updateError) {
            console.error('⚠️ Error updating message count:', updateError)
          }
        }

        return streamResponse
        
      } catch (aiError) {
        console.error('❌ AI streaming error:', aiError)
        return NextResponse.json({
          error: 'AI service unavailable',
          response: `شكراً لاهتمامك بـ ${merchant.businessName}. للحصول على معلومات دقيقة، يرجى التواصل معنا مباشرة.`
        }, { status: 500 })
      }
    } else {
      console.log('📝 Generating non-streaming response...')
      // Non-streaming response (fallback)
      let aiResponse = 'شكراً لك على رسالتك. سأحيلك إلى فريق خدمة العملاء للحصول على مساعدة أفضل.'
      
      try {
        aiResponse = await generateAIResponse(message, businessContext, conversationHistoryFromDB)
        
      } catch (aiError) {
        console.error('❌ AI response error:', aiError)
        aiResponse = `شكراً لاهتمامك بـ ${merchant.businessName}. للحصول على معلومات دقيقة، يرجى التواصل معنا مباشرة.`
      }

      // 8. Store AI response (for non-streaming only)
      const { error: aiMessageError } = await supabaseAdmin
        .from('Message')
        .insert({
          conversationId,
          role: 'ASSISTANT',
          content: aiResponse
        })

      if (aiMessageError) {
        console.error('⚠️ Error storing AI message:', aiMessageError)
      }

      // 9. Update message usage count
      if (subscription) {
        const { error: updateError } = await supabaseAdmin
          .from('Subscription')
          .update({ 
            messagesUsed: subscription.messagesUsed + 1 
          })
          .eq('merchantId', merchant.id)

        if (updateError) {
          console.error('⚠️ Error updating message count:', updateError)
        }
      }

      return NextResponse.json({ response: aiResponse })
    }

  } catch (error) {
    console.error('💥 CRITICAL ERROR in chat endpoint:', error)
    console.error('💥 Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Calculate enhanced max tokens
function calculateMaxTokens(userMessage: string, conversationHistory: any[], context: string): number {
  const baseTokens = 5000
  const messageLength = userMessage.length
  const historyLength = conversationHistory.length
  const contextLength = context.length
  
  let calculatedTokens = baseTokens
  calculatedTokens += Math.min(messageLength * 3, 20000)
  calculatedTokens += Math.min(historyLength * 300, 10000)
  calculatedTokens += Math.min(contextLength / 5, 10000)
  
  // Enhanced limit: up to 128K tokens
  return Math.min(calculatedTokens, 128000)
}

// Enhanced AI response generator (non-streaming)
async function generateAIResponse(userMessage: string, context: string, conversationHistory: any[]): Promise<string> {
  const chuteAIApiKey = process.env.CHUTES_AI_API_KEY
  const chuteAIUrl = 'https://llm.chutes.ai/v1/chat/completions'

  if (!chuteAIApiKey) {
    console.warn('CHUTES_AI_API_KEY not found, using fallback response')
    return 'عذراً، خدمة الذكاء الاصطناعي غير متاحة حالياً. يرجى المحاولة مرة أخرى لاحقاً.'
  }

  const maxTokens = calculateMaxTokens(userMessage, conversationHistory, context)

  try {
    const response = await fetch(chuteAIUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${chuteAIApiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-ai/DeepSeek-V3-0324',
        messages: [
          {
            role: 'user',
            content: `${context}\n\nالعميل: ${userMessage}`
          }
        ],
        max_tokens: maxTokens,
        temperature: 0.7,
        stream: false
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Chutes AI API error:', response.status, response.statusText, errorText)
      throw new Error(`AI API error: ${response.status} - ${response.statusText}`)
    }

    const data = await response.json()
    
    if (data.choices && data.choices[0] && data.choices[0].message) {
      let aiResponse = data.choices[0].message.content.trim()
      
      // Clean up the response
      aiResponse = aiResponse.replace(/^(مساعد|المساعد|أنا|مرحباً،?|أهلاً،?)\s*/i, '')
      
      return aiResponse || 'شكراً لك على تواصلك معنا. كيف يمكنني مساعدتك؟'
    } else {
      console.error('Unexpected AI API response format:', data)
      throw new Error('Invalid AI API response format')
    }

  } catch (error) {
    console.error('Error calling Chutes AI API:', error)
    throw error
  }
}

// ENHANCED streaming response generator with 128K tokens support
async function generateEnhancedAIStreamResponse(
  userMessage: string, 
  context: string, 
  conversationHistory: any[],
  merchant: any,
  conversationId: string
): Promise<Response> {
  const chuteAIApiKey = process.env.CHUTES_AI_API_KEY
  const chuteAIUrl = 'https://llm.chutes.ai/v1/chat/completions'

  if (!chuteAIApiKey) {
    throw new Error('CHUTES_AI_API_KEY not configured')
  }

  const maxTokens = calculateMaxTokens(userMessage, conversationHistory, context)

  console.log('🚀 Enhanced streaming with:', { maxTokens, model: 'DeepSeek-V3-0324' })

  try {
    const response = await fetch(chuteAIUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${chuteAIApiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-ai/DeepSeek-V3-0324',
        messages: [
          {
            role: 'user',
            content: `${context}\n\nالعميل: ${userMessage}`
          }
        ],
        max_tokens: maxTokens,
        temperature: 0.7,
        stream: true
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Chutes AI streaming API error:', response.status, response.statusText, errorText)
      throw new Error(`AI API error: ${response.status} - ${response.statusText}`)
    }

    // Create enhanced streaming response
    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader()
        const decoder = new TextDecoder()
        let accumulatedResponse = ''

        if (!reader) {
          controller.error(new Error('No response body'))
          return
        }

        try {
          while (true) {
            const { done, value } = await reader.read()
            
            if (done) {
              console.log('✅ Stream completed, saving to database...')
              
              // Store the complete response in database
              if (accumulatedResponse.trim()) {
                await supabaseAdmin
                  .from('Message')
                  .insert({
                    conversationId,
                    role: 'ASSISTANT',
                    content: accumulatedResponse.trim()
                  })
              }
              
              // Send completion signal
              controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'))
              controller.close()
              break
            }

            const chunk = decoder.decode(value, { stream: true })
            const lines = chunk.split('\n')

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6).trim()
                
                if (data === '[DONE]') {
                  continue
                }

                try {
                  const parsed = JSON.parse(data)
                  const content = parsed.choices?.[0]?.delta?.content || ''
                  
                  if (content) {
                    accumulatedResponse += content
                    
                    // Clean up content for first few characters
                    let cleanContent = content
                    if (accumulatedResponse.length < 50) {
                      cleanContent = content.replace(/^(مساعد|المساعد|أنا|مرحباً،?|أهلاً،?)\s*/i, '')
                    }
                    
                    // Send the chunk immediately to client
                    controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({
                      content: cleanContent,
                      delta: cleanContent
                    })}\n\n`))
                  }
                } catch (parseError) {
                  console.error('Error parsing streaming chunk:', parseError)
                }
              }
            }
          }

        } catch (error) {
          console.error('Streaming error:', error)
          controller.error(error)
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
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'X-Accel-Buffering': 'no'
      }
    })

  } catch (error) {
    console.error('Error calling enhanced Chutes AI streaming API:', error)
    throw error
  }
} 