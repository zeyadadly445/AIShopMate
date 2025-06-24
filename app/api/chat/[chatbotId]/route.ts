import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ chatbotId: string }> }
) {
  console.log('🚀 Chat API with AI Integration Started')
  
  try {
    // 1. Get chatbotId
    const { chatbotId } = await params
    console.log('📍 ChatbotId:', chatbotId)
    
    // 2. Parse request body
    const body = await request.json()
    const { message, sessionId, stream = true } = body
    console.log('📥 Request:', { 
      hasMessage: !!message, 
      hasSessionId: !!sessionId, 
      stream,
      messageLength: message?.length 
    })

    // 3. Validate required fields
    if (!chatbotId || !message || !sessionId) {
      console.error('❌ Missing required fields')
      return NextResponse.json({
        error: 'Missing required fields: chatbotId, message, sessionId'
      }, { status: 400 })
    }

    // 4. Get merchant data
    console.log('🔍 Getting merchant data...')
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
        )
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

    // 5. Check subscription
    const subscription = Array.isArray(merchant.subscription) 
      ? merchant.subscription[0] 
      : merchant.subscription

    if (subscription) {
      if (subscription.status !== 'ACTIVE' && subscription.status !== 'TRIAL') {
        return NextResponse.json({
          response: 'عذراً، انتهت صلاحية الاشتراك. يرجى التواصل مع صاحب المتجر.'
        })
      }

      if (subscription.messagesUsed >= subscription.messagesLimit) {
        return NextResponse.json({
          response: 'عذراً، تم استنفاد حد الرسائل المسموح. يرجى التواصل مع صاحب المتجر.'
        })
      }
    }

    // 6. Handle conversation
    console.log('💬 Managing conversation...')
    let conversationId = null
    
    const { data: existingConv } = await supabaseAdmin
      .from('Conversation')
      .select('id')
      .eq('merchantId', merchant.id)
      .eq('sessionId', sessionId)
      .maybeSingle()

    if (existingConv) {
      conversationId = existingConv.id
      console.log('✅ Found existing conversation')
    } else {
      const { data: newConv, error: convError } = await supabaseAdmin
        .from('Conversation')
        .insert({
          merchantId: merchant.id,
          sessionId: sessionId
        })
        .select('id')
        .single()

      if (convError) {
        console.error('❌ Error creating conversation:', convError)
        throw new Error('Failed to create conversation')
      }
      
      conversationId = newConv.id
      console.log('✅ Created new conversation')
    }

    // 7. Store user message
    await supabaseAdmin
      .from('Message')
      .insert({
        conversationId,
        role: 'USER',
        content: message
      })
    console.log('✅ User message stored')

    // 8. Generate AI response
    console.log('🤖 Generating AI response...')
    const context = `أنت مساعد ذكي لمتجر "${merchant.businessName}". تحدث باللغة العربية بطريقة مهذبة ومفيدة وقدم ردود مفصلة ومساعدة.`

    if (stream) {
      // Return streaming response
      return await generateStreamingResponse(message, context, conversationId, subscription, merchant)
    } else {
      // Return regular response
      const aiResponse = await generateRegularResponse(message, context)
      
      // Store AI response
      await supabaseAdmin
        .from('Message')
        .insert({
          conversationId,
          role: 'ASSISTANT',
          content: aiResponse
        })

      // Update message count
      if (subscription) {
        await supabaseAdmin
          .from('Subscription')
          .update({ messagesUsed: subscription.messagesUsed + 1 })
          .eq('merchantId', merchant.id)
      }

      return NextResponse.json({ response: aiResponse })
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

// Streaming response with Environment Variables
async function generateStreamingResponse(
  message: string, 
  context: string, 
  conversationId: string,
  subscription: any,
  merchant: any
): Promise<Response> {
  console.log('🌊 Starting streaming response with ENV variables...')

  // Use Environment Variables from Vercel
  const apiKey = process.env.CHUTES_AI_API_KEY
  const apiUrl = process.env.CHUTES_AI_API_URL || 'https://llm.chutes.ai/v1/chat/completions'
  const model = process.env.CHUTES_AI_MODEL || 'deepseek-ai/DeepSeek-V3-0324'

  console.log('🔑 Using ENV:', {
    hasApiKey: !!apiKey,
    apiUrl,
    model
  })

  if (!apiKey) {
    console.error('❌ CHUTES_AI_API_KEY not found in environment variables')
    throw new Error('AI API key not configured')
  }

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: "user", content: `${context}\n\nالعميل: ${message}` }
        ],
        stream: true,
        max_tokens: 128000, // 128K tokens as requested
        temperature: 0.7
      })
    })

    console.log(`📦 AI API Status: ${response.status}`)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ AI API error:', response.status, errorText)
      throw new Error(`AI API error: ${response.status}`)
    }

    // Create streaming response
    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader()
        const decoder = new TextDecoder()
        let accumulatedContent = ''

        if (!reader) {
          controller.error(new Error('No response body'))
          return
        }

        try {
          while (true) {
            const { done, value } = await reader.read()
            
            if (done) {
              console.log('✅ Stream completed, saving to database...')
              
              // Save complete response to database
              if (accumulatedContent.trim()) {
                await supabaseAdmin
                  .from('Message')
                  .insert({
                    conversationId,
                    role: 'ASSISTANT',
                    content: accumulatedContent.trim()
                  })
                
                // Update message count
                if (subscription) {
                  await supabaseAdmin
                    .from('Subscription')
                    .update({ messagesUsed: subscription.messagesUsed + 1 })
                    .eq('merchantId', merchant.id)
                }
              }
              
              controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'))
              controller.close()
              break
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
                    
                    // Send chunk to client
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
          console.error('Stream error:', streamError)
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

// Regular response with Environment Variables
async function generateRegularResponse(message: string, context: string): Promise<string> {
  console.log('📝 Generating regular response with ENV variables...')

  // Use Environment Variables from Vercel
  const apiKey = process.env.CHUTES_AI_API_KEY
  const apiUrl = process.env.CHUTES_AI_API_URL || 'https://llm.chutes.ai/v1/chat/completions'
  const model = process.env.CHUTES_AI_MODEL || 'deepseek-ai/DeepSeek-V3-0324'

  if (!apiKey) {
    console.warn('❌ CHUTES_AI_API_KEY not found')
    return 'عذراً، خدمة الذكاء الاصطناعي غير متاحة حالياً. يرجى المحاولة مرة أخرى لاحقاً.'
  }

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: "user", content: `${context}\n\nالعميل: ${message}` }
        ],
        stream: false,
        max_tokens: 128000, // 128K tokens as requested
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
    console.log("✅ AI Response received")
    
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