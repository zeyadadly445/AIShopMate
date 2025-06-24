import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ chatbotId: string }> }
) {
  try {
    const { chatbotId } = await params
    const { message, sessionId } = await request.json()

    console.log('🚀 Direct chat request:', { chatbotId, message: message?.substring(0, 30) })

    // 1. Get merchant (we know this works from your test)
    const { data: merchant, error: merchantError } = await supabaseAdmin
      .from('Merchant')
      .select('id, businessName, welcomeMessage')
      .eq('chatbotId', chatbotId)
      .single()

    if (merchantError || !merchant) {
      return NextResponse.json({ 
        response: 'عذراً، لم نتمكن من العثور على هذا المتجر.' 
      }, { status: 404 })
    }

    // 2. Generate AI response (we know this works too)
    let aiResponse = `مرحباً! أنا مساعد ${merchant.businessName}. شكراً لك على رسالتك. كيف يمكنني مساعدتك اليوم؟`

    try {
      const chuteAIApiKey = process.env.CHUTES_AI_API_KEY
      const chuteAIUrl = process.env.CHUTES_AI_API_URL

      if (chuteAIApiKey && chuteAIUrl) {
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
                content: `أنت مساعد ذكي لمتجر ${merchant.businessName}. 

التعليمات:
- تحدث باللغة العربية دائماً
- كن مهذباً ومساعداً
- ركز على خدمة العملاء
- إذا لم تعرف شيئاً محدداً، انصح العميل بالتواصل مع المتجر

رسالة العميل: ${message}`
              }
            ],
            max_tokens: 800,
            temperature: 0.7,
            stream: false
          })
        })

        if (response.ok) {
          const data = await response.json()
          if (data.choices?.[0]?.message?.content) {
            aiResponse = data.choices[0].message.content.trim()
            
            // Clean up common prefixes
            aiResponse = aiResponse.replace(/^(مساعد|المساعد|أنا|مرحباً،?|أهلاً،?)\s*/i, '')
          }
        }
      }
    } catch (aiError) {
      console.log('AI error, using fallback:', aiError)
    }

    console.log('✅ Direct chat response ready')

    return NextResponse.json({ 
      response: aiResponse,
      merchant: merchant.businessName,
      status: 'success_without_db_save',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Direct chat error:', error)
    return NextResponse.json(
      { 
        response: 'عذراً، حدث خطأ في النظام. يرجى المحاولة مرة أخرى.',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 