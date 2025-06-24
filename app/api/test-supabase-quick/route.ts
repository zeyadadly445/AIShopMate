import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    // Test basic Supabase connection
    const { data: merchants, error: merchantError } = await supabaseAdmin
      .from('Merchant')
      .select('id, chatbotId, businessName')
      .limit(5)

    if (merchantError) {
      return NextResponse.json({
        status: 'error',
        error: 'Supabase query failed',
        details: merchantError.message,
        code: merchantError.code
      }, { status: 500 })
    }

    // Test specific merchant lookup
    const { data: testMerchant, error: testError } = await supabaseAdmin
      .from('Merchant')
      .select('id, chatbotId, businessName')
      .eq('chatbotId', 'shoes')
      .single()

    return NextResponse.json({
      status: 'success',
      supabaseConnection: 'working',
      merchantCount: merchants?.length || 0,
      merchants: merchants?.map(m => ({ id: m.id, chatbotId: m.chatbotId, businessName: m.businessName })),
      testMerchant: testError ? 
        { error: testError.message, code: testError.code } : 
        { found: !!testMerchant, chatbotId: testMerchant?.chatbotId },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    return NextResponse.json({
      status: 'error',
      error: 'Unexpected error',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
} 