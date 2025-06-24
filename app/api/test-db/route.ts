import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    // Test database connection
    const merchantCount = await prisma.merchant.count()
    
    return NextResponse.json({
      success: true,
      message: 'Database connection successful',
      merchantCount,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Database test error:', error)
    return NextResponse.json({
      success: false,
      error: 'Database connection failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 