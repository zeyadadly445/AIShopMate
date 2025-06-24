import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ chatbotId: string }> }
) {
  try {
    const { chatbotId } = await params
    const { message, sessionId, conversationHistory = [] } = await request.json()

    if (!chatbotId || !message || !sessionId) {
      return NextResponse.json(
        { error: 'chatbotId, message, and sessionId are required' },
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
      return NextResponse.json({ error: 'Merchant not found' }, { status: 404 })
    }

    // 2. Check subscription limits
    const subscription = Array.isArray(merchant.subscription) 
      ? merchant.subscription[0] 
      : merchant.subscription

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
    const { data: messageHistory, error: historyError } = await supabaseAdmin
      .from('Message')
      .select('role, content, createdAt')
      .eq('conversationId', conversationId)
      .order('createdAt', { ascending: true })
      .limit(20) // Get last 20 messages

    const conversationHistoryFromDB = messageHistory || []

    // 6. Prepare context for AI
    const businessContext = `
أنت مساعد ذكي لمتجر "${merchant.businessName}".

معلومات المتجر:
${merchant.dataSources?.filter(ds => ds.isActive).map(ds => 
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

    // 7. Generate AI response using Chutes AI
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

    // 9. Update message usage count
    if (subscription) {
      const { error: updateError } = await supabaseAdmin
        .from('Subscription')
        .update({ 
          messagesUsed: subscription.messagesUsed + 1 
        })
        .eq('merchantId', merchant.id)

      if (updateError) {
        console.error('Error updating message count:', updateError)
      }
    }

    return NextResponse.json({ response: aiResponse })

  } catch (error) {
    console.error('Error in chat endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
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

  // Prepare the prompt with context and message format required by DeepSeek
  const fullPrompt = context + conversationContext + '\n\nتعليمات إضافية:\n- رد بطريقة طبيعية ومساعدة\n- اجعل الرد قصير ومفيد\n- لا تذكر أنك مساعد ذكي'

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
        max_tokens: 300,
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