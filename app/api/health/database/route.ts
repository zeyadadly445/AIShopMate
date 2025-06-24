import { NextRequest, NextResponse } from 'next/server'
import { getDatabaseHealth } from '@/lib/database-optimized'
import { withDatabase } from '@/lib/prisma-optimized'

export async function GET(request: NextRequest) {
  try {
    // Get connection health
    const health = await getDatabaseHealth()
    
    // Test actual database operations
    const operationsTest = await withDatabase(async (db) => {
      const startTime = Date.now()
      
      // Test basic query
      await db.$queryRaw`SELECT 1 as test`
      
      // Test table access
      const merchantCount = await db.merchant.count()
      
      const endTime = Date.now()
      
      return {
        queryTime: `${endTime - startTime}ms`,
        merchantCount,
        status: 'healthy'
      }
    })

    return NextResponse.json({
      status: 'healthy',
      database: {
        ...health,
        operations: operationsTest
      },
      supabaseLimits: {
        directConnection: 'unlimited',
        transactionPooler: '15 concurrent',
        sessionPooler: '5 concurrent',
        currentlyUsing: health.preferredConnection
      },
      recommendations: {
        scaling: health.preferredConnection === 'direct' 
          ? 'Perfect! Using unlimited direct connection'
          : 'Consider checking Supabase project status',
        performance: operationsTest.queryTime.includes('ms') && 
                    parseInt(operationsTest.queryTime) < 1000
          ? 'Excellent response time'
          : 'Consider optimization'
      }
    })

  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      troubleshooting: {
        steps: [
          'Check Supabase project status',
          'Verify environment variables',
          'Check network connectivity',
          'Consider using pooled connection'
        ]
      }
    }, { status: 500 })
  }
} 