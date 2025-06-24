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

    // 8. Generate AI response using the EXACT working method
    console.log('🤖 Generating AI response...')
    
    // Using the EXACT API key and configuration from working example
    const apiKey = "cpk_eb161cf56a904061bc4822fa69ee9743.bd57c9d531ec5ee78c0eb8d6b485a8f5.z98gs4bXvj1t3nc4Jv1kaMwO8j29usr2"
    const context = `أنت مساعد ذكي لمتجر "${merchant.businessName}". تحدث باللغة العربية بطريقة مهذبة ومفيدة.`

    if (stream) {
      // Return streaming response with 128K tokens
      return await generateStreamingResponse(message, context, apiKey, conversationId, subscription, merchant)
    } else {
      // Return regular response with 128K tokens
      const aiResponse = await generateRegularResponse(message, context, apiKey)
      
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

// Helper function for streaming response - EXACTLY like working example but with streaming
async function generateStreamingResponse(
  message: string, 
  context: string, 
  apiKey: string, 
  conversationId: string,
  subscription: any,
  merchant: any
): Promise<Response> {
  console.log('🌊 Starting streaming response with working configuration...')

  try {
    const response = await fetch("https://llm.chutes.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "deepseek-ai/DeepSeek-V3-0324",
        messages: [
          { role: "user", content: `${context}\n\nالعميل: ${message}` }
        ],
        stream: true,
        max_tokens: 128000, // 128K tokens as agreed
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

// Helper function for regular response - EXACTLY like working example
async function generateRegularResponse(message: string, context: string, apiKey: string): Promise<string> {
  console.log('📝 Generating regular response with working configuration...')

  try {
    const response = await fetch("https://llm.chutes.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "deepseek-ai/DeepSeek-V3-0324",
        messages: [
          { role: "user", content: `${context}\n\nالعميل: ${message}` }
        ],
        stream: false,
        max_tokens: 128000, // 128K tokens as agreed
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
    return `شكراً لاهتمامك بـ متجرنا. يرجى التواصل معنا للحصول على مساعدة أفضل.`
  }
} 