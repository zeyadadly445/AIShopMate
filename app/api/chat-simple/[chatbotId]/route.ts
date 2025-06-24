import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ chatbotId: string }> }
) {
  try {
    const { chatbotId } = await params
    const { message, sessionId } = await request.json()

    console.log('🔍 Chat request:', { chatbotId, message: message?.substring(0, 50), sessionId })

    // 1. Fetch merchant
    const { data: merchant, error: merchantError } = await supabaseAdmin
      .from('Merchant')
      .select('id, businessName, welcomeMessage')
      .eq('chatbotId', chatbotId)
      .single()

    if (merchantError || !merchant) {
      console.log('❌ Merchant not found:', merchantError?.message)
      return NextResponse.json({ 
        error: 'Merchant not found',
        details: merchantError?.message 
      }, { status: 404 })
    }

    console.log('✅ Merchant found:', merchant.businessName)

    // 2. Simple AI response (without streaming)
    let aiResponse = `مرحباً! أنا مساعد ${merchant.businessName}. شكراً لرسالتك: "${message}". كيف يمكنني مساعدتك اليوم؟`

    // 3. Try AI API if available
    try {
      const chuteAIApiKey = process.env.CHUTES_AI_API_KEY
      const chuteAIUrl = process.env.CHUTES_AI_API_URL

      if (chuteAIApiKey && chuteAIUrl) {
        console.log('🤖 Calling AI API...')
        
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
                content: `أنت مساعد ذكي لمتجر ${merchant.businessName}. رد على هذه الرسالة بالعربية: ${message}`
              }
            ],
            max_tokens: 500,
            temperature: 0.7,
            stream: false
          })
        })

        if (response.ok) {
          const data = await response.json()
          if (data.choices?.[0]?.message?.content) {
            aiResponse = data.choices[0].message.content.trim()
            console.log('✅ AI response generated')
          }
        } else {
          console.log('⚠️ AI API failed, using fallback')
        }
      }
    } catch (aiError) {
      console.log('⚠️ AI error, using fallback:', aiError)
    }

    console.log('📤 Sending response')

    return NextResponse.json({ 
      response: aiResponse,
      debug: {
        merchantId: merchant.id,
        businessName: merchant.businessName,
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('💥 Chat error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
} 