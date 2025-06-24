import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ chatbotId: string }> }
) {
  try {
    const { chatbotId } = await params

    if (!chatbotId) {
      return NextResponse.json({ error: 'chatbotId is required' }, { status: 400 })
    }

    // Fetch merchant data using Supabase client
    const { data: merchant, error } = await supabaseAdmin
      .from('Merchant')
      .select(`
        id,
        businessName,
        welcomeMessage,
        primaryColor,
        logoUrl,
        email,
        phone
      `)
      .eq('chatbotId', chatbotId)
      .single()

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: 'Merchant not found' }, { status: 404 })
    }

    if (!merchant) {
      return NextResponse.json({ error: 'Merchant not found' }, { status: 404 })
    }

    // Return merchant data (excluding sensitive information)
    return NextResponse.json({
      id: merchant.id,
      businessName: merchant.businessName,
      welcomeMessage: merchant.welcomeMessage,
      primaryColor: merchant.primaryColor,
      logoUrl: merchant.logoUrl,
    })

  } catch (error) {
    console.error('Error fetching merchant:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 