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

    // Fetch merchant data using Supabase client (logoUrl removed as it's now in ChatCustomization)
    const { data: merchant, error } = await supabaseAdmin
      .from('Merchant')
      .select(`
        id,
        businessName,
        welcomeMessage,
        primaryColor,
        email,
        phone,
        subscription:Subscription(
          id,
          plan,
          status,
          messagesLimit,
          messagesUsed,
          lastReset
        )
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

    // Process subscription data (handle array format from Supabase)
    let subscription = null
    if (merchant.subscription) {
      subscription = Array.isArray(merchant.subscription) 
        ? merchant.subscription[0] 
        : merchant.subscription
    }

    // Return merchant data (excluding sensitive information and logoUrl which is now in ChatCustomization)
    return NextResponse.json({
      id: merchant.id,
      businessName: merchant.businessName,
      welcomeMessage: merchant.welcomeMessage,
      primaryColor: merchant.primaryColor,
      // logoUrl removed - now handled by ChatCustomization
      subscription: subscription ? {
        plan: subscription.plan,
        status: subscription.status,
        messagesLimit: subscription.messagesLimit,
        messagesUsed: subscription.messagesUsed,
        lastReset: subscription.lastReset
      } : null
    })

  } catch (error) {
    console.error('Error fetching merchant:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 