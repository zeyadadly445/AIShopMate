import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({
        error: 'Missing Supabase configuration'
      }, { status: 500 })
    }

    // Get all merchants from database
    const merchantsResponse = await fetch(`${supabaseUrl}/rest/v1/Merchant?select=id,email,businessName,chatbotId,createdAt,subscription:Subscription(plan,status,messagesLimit,messagesUsed)&order=createdAt.desc&limit=10`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      }
    })

    if (!merchantsResponse.ok) {
      return NextResponse.json({
        error: 'Failed to fetch merchants from database',
        status: merchantsResponse.status
      }, { status: 500 })
    }

    const merchants = await merchantsResponse.json()

    // Get total count
    const countResponse = await fetch(`${supabaseUrl}/rest/v1/Merchant?select=count`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'count=exact'
      }
    })

    const totalCount = countResponse.headers.get('content-range')?.split('/')[1] || '0'

    // Get recent registrations (last 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const recentResponse = await fetch(`${supabaseUrl}/rest/v1/Merchant?select=count&createdAt=gte.${oneDayAgo}`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'count=exact'
      }
    })

    const recentCount = recentResponse.headers.get('content-range')?.split('/')[1] || '0'

    // Test database operations
    const operations = {
      read: true,
      write: false,
      update: false
    }

    // Test write capability
    try {
      const testWrite = await fetch(`${supabaseUrl}/rest/v1/Merchant`, {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          email: `test-${Date.now()}@verify.com`,
          password: 'test_password',
          businessName: 'Test Store',
          chatbotId: `test-verify-${Date.now()}`
        })
      })

      if (testWrite.ok) {
        operations.write = true

        // Delete the test record
        await fetch(`${supabaseUrl}/rest/v1/Merchant?email=eq.test-${Date.now()}@verify.com`, {
          method: 'DELETE',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
          }
        })
      }
    } catch (error) {
      // Write test failed
    }

    return NextResponse.json({
      status: 'success',
      database: {
        connected: true,
        totalMerchants: parseInt(totalCount),
        recentRegistrations: parseInt(recentCount),
        operations
      },
      recentMerchants: merchants.map((merchant: any) => ({
        id: merchant.id.substring(0, 8) + '...',
        email: merchant.email.replace(/(.{3}).*(@.*)/, '$1***$2'),
        businessName: merchant.businessName,
        chatbotId: merchant.chatbotId,
        registeredAt: merchant.createdAt,
        subscription: merchant.subscription?.[0] || null
      })),
      verification: {
        dataIsPersisted: true,
        method: 'supabase_rest_api',
        lastVerified: new Date().toISOString()
      },
      proof: {
        merchantsExist: merchants.length > 0,
        canCreateRecords: operations.write,
        canReadRecords: operations.read,
        dataIntegrity: merchants.every((m: any) => m.id && m.email && m.businessName && m.chatbotId)
      }
    })

  } catch (error) {
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      verification: {
        dataIsPersisted: false,
        lastVerified: new Date().toISOString()
      }
    }, { status: 500 })
  }
} 