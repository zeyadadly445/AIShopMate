import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Test Supabase REST API directly (bypasses database connection issues)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({
        error: 'Missing Supabase environment variables',
        missing: {
          url: !supabaseUrl,
          key: !supabaseKey
        }
      }, { status: 500 })
    }

    const tests = []

    // Test 1: Health check
    try {
      const healthResponse = await fetch(`${supabaseUrl}/rest/v1/`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        }
      })
      
      tests.push({
        name: 'supabase_health',
        status: healthResponse.ok ? 'success' : 'failed',
        statusCode: healthResponse.status,
        response: healthResponse.ok ? 'REST API accessible' : await healthResponse.text()
      })
    } catch (error) {
      tests.push({
        name: 'supabase_health',
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown'
      })
    }

    // Test 2: Try to query Merchant table via REST API
    try {
      const merchantResponse = await fetch(`${supabaseUrl}/rest/v1/Merchant?select=count`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'count=exact'
        }
      })
      
      if (merchantResponse.ok) {
        const result = await merchantResponse.text()
        tests.push({
          name: 'merchant_table_rest',
          status: 'success',
          result: 'Table accessible via REST API',
          count: merchantResponse.headers.get('content-range')
        })
      } else {
        const errorText = await merchantResponse.text()
        tests.push({
          name: 'merchant_table_rest',
          status: 'failed',
          statusCode: merchantResponse.status,
          error: errorText
        })
      }
    } catch (error) {
      tests.push({
        name: 'merchant_table_rest',
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown'
      })
    }

    // Test 3: Try to create a test record via REST API
    try {
      const testData = {
        email: `test-${Date.now()}@rest-api.com`,
        password: 'hashed_password',
        businessName: 'REST API Test',
        chatbotId: `rest-test-${Date.now()}`
      }

      const createResponse = await fetch(`${supabaseUrl}/rest/v1/Merchant`, {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify(testData)
      })

      if (createResponse.ok) {
        tests.push({
          name: 'create_via_rest',
          status: 'success',
          message: 'Can create records via REST API'
        })

        // Clean up - delete the test record
        try {
          await fetch(`${supabaseUrl}/rest/v1/Merchant?email=eq.${testData.email}`, {
            method: 'DELETE',
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`
            }
          })
        } catch (cleanupError) {
          // Ignore cleanup errors
        }
      } else {
        const errorText = await createResponse.text()
        tests.push({
          name: 'create_via_rest',
          status: 'failed',
          statusCode: createResponse.status,
          error: errorText
        })
      }
    } catch (error) {
      tests.push({
        name: 'create_via_rest',
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown'
      })
    }

    // Test 4: Database status via Supabase Management API
    try {
      const dbStatusResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/version`, {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        }
      })

      if (dbStatusResponse.ok) {
        const version = await dbStatusResponse.json()
        tests.push({
          name: 'database_version',
          status: 'success',
          version: version
        })
      } else {
        tests.push({
          name: 'database_version',
          status: 'failed',
          statusCode: dbStatusResponse.status
        })
      }
    } catch (error) {
      tests.push({
        name: 'database_version',
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown'
      })
    }

    const successfulTests = tests.filter(t => t.status === 'success').length
    const restApiWorking = tests.find(t => t.name === 'supabase_health')?.status === 'success'

    return NextResponse.json({
      status: successfulTests > 0 ? 'partial_success' : 'failed',
      summary: {
        total: tests.length,
        successful: successfulTests,
        restApiWorking,
        canCreateRecords: tests.find(t => t.name === 'create_via_rest')?.status === 'success'
      },
      tests,
      recommendations: {
        immediate: restApiWorking 
          ? 'REST API works - use REST API temporarily while fixing direct DB connection'
          : 'Complete Supabase outage - contact support',
        solutions: successfulTests > 0 ? [
          'Switch to Supabase REST API for user registration',
          'Use Supabase client instead of Prisma temporarily',
          'Check Supabase database settings for connection pooling',
          'Enable connection pooling in Supabase dashboard'
        ] : [
          'Check Supabase project billing status',
          'Verify project is not in pause mode',
          'Contact Supabase support',
          'Consider migrating to new project'
        ]
      }
    })

  } catch (error) {
    return NextResponse.json({
      error: 'Test failed completely',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 