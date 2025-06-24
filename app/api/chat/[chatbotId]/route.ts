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

    // 5. Prepare context for AI
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
${conversationHistory.slice(-10).map((msg: any) => 
  `${msg.role === 'user' ? 'العميل' : 'المساعد'}: ${msg.content}`
).join('\n')}
`

    // 6. Generate AI response
    let aiResponse = 'شكراً لك على رسالتك. سأحيلك إلى فريق خدمة العملاء للحصول على مساعدة أفضل.'
    
    try {
      // For now, we'll create a simple rule-based response
      // You can replace this with actual AI API call (Chutes AI or OpenAI)
      aiResponse = await generateAIResponse(message, businessContext, merchant.businessName)
      
    } catch (aiError) {
      console.error('AI response error:', aiError)
      aiResponse = `شكراً لاهتمامك بـ ${merchant.businessName}. للحصول على معلومات دقيقة، يرجى التواصل معنا مباشرة.`
    }

    // 7. Store AI response
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

    // 8. Update message usage count
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

// Simple AI response generator (replace with actual AI service)
async function generateAIResponse(userMessage: string, context: string, businessName: string): Promise<string> {
  const lowerMessage = userMessage.toLowerCase()
  
  // Simple keyword-based responses
  if (lowerMessage.includes('مرحبا') || lowerMessage.includes('السلام') || lowerMessage.includes('أهلا')) {
    return `أهلاً وسهلاً بك في ${businessName}! كيف يمكنني مساعدتك اليوم؟`
  }
  
  if (lowerMessage.includes('منتج') || lowerMessage.includes('سعر') || lowerMessage.includes('شراء')) {
    return `يسعدني مساعدتك في التعرف على منتجاتنا في ${businessName}. يمكنك تصفح معلومات المنتجات والأسعار، أو التواصل معنا مباشرة للحصول على تفاصيل أكثر.`
  }
  
  if (lowerMessage.includes('تواصل') || lowerMessage.includes('هاتف') || lowerMessage.includes('اتصال')) {
    return `للتواصل معنا في ${businessName}، يمكنك استخدام معلومات الاتصال الموجودة في الموقع أو ترك رسالة وسنعاود الاتصال بك قريباً.`
  }
  
  if (lowerMessage.includes('ساعات') || lowerMessage.includes('مواعيد') || lowerMessage.includes('وقت')) {
    return `بخصوص مواعيد العمل في ${businessName}، يرجى التواصل معنا مباشرة للحصول على معلومات دقيقة حول ساعات العمل.`
  }
  
  if (lowerMessage.includes('توصيل') || lowerMessage.includes('شحن') || lowerMessage.includes('خدمة')) {
    return `نحن في ${businessName} نسعى لتقديم أفضل خدمة لعملائنا. للاستفسار عن خدمات التوصيل والشحن، يرجى التواصل معنا للحصول على تفاصيل أكثر.`
  }
  
  // Default response
  return `شكراً لك على تواصلك مع ${businessName}. للحصول على إجابة مفصلة على استفسارك، يرجى التواصل مع فريق خدمة العملاء مباشرة.`
} 