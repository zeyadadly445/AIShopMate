import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  const debugInfo = {
    step: 'init',
    timestamp: new Date().toISOString(),
    errors: [] as string[],
    success: [] as string[]
  }

  try {
    // Step 1: Parse request body
    debugInfo.step = 'parsing_request'
    let requestBody
    try {
      requestBody = await request.json()
      debugInfo.success.push('✅ Request body parsed successfully')
    } catch (error) {
      debugInfo.errors.push(`❌ Request parsing failed: ${error}`)
      return NextResponse.json({ debug: debugInfo }, { status: 400 })
    }

    const { chatbotId = 'shoes', message = 'test', sessionId = 'debug-session' } = requestBody

    // Step 2: Test Supabase connection
    debugInfo.step = 'testing_supabase'
    try {
      const { data: testData, error: testError } = await supabaseAdmin
        .from('Merchant')
        .select('id')
        .limit(1)

      if (testError) {
        debugInfo.errors.push(`❌ Supabase test failed: ${testError.message}`)
      } else {
        debugInfo.success.push('✅ Supabase connection working')
      }
    } catch (error) {
      debugInfo.errors.push(`❌ Supabase connection error: ${error}`)
    }

    // Step 3: Test merchant lookup
    debugInfo.step = 'merchant_lookup'
    let merchant = null
    try {
      const { data: merchantData, error: merchantError } = await supabaseAdmin
        .from('Merchant')
        .select('id, businessName, welcomeMessage, primaryColor')
        .eq('chatbotId', chatbotId)
        .single()

      if (merchantError) {
        debugInfo.errors.push(`❌ Merchant lookup failed: ${merchantError.message}`)
      } else if (merchantData) {
        merchant = merchantData
        debugInfo.success.push(`✅ Merchant found: ${merchantData.businessName}`)
      } else {
        debugInfo.errors.push(`❌ No merchant found with chatbotId: ${chatbotId}`)
      }
    } catch (error) {
      debugInfo.errors.push(`❌ Merchant lookup error: ${error}`)
    }

    // Step 4: Test AI API
    debugInfo.step = 'testing_ai_api'
    try {
      const chuteAIApiKey = process.env.CHUTES_AI_API_KEY
      const chuteAIUrl = process.env.CHUTES_AI_API_URL || 'https://llm.chutes.ai/v1/chat/completions'

      if (!chuteAIApiKey) {
        debugInfo.errors.push('❌ CHUTES_AI_API_KEY not found')
      } else {
        debugInfo.success.push('✅ AI API key exists')

        // Test AI API call
        const response = await fetch(chuteAIUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${chuteAIApiKey}`
          },
          body: JSON.stringify({
            model: process.env.CHUTES_AI_MODEL || 'deepseek-ai/DeepSeek-V3-0324',
            messages: [{ role: 'user', content: 'مرحبا' }],
            max_tokens: 100,
            temperature: 0.7,
            stream: false
          })
        })

        if (response.ok) {
          const data = await response.json()
          debugInfo.success.push('✅ AI API call successful')
        } else {
          debugInfo.errors.push(`❌ AI API call failed: ${response.status} ${response.statusText}`)
        }
      }
    } catch (error) {
      debugInfo.errors.push(`❌ AI API test error: ${error}`)
    }

    // Step 5: Test conversation creation
    debugInfo.step = 'testing_conversation'
    if (merchant) {
      try {
        // Try to create a test conversation
        const { data: conversation, error: convError } = await supabaseAdmin
          .from('Conversation')
          .insert({
            merchantId: merchant.id,
            sessionId: `debug-${Date.now()}`
          })
          .select('id')
          .single()

        if (convError) {
          debugInfo.errors.push(`❌ Conversation creation failed: ${convError.message}`)
        } else {
          debugInfo.success.push('✅ Conversation creation works')
          
          // Clean up - delete the test conversation
          await supabaseAdmin
            .from('Conversation')
            .delete()
            .eq('id', conversation.id)
        }
      } catch (error) {
        debugInfo.errors.push(`❌ Conversation test error: ${error}`)
      }
    }

    debugInfo.step = 'complete'

    return NextResponse.json({
      status: debugInfo.errors.length === 0 ? 'success' : 'partial_success',
      debug: debugInfo,
      summary: {
        totalChecks: debugInfo.success.length + debugInfo.errors.length,
        successCount: debugInfo.success.length,
        errorCount: debugInfo.errors.length,
        merchantFound: !!merchant,
        chatbotId,
        message,
        sessionId
      }
    })

  } catch (error) {
    debugInfo.errors.push(`❌ Unexpected error in ${debugInfo.step}: ${error}`)
    return NextResponse.json({ 
      status: 'error',
      debug: debugInfo 
    }, { status: 500 })
  }
} 