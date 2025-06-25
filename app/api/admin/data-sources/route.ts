import { NextRequest, NextResponse } from 'next/server'
import { SimpleAdminAuth } from '@/lib/admin-auth-simple'
import { supabaseAdmin } from '@/lib/supabase'

// GET - جلب جميع مصادر البيانات
export async function GET(request: NextRequest) {
  try {
    console.log('📁 Admin Data Sources API - GET all data sources')
    
    // التحقق من الصلاحيات
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    }

    const sessionData = authHeader.substring(7)
    let session
    try {
      session = JSON.parse(sessionData)
    } catch (e) {
      return NextResponse.json({ error: 'جلسة غير صالحة' }, { status: 401 })
    }

    if (!SimpleAdminAuth.validateSession(session)) {
      return NextResponse.json({ error: 'جلسة منتهية' }, { status: 401 })
    }

    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '20')
    const merchantId = url.searchParams.get('merchantId') || ''
    const sourceType = url.searchParams.get('sourceType') || ''

    const offset = (page - 1) * limit

    // إعداد الفلتر
    let query = supabaseAdmin
      .from('DataSource')
      .select(`
        *,
        Merchant (
          id,
          email,
          business_name,
          chatbot_id
        )
      `)

    if (merchantId) {
      query = query.eq('merchant_id', merchantId)
    }

    if (sourceType) {
      query = query.eq('source_type', sourceType)
    }

    const { data: dataSources, error } = await query
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('❌ Error fetching data sources:', error)
      return NextResponse.json({ error: 'خطأ في جلب البيانات' }, { status: 500 })
    }

    // إحصائيات إجمالية
    const { count: totalCount } = await supabaseAdmin
      .from('DataSource')
      .select('id', { count: 'exact', head: true })

    // إحصائيات حسب النوع
    const { data: typeStats } = await supabaseAdmin
      .from('DataSource')
      .select('source_type')

    const typeDistribution = typeStats?.reduce((acc, ds) => {
      acc[ds.source_type] = (acc[ds.source_type] || 0) + 1
      return acc
    }, {} as Record<string, number>) || {}

    // تنسيق البيانات
    const formattedDataSources = dataSources?.map(ds => {
      const fileSizeMB = Math.round((ds.file_size || 0) / 1024 / 1024 * 100) / 100
      const processingStatus = ds.processed_at ? 'معالج' : 'في الانتظار'
      const daysOld = Math.floor((Date.now() - new Date(ds.created_at).getTime()) / (1000 * 60 * 60 * 24))

      return {
        id: ds.id,
        merchantId: ds.merchant_id,
        sourceType: ds.source_type,
        name: ds.name,
        description: ds.description,
        filePath: ds.file_path,
        fileSize: ds.file_size,
        fileSizeMB,
        chunkCount: ds.chunk_count,
        vectorCount: ds.vector_count,
        processedAt: ds.processed_at,
        processingStatus,
        createdAt: ds.created_at,
        updatedAt: ds.updated_at,
        merchant: ds.Merchant ? {
          id: ds.Merchant.id,
          email: ds.Merchant.email,
          businessName: ds.Merchant.business_name,
          chatbotId: ds.Merchant.chatbot_id
        } : null,
        stats: {
          daysOld,
          isProcessed: !!ds.processed_at,
          efficiency: ds.chunk_count && ds.file_size ? 
            Math.round((ds.chunk_count / (ds.file_size / 1024)) * 100) / 100 : 0 // chunks per KB
        }
      }
    }) || []

    return NextResponse.json({
      success: true,
      dataSources: formattedDataSources,
      pagination: {
        page,
        limit,
        total: totalCount || 0,
        totalPages: Math.ceil((totalCount || 0) / limit)
      },
      stats: {
        totalSources: totalCount || 0,
        typeDistribution,
        totalSize: dataSources?.reduce((sum, ds) => sum + (ds.file_size || 0), 0) || 0,
        processedCount: dataSources?.filter(ds => ds.processed_at).length || 0
      }
    })

  } catch (error) {
    console.error('❌ Data Sources API error:', error)
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 })
  }
}

// DELETE - حذف مصدر بيانات
export async function DELETE(request: NextRequest) {
  try {
    console.log('📁 Admin Data Sources API - DELETE data source')
    
    // التحقق من الصلاحيات
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    }

    const sessionData = authHeader.substring(7)
    let session
    try {
      session = JSON.parse(sessionData)
    } catch (e) {
      return NextResponse.json({ error: 'جلسة غير صالحة' }, { status: 401 })
    }

    if (!SimpleAdminAuth.validateSession(session)) {
      return NextResponse.json({ error: 'جلسة منتهية' }, { status: 401 })
    }

    const { dataSourceId } = await request.json()

    if (!dataSourceId) {
      return NextResponse.json({ error: 'معرف مصدر البيانات مطلوب' }, { status: 400 })
    }

    // جلب تفاصيل مصدر البيانات قبل الحذف
    const { data: dataSource } = await supabaseAdmin
      .from('DataSource')
      .select('id, name, source_type, merchant_id')
      .eq('id', dataSourceId)
      .single()

    if (!dataSource) {
      return NextResponse.json({ error: 'مصدر البيانات غير موجود' }, { status: 404 })
    }

    // حذف مصدر البيانات
    const { error: deleteError } = await supabaseAdmin
      .from('DataSource')
      .delete()
      .eq('id', dataSourceId)

    if (deleteError) {
      console.error('❌ Error deleting data source:', deleteError)
      return NextResponse.json({ error: 'خطأ في حذف مصدر البيانات' }, { status: 500 })
    }

    console.log(`🗑️ Deleted data source: ${dataSource.name} (${dataSource.source_type})`)

    return NextResponse.json({
      success: true,
      message: 'تم حذف مصدر البيانات بنجاح'
    })

  } catch (error) {
    console.error('❌ Delete data source error:', error)
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 })
  }
}

// POST - إعادة معالجة مصدر البيانات
export async function POST(request: NextRequest) {
  try {
    console.log('📁 Admin Data Sources API - Reprocess data source')
    
    // التحقق من الصلاحيات
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    }

    const sessionData = authHeader.substring(7)
    let session
    try {
      session = JSON.parse(sessionData)
    } catch (e) {
      return NextResponse.json({ error: 'جلسة غير صالحة' }, { status: 401 })
    }

    if (!SimpleAdminAuth.validateSession(session)) {
      return NextResponse.json({ error: 'جلسة منتهية' }, { status: 401 })
    }

    const { dataSourceId, action } = await request.json()

    if (!dataSourceId) {
      return NextResponse.json({ error: 'معرف مصدر البيانات مطلوب' }, { status: 400 })
    }

    if (action === 'reprocess') {
      // إعادة تعيين حالة المعالجة
      const { data: updatedSource, error: updateError } = await supabaseAdmin
        .from('DataSource')
        .update({
          processed_at: null,
          chunk_count: 0,
          vector_count: 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', dataSourceId)
        .select()
        .single()

      if (updateError) {
        console.error('❌ Error updating data source:', updateError)
        return NextResponse.json({ error: 'خطأ في تحديث مصدر البيانات' }, { status: 500 })
      }

      console.log(`🔄 Reset data source for reprocessing: ${dataSourceId}`)

      return NextResponse.json({
        success: true,
        message: 'تم إعداد مصدر البيانات لإعادة المعالجة',
        dataSource: updatedSource
      })
    }

    return NextResponse.json({ error: 'إجراء غير صالح' }, { status: 400 })

  } catch (error) {
    console.error('❌ Data source action error:', error)
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 })
  }
} 