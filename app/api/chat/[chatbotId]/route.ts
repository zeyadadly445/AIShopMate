import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/database-fallback'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ chatbotId: string }> }
) {
  try {
    const { chatbotId } = await params
    
    // Parse request body with error handling
    let requestBody
    try {
      requestBody = await request.json()
    } catch (parseError) {
      console.error('Error parsing request body:', parseError)
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }

    const { message, sessionId, conversationHistory = [], stream = true } = requestBody

    if (!chatbotId || !message || !sessionId) {
      console.error('Missing required fields:', { chatbotId, message: !!message, sessionId: !!sessionId })
      return NextResponse.json(
        { 
          error: 'chatbotId, message, and sessionId are required',
          received: { chatbotId, hasMessage: !!message, hasSessionId: !!sessionId }
        },
        { status: 400 }
      )
    }

    // 1. Fetch merchant data
    const db = await getDatabase()
    
    let merchant
    try {
      merchant = await db.merchant.findUnique({
        where: { chatbotId },
        include: {
          subscription: {
            select: {
              messagesLimit: true,
              messagesUsed: true,
              status: true
            }
          },
          dataSources: {
            select: {
              type: true,
              title: true,
              url: true,
              isActive: true
            }
          }
        }
      })
    } catch (dbError) {
      console.error('Database query failed:', dbError)
      return NextResponse.json({ 
        error: 'Database connection failed',
        details: 'Unable to connect to database'
      }, { status: 500 })
    }

    if (!merchant) {
      console.error('Merchant lookup failed:', {
        chatbotId,
        foundMerchant: !!merchant
      })
      return NextResponse.json({ 
        error: 'Merchant not found',
        chatbotId,
        details: 'No merchant found with this chatbot ID'
      }, { status: 404 })
    }

    // 2. Check subscription limits
    const subscription = merchant.subscription

    if (subscription) {
      if (subscription.status !== 'ACTIVE' && subscription.status !== 'TRIAL') {
        return NextResponse.json(
          { response: 'عذراً، انتهت صلاحية الاشتراك. يرجى التواصل مع صاحب المتجر.' },
          { status: 200 }
        )
      }

      if (subscription.messagesUsed >= subscription.messagesLimit) {
        return NextResponse.json(
          { response: 'عذراً، تم استنفاد حد الرسائل المسموح. يرجى التواصل مع صاحب المتجر.' },
          { status: 200 }
        )
      }
    }

    // 3. Find or create conversation
    let conversationId = null
    
    const existingConversation = await db.conversation.findFirst({
      where: {
        merchantId: merchant.id,
        sessionId: sessionId
      },
      select: { id: true }
    })

    if (existingConversation) {
      conversationId = existingConversation.id
    } else {
      try {
        const newConversation = await db.conversation.create({
          data: {
            merchantId: merchant.id,
            sessionId: sessionId
          },
          select: { id: true }
        })
        conversationId = newConversation.id
      } catch (convError) {
        console.error('Error creating conversation:', convError)
        return NextResponse.json(
          { error: 'Failed to create conversation' },
          { status: 500 }
        )
      }
    }

    // 4. Store user message
    try {
      await db.message.create({
        data: {
          conversationId,
          role: 'USER',
          content: message
        }
      })
    } catch (userMessageError) {
      console.error('Error storing user message:', userMessageError)
    }

    // 5. Get conversation history
    let conversationHistoryFromDB: any[] = []
    try {
      conversationHistoryFromDB = await db.message.findMany({
        where: { conversationId },
        select: {
          role: true,
          content: true,
          createdAt: true
        },
        orderBy: { createdAt: 'asc' },
        take: 20 // Get last 20 messages
      })
    } catch (historyError) {
      console.error('Error fetching conversation history:', historyError)
    }

    // 6. Prepare context for AI
    const businessContext = `
أنت مساعد ذكي لمتجر "${merchant.businessName}".

معلومات المتجر:
${merchant.dataSources?.filter((ds: any) => ds.isActive).map((ds: any) => 
  `- ${ds.type}: ${ds.title} (${ds.url})`
).join('\n') || 'لا توجد مصادر بيانات متاحة'}

تعليمات مهمة:
1. تحدث باللغة العربية دائماً
2. كن مهذباً ومساعداً
3. ركز على منتجات وخدمات المتجر
4. إذا لم تجد إجابة محددة، اطلب من العميل التواصل مع المتجر مباشرة
5. لا تتحدث عن متاجر أخرى أو منافسين
6. احتفظ بالطابع المهني والودود

محادثة سابقة:
${conversationHistoryFromDB.slice(-10).map((msg: any) => 
  `${msg.role === 'USER' ? 'العميل' : 'المساعد'}: ${msg.content}`
).join('\n')}
`

    // 7. Generate AI response using Chutes AI with streaming support
    if (stream) {
      // For streaming, we return the stream directly
      try {
        const streamResponse = await generateAIStreamResponse(message, businessContext, conversationHistoryFromDB)
        
        // Update message usage count before streaming
        if (subscription) {
          try {
            await db.subscription.update({
              where: { merchantId: merchant.id },
              data: { 
                messagesUsed: subscription.messagesUsed + 1 
              }
            })
          } catch (updateError) {
            console.error('Error updating message count:', updateError)
          }
        }

        return streamResponse
        
      } catch (aiError) {
        console.error('AI streaming error:', aiError)
        return NextResponse.json({
          error: 'AI service unavailable',
          fallback: `شكراً لاهتمامك بـ ${merchant.businessName}. للحصول على معلومات دقيقة، يرجى التواصل معنا مباشرة.`
        }, { status: 500 })
      }
    } else {
      // Non-streaming response (fallback)
      let aiResponse = 'شكراً لك على رسالتك. سأحيلك إلى فريق خدمة العملاء للحصول على مساعدة أفضل.'
      
      try {
        aiResponse = await generateAIResponse(message, businessContext, conversationHistoryFromDB)
        
      } catch (aiError) {
        console.error('AI response error:', aiError)
        console.error('AI error details:', {
          message: aiError instanceof Error ? aiError.message : aiError,
          stack: aiError instanceof Error ? aiError.stack : undefined,
          chatbotId,
          userMessage: message.substring(0, 100) // Only log first 100 chars for privacy
        })
        aiResponse = `شكراً لاهتمامك بـ ${merchant.businessName}. للحصول على معلومات دقيقة، يرجى التواصل معنا مباشرة.`
      }

      // 8. Store AI response (for non-streaming only)
      try {
        await db.message.create({
          data: {
            conversationId,
            role: 'ASSISTANT',
            content: aiResponse
          }
        })
      } catch (aiMessageError) {
        console.error('Error storing AI message:', aiMessageError)
      }

      // 9. Update message usage count
      if (subscription) {
        try {
          await db.subscription.update({
            where: { merchantId: merchant.id },
            data: { 
              messagesUsed: subscription.messagesUsed + 1 
            }
          })
        } catch (updateError) {
          console.error('Error updating message count:', updateError)
        }
      }

      return NextResponse.json({ response: aiResponse })
    }



  } catch (error) {
    console.error('Error in chat endpoint:', error)
    console.error('Error details:', {
      message: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    })
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Calculate dynamic max tokens based on context complexity
function calculateMaxTokens(userMessage: string, conversationHistory: any[], context: string): number {
  const baseTokens = 1000
  const messageLength = userMessage.length
  const historyLength = conversationHistory.length
  const contextLength = context.length
  
  // Calculate tokens based on content complexity
  let calculatedTokens = baseTokens
  
  // Add tokens based on message length
  calculatedTokens += Math.min(messageLength * 2, 10000)
  
  // Add tokens based on conversation history
  calculatedTokens += Math.min(historyLength * 200, 5000)
  
  // Add tokens based on context complexity
  calculatedTokens += Math.min(contextLength / 10, 5000)
  
  // Ensure we don't exceed the maximum limit
  return Math.min(calculatedTokens, 60000)
}

// AI response generator using Chutes AI API with DeepSeek V3 (non-streaming)
async function generateAIResponse(userMessage: string, context: string, conversationHistory: any[]): Promise<string> {
  const chuteAIApiKey = process.env.CHUTES_AI_API_KEY
  const chuteAIUrl = process.env.CHUTES_AI_API_URL || 'https://llm.chutes.ai/v1/chat/completions'

  if (!chuteAIApiKey) {
    console.warn('CHUTES_AI_API_KEY not found, using fallback response')
    return 'عذراً، خدمة الذكاء الاصطناعي غير متاحة حالياً. يرجى المحاولة مرة أخرى لاحقاً.'
  }

  // Build conversation history for context
  let conversationContext = ''
  const recentHistory = conversationHistory.slice(-10)
  
  if (recentHistory.length > 0) {
    conversationContext = '\n\nمحادثة سابقة:\n' + 
      recentHistory.map((msg: any) => 
        `${msg.role === 'USER' ? 'العميل' : 'المساعد'}: ${msg.content}`
      ).join('\n')
  }

  // Prepare the prompt with context and message format required by DeepSeek
  const fullPrompt = context + conversationContext + '\n\nتعليمات إضافية:\n- رد بطريقة طبيعية ومساعدة\n- قدم إجابة شاملة ومفيدة\n- لا تذكر أنك مساعد ذكي'

  // Calculate dynamic max tokens
  const maxTokens = calculateMaxTokens(userMessage, conversationHistory, context)

  try {
    const response = await fetch(chuteAIUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${chuteAIApiKey}`
      },
      body: JSON.stringify({
        model: process.env.CHUTES_AI_MODEL || 'deepseek-ai/DeepSeek-V3-0324',
        messages: [
          {
            role: 'user',
            content: `${fullPrompt}\n\nCustomer: ${userMessage}`
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
      
      // Clean up the response if it starts with common prefixes
      aiResponse = aiResponse.replace(/^(مساعد|المساعد|أنا|مرحباً،?|أهلاً،?)\s*/i, '')
      
      return aiResponse || 'شكراً لك على تواصلك معنا. كيف يمكنني مساعدتك؟'
    } else {
      console.error('Unexpected AI API response format:', data)
      throw new Error('Invalid AI API response format')
    }

  } catch (error) {
    console.error('Error calling Chutes AI API:', error)
    console.error('AI API error details:', {
      message: error instanceof Error ? error.message : error,
      url: chuteAIUrl,
      hasApiKey: !!chuteAIApiKey,
      model: process.env.CHUTES_AI_MODEL || 'deepseek-ai/DeepSeek-V3-0324',
      maxTokens
    })
    throw error
  }
}

// AI streaming response generator using Chutes AI API with DeepSeek V3
async function generateAIStreamResponse(userMessage: string, context: string, conversationHistory: any[]): Promise<Response> {
  const chuteAIApiKey = process.env.CHUTES_AI_API_KEY
  const chuteAIUrl = process.env.CHUTES_AI_API_URL || 'https://llm.chutes.ai/v1/chat/completions'

  if (!chuteAIApiKey) {
    throw new Error('CHUTES_AI_API_KEY not configured')
  }

  // Build conversation history for context
  let conversationContext = ''
  const recentHistory = conversationHistory.slice(-10)
  
  if (recentHistory.length > 0) {
    conversationContext = '\n\nمحادثة سابقة:\n' + 
      recentHistory.map((msg: any) => 
        `${msg.role === 'USER' ? 'العميل' : 'المساعد'}: ${msg.content}`
      ).join('\n')
  }

  // Prepare the prompt with context and message format required by DeepSeek
  const fullPrompt = context + conversationContext + '\n\nتعليمات إضافية:\n- رد بطريقة طبيعية ومساعدة\n- قدم إجابة شاملة ومفيدة\n- لا تذكر أنك مساعد ذكي'

  // Calculate dynamic max tokens
  const maxTokens = calculateMaxTokens(userMessage, conversationHistory, context)

  try {
    const response = await fetch(chuteAIUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${chuteAIApiKey}`
      },
      body: JSON.stringify({
        model: process.env.CHUTES_AI_MODEL || 'deepseek-ai/DeepSeek-V3-0324',
        messages: [
          {
            role: 'user',
            content: `${fullPrompt}\n\nCustomer: ${userMessage}`
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

    // Create a new streaming response
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
              // Store the complete accumulated response in database
              // Note: This would need to be implemented with proper context passing
              break
            }

            const chunk = decoder.decode(value, { stream: true })
            const lines = chunk.split('\n')

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6)
                
                if (data === '[DONE]') {
                  continue
                }

                try {
                  const parsed = JSON.parse(data)
                  const content = parsed.choices?.[0]?.delta?.content || ''
                  
                  if (content) {
                    accumulatedResponse += content
                    // Clean up the content if it starts with common prefixes
                    let cleanContent = content
                    if (accumulatedResponse.length < 50) {
                      cleanContent = content.replace(/^(مساعد|المساعد|أنا|مرحباً،?|أهلاً،?)\s*/i, '')
                    }
                    
                    // Send the chunk to the client
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

          // Send completion signal
          controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'))
          controller.close()

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
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    })

  } catch (error) {
    console.error('Error calling Chutes AI streaming API:', error)
    console.error('AI streaming API error details:', {
      message: error instanceof Error ? error.message : error,
      url: chuteAIUrl,
      hasApiKey: !!chuteAIApiKey,
      model: process.env.CHUTES_AI_MODEL || 'deepseek-ai/DeepSeek-V3-0324',
      maxTokens
    })
    throw error
  }
} 