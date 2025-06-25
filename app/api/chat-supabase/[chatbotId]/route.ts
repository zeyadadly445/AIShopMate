import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { detectLanguage, generateLimitMessage } from '@/lib/language-detector'

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

    const { message, sessionId } = requestBody

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
    const { data: merchant, error: merchantError } = await supabaseAdmin
      .from('Merchant')
      .select(`
        id,
        businessName,
        welcomeMessage,
        primaryColor,
        isActive,
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
      console.error('Merchant lookup failed:', {
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

    // 2. فحص الحدود باستخدام الدالة الجديدة
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
      
      // اكتشاف لغة الرسالة المرسلة
      const userLanguage = detectLanguage(message)
      
      // تحديد نوع الحد المتجاوز وإنتاج الرسالة المناسبة
      const limitType = limits?.reason === 'تم تجاوز الحد اليومي' ? 'daily' : 'monthly'
      const limitMessage = generateLimitMessage(limitType, userLanguage, merchant.businessName)
      
      console.log('📝 Returning limit message in', userLanguage, 'language:', limitMessage)
      
      // إرجاع رسالة شات بوت بدلاً من redirect
      return NextResponse.json({ 
        response: limitMessage,
        isLimitReached: true,
        limitType: limitType,
        language: userLanguage
      })
    }

    // 3. Find or create conversation
    let conversationId = null
    
    const { data: existingConversation } = await supabaseAdmin
      .from('Conversation')
      .select('id')
      .eq('merchantId', merchant.id)
      .eq('sessionId', sessionId)
      .single()

    if (existingConversation) {
      conversationId = existingConversation.id
    } else {
      const { data: newConversation, error: convError } = await supabaseAdmin
        .from('Conversation')
        .insert({
          merchantId: merchant.id,
          sessionId: sessionId
        })
        .select('id')
        .single()

      if (convError) {
        console.error('Error creating conversation:', convError)
        return NextResponse.json(
          { error: 'Failed to create conversation' },
          { status: 500 }
        )
      }
      conversationId = newConversation.id
    }

    // 4. Store user message
    const { error: userMessageError } = await supabaseAdmin
      .from('Message')
      .insert({
        conversationId,
        role: 'USER',
        content: message
      })

    if (userMessageError) {
      console.error('Error storing user message:', userMessageError)
    }

    // 5. Get conversation history
    const { data: messageHistory } = await supabaseAdmin
      .from('Message')
      .select('role, content, createdAt')
      .eq('conversationId', conversationId)
      .order('createdAt', { ascending: true })
      .limit(20)

    const conversationHistoryFromDB = messageHistory || []

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

    // 7. Generate AI response
    let aiResponse = 'شكراً لك على رسالتك. سأحيلك إلى فريق خدمة العملاء للحصول على مساعدة أفضل.'
    
    try {
      aiResponse = await generateAIResponse(message, businessContext, conversationHistoryFromDB)
      
    } catch (aiError) {
      console.error('AI response error:', aiError)
      aiResponse = `شكراً لاهتمامك بـ ${merchant.businessName}. للحصول على معلومات دقيقة، يرجى التواصل معنا مباشرة.`
    }

    // 8. Store AI response
    const { error: aiMessageError } = await supabaseAdmin
      .from('Message')
      .insert({
        conversationId,
        role: 'ASSISTANT',
        content: aiResponse
      })

    if (aiMessageError) {
      console.error('Error storing AI message:', aiMessageError)
    }

    // 9. استهلاك رسالة واحدة باستخدام الدالة الجديدة
    const { data: consumeResult, error: consumeError } = await supabaseAdmin
      .rpc('consume_message', { merchant_id: merchant.id })

    if (consumeError) {
      console.error('❌ Error consuming message:', consumeError)
      // لا نُرجع خطأ هنا لأن الرد تم إرساله بالفعل
    } else {
      const result = consumeResult && consumeResult[0]
      if (result && result.success) {
        console.log('✅ Message consumed successfully:', {
          dailyRemaining: result.daily_remaining,
          monthlyRemaining: result.monthly_remaining,
          consumptionDetails: result.message
        })
      } else {
        console.warn('⚠️ Message consumption failed:', result?.message)
        // قد يكون بسبب تجاوز الحدود أو مشكلة أخرى
      }
    }

    return NextResponse.json({ 
      response: aiResponse,
      usage: consumeResult && consumeResult[0] ? {
        daily_remaining: consumeResult[0].daily_remaining,
        monthly_remaining: consumeResult[0].monthly_remaining
      } : undefined
    })

  } catch (error) {
    console.error('Error in chat endpoint:', error)
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
  
  let calculatedTokens = baseTokens
  calculatedTokens += Math.min(messageLength * 2, 10000)
  calculatedTokens += Math.min(historyLength * 200, 5000)
  calculatedTokens += Math.min(contextLength / 10, 5000)
  
  return Math.min(calculatedTokens, 60000)
}

// AI response generator using Chutes AI API with DeepSeek V3
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

  const fullPrompt = context + conversationContext + '\n\nتعليمات إضافية:\n- رد بطريقة طبيعية ومساعدة\n- قدم إجابة شاملة ومفيدة\n- لا تذكر أنك مساعد ذكي'

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
    throw error
  }
} 