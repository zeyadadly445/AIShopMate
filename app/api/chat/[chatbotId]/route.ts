import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ chatbotId: string }> }
) {
  console.log('🚀 Chat API endpoint called')
  
  try {
    // 1. Get chatbotId from params
    const { chatbotId } = await params
    console.log('📍 ChatbotId:', chatbotId)
    
    // 2. Parse request body
    const body = await request.json()
    const { message, sessionId, stream = true } = body
    console.log('📥 Request data:', { 
      hasMessage: !!message, 
      hasSessionId: !!sessionId, 
      messageLength: message?.length,
      stream 
    })

    // 3. Validate required fields
    if (!chatbotId || !message || !sessionId) {
      console.error('❌ Missing required fields')
      return NextResponse.json({
        error: 'Missing required fields',
        required: ['chatbotId', 'message', 'sessionId']
      }, { status: 400 })
    }

    // 4. Get merchant data
    console.log('🔍 Looking up merchant...')
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
      console.error('❌ Merchant lookup failed:', merchantError)
      return NextResponse.json({
        error: 'Merchant not found',
        details: merchantError?.message
      }, { status: 404 })
    }
    
    console.log('✅ Merchant found:', merchant.businessName)

    // 5. Check subscription status
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
    
    // Try to find existing conversation
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
      // Create new conversation
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

    // 8. Generate AI response
    console.log('🤖 Generating AI response...')
    
    if (stream) {
      // Return streaming response
      return await generateStreamingResponse(message, merchant, conversationId)
    } else {
      // Return regular response
      const aiResponse = await generateRegularResponse(message, merchant)
      
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

// Helper function for streaming response
async function generateStreamingResponse(message: string, merchant: any, conversationId: string): Promise<Response> {
  console.log('🌊 Starting streaming response...')
  
  const apiKey = process.env.CHUTES_AI_API_KEY
  
  if (!apiKey) {
    console.error('❌ CHUTES_AI_API_KEY not found')
    throw new Error('AI service not configured')
  }

  const context = `أنت مساعد ذكي لمتجر "${merchant.businessName}". تحدث باللغة العربية بطريقة مهذبة ومفيدة.`

  try {
    const response = await fetch('https://llm.chutes.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-ai/DeepSeek-V3-0324',
        messages: [
          {
            role: 'user',
            content: `${context}\n\nالعميل: ${message}`
          }
        ],
        max_tokens: 4000,
        temperature: 0.7,
        stream: true
      })
    })

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
                await supabaseAdmin
                  .from('Subscription')
                  .update({ messagesUsed: merchant.subscription?.messagesUsed + 1 || 1 })
                  .eq('merchantId', merchant.id)
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

// Helper function for regular response
async function generateRegularResponse(message: string, merchant: any): Promise<string> {
  console.log('📝 Generating regular response...')
  
  const apiKey = process.env.CHUTES_AI_API_KEY
  
  if (!apiKey) {
    console.warn('❌ CHUTES_AI_API_KEY not found')
    return `شكراً لاهتمامك بـ ${merchant.businessName}. يرجى التواصل معنا للحصول على مساعدة أفضل.`
  }

  const context = `أنت مساعد ذكي لمتجر "${merchant.businessName}". تحدث باللغة العربية بطريقة مهذبة ومفيدة.`

  try {
    const response = await fetch('https://llm.chutes.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-ai/DeepSeek-V3-0324',
        messages: [
          {
            role: 'user',
            content: `${context}\n\nالعميل: ${message}`
          }
        ],
        max_tokens: 4000,
        temperature: 0.7,
        stream: false
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ AI API error:', response.status, errorText)
      throw new Error(`AI API error: ${response.status}`)
    }

    const data = await response.json()
    
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
    return `شكراً لاهتمامك بـ ${merchant.businessName}. يرجى التواصل معنا للحصول على مساعدة أفضل.`
  }
} 