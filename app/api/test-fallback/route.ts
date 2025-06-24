import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/database-fallback'

export async function GET(request: NextRequest) {
  try {
    console.log('🔄 Testing smart fallback system...')
    
    // Test the smart fallback system
    const db = await getDatabase()
    
    // Test 1: Basic connection
    await db.$queryRaw`SELECT 1 as test`
    
    // Test 2: Check if tables exist
    const tables = await db.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `
    
    // Test 3: Try to query Merchant table
    let merchantTest = null
    try {
      const merchantCount = await db.merchant.count()
      merchantTest = { status: 'success', count: merchantCount }
    } catch (error) {
      merchantTest = { 
        status: 'failed', 
        error: error instanceof Error ? error.message : 'Unknown'
      }
    }
    
    // Test 4: Try inserting a test record (will rollback)
    let insertTest = null
    try {
      await db.$transaction(async (tx) => {
        const testMerchant = await tx.merchant.create({
          data: {
            email: 'test@fallback.com',
            password: 'hashed_password',
            businessName: 'Test Business',
            chatbotId: 'test-fallback-' + Date.now(),
            welcomeMessage: 'Test message',
            primaryColor: '#000000'
          }
        })
        
        insertTest = { status: 'success', id: testMerchant.id }
        
        // Rollback the transaction
        throw new Error('Rollback test transaction')
      })
    } catch (error) {
      if (error instanceof Error && error.message === 'Rollback test transaction') {
        insertTest = { ...insertTest, rollback: 'success' }
      } else {
        insertTest = { 
          status: 'failed', 
          error: error instanceof Error ? error.message : 'Unknown'
        }
      }
    }

    return NextResponse.json({
      status: 'success',
      message: 'Smart fallback system working!',
      tests: {
        connection: 'success',
        tables: Array.isArray(tables) ? tables.length : 0,
        merchant: merchantTest,
        insert: insertTest
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Fallback system failed:', error)
    
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
} 