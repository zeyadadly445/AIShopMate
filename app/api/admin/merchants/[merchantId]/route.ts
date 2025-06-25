import { NextRequest, NextResponse } from 'next/server'
import { SimpleAdminAuth } from '@/lib/admin-auth-simple'
import { supabaseAdmin } from '@/lib/supabase'

// GET - جلب تفاصيل تاجر واحد
export async function GET(
  request: NextRequest,
  { params }: { params: { merchantId: string } }
) {
  try {
    console.log(`👤 Admin Merchant API - GET merchant ${params.merchantId}`)
    
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

    // جلب بيانات التاجر مع جميع البيانات المرتبطة
    const { data: merchant, error } = await supabaseAdmin
      .from('Merchant')
      .select(`
        *,
        Subscription (*),
        Conversation (
          id,
          created_at,
          updated_at,
          Message (
            id,
            content,
            is_from_user,
            created_at
          )
        ),
        DataSource (
          id,
          source_type,
          name,
          file_path,
          file_size,
          chunk_count,
          processed_at,
          created_at
        )
      `)
      .eq('id', params.merchantId)
      .single()

    if (error || !merchant) {
      return NextResponse.json({ error: 'التاجر غير موجود' }, { status: 404 })
    }

    // حساب الإحصائيات التفصيلية
    const subscription = merchant.Subscription?.[0]
    const conversations = merchant.Conversation || []
    const dataSources = merchant.DataSource || []
    
    const totalMessages = conversations.reduce((sum, conv) => sum + (conv.Message?.length || 0), 0)
    const totalFileSize = dataSources.reduce((sum, ds) => sum + (ds.file_size || 0), 0)
    const totalChunks = dataSources.reduce((sum, ds) => sum + (ds.chunk_count || 0), 0)

    // حساب النشاط الأخير
    const allDates = [
      ...conversations.map(c => c.updated_at),
      ...dataSources.map(ds => ds.created_at)
    ].filter(Boolean).sort().reverse()

    const formattedMerchant = {
      id: merchant.id,
      email: merchant.email,
      businessName: merchant.business_name,
      phone: merchant.phone,
      chatbotId: merchant.chatbot_id,
      welcomeMessage: merchant.welcome_message,
      primaryColor: merchant.primary_color,
      isActive: merchant.is_active,
      createdAt: merchant.created_at,
      updatedAt: merchant.updated_at,
      subscription: subscription ? {
        id: subscription.id,
        plan: subscription.plan,
        status: subscription.status,
        messagesLimit: subscription.messages_limit,
        messagesUsed: subscription.messages_used,
        usagePercentage: Math.round((subscription.messages_used / subscription.messages_limit) * 100),
        startDate: subscription.start_date,
        endDate: subscription.end_date,
        createdAt: subscription.created_at,
        updatedAt: subscription.updated_at
      } : null,
      conversations: conversations.map(conv => ({
        id: conv.id,
        messageCount: conv.Message?.length || 0,
        lastMessage: conv.Message?.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())?.[0],
        createdAt: conv.created_at,
        updatedAt: conv.updated_at
      })),
      dataSources: dataSources.map(ds => ({
        id: ds.id,
        sourceType: ds.source_type,
        name: ds.name,
        filePath: ds.file_path,
        fileSize: ds.file_size,
        fileSizeMB: Math.round(ds.file_size / 1024 / 1024 * 100) / 100,
        chunkCount: ds.chunk_count,
        processedAt: ds.processed_at,
        createdAt: ds.created_at
      })),
      stats: {
        conversationCount: conversations.length,
        dataSourceCount: dataSources.length,
        totalMessages,
        totalFileSize,
        totalFileSizeMB: Math.round(totalFileSize / 1024 / 1024 * 100) / 100,
        totalChunks,
        lastActivity: allDates[0],
        joinedDaysAgo: Math.floor((Date.now() - new Date(merchant.created_at).getTime()) / (1000 * 60 * 60 * 24))
      }
    }

    return NextResponse.json({
      success: true,
      merchant: formattedMerchant
    })

  } catch (error) {
    console.error('❌ Get merchant error:', error)
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 })
  }
}

// PUT - تحديث بيانات التاجر
export async function PUT(
  request: NextRequest,
  { params }: { params: { merchantId: string } }
) {
  try {
    console.log(`👤 Admin Merchant API - UPDATE merchant ${params.merchantId}`)
    
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

    const updateData = await request.json()

    // إعداد البيانات للتحديث
    const merchantUpdate: any = {}
    if (updateData.email) merchantUpdate.email = updateData.email
    if (updateData.businessName) merchantUpdate.business_name = updateData.businessName
    if (updateData.phone !== undefined) merchantUpdate.phone = updateData.phone
    if (updateData.welcomeMessage) merchantUpdate.welcome_message = updateData.welcomeMessage
    if (updateData.primaryColor) merchantUpdate.primary_color = updateData.primaryColor
    if (updateData.isActive !== undefined) merchantUpdate.is_active = updateData.isActive

    // تحديث التاجر
    const { data: updatedMerchant, error: merchantError } = await supabaseAdmin
      .from('Merchant')
      .update(merchantUpdate)
      .eq('id', params.merchantId)
      .select()
      .single()

    if (merchantError) {
      console.error('❌ Error updating merchant:', merchantError)
      return NextResponse.json({ error: 'خطأ في تحديث التاجر' }, { status: 500 })
    }

    // تحديث الاشتراك إذا كان موجوداً
    if (updateData.subscription) {
      const subscriptionUpdate: any = {}
      if (updateData.subscription.plan) subscriptionUpdate.plan = updateData.subscription.plan
      if (updateData.subscription.status) subscriptionUpdate.status = updateData.subscription.status
      if (updateData.subscription.messagesLimit) subscriptionUpdate.messages_limit = updateData.subscription.messagesLimit
      if (updateData.subscription.messagesUsed !== undefined) subscriptionUpdate.messages_used = updateData.subscription.messagesUsed
      if (updateData.subscription.endDate) subscriptionUpdate.end_date = updateData.subscription.endDate

      await supabaseAdmin
        .from('Subscription')
        .update(subscriptionUpdate)
        .eq('merchant_id', params.merchantId)
    }

    console.log(`✅ Updated merchant: ${params.merchantId}`)

    return NextResponse.json({
      success: true,
      merchant: {
        id: updatedMerchant.id,
        email: updatedMerchant.email,
        businessName: updatedMerchant.business_name,
        isActive: updatedMerchant.is_active,
        updatedAt: updatedMerchant.updated_at
      }
    })

  } catch (error) {
    console.error('❌ Update merchant error:', error)
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 })
  }
}

// DELETE - حذف التاجر وجميع البيانات المرتبطة
export async function DELETE(
  request: NextRequest,
  { params }: { params: { merchantId: string } }
) {
  try {
    console.log(`👤 Admin Merchant API - DELETE merchant ${params.merchantId}`)
    
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

    // التحقق من وجود التاجر
    const { data: merchant } = await supabaseAdmin
      .from('Merchant')
      .select('id, email, business_name')
      .eq('id', params.merchantId)
      .single()

    if (!merchant) {
      return NextResponse.json({ error: 'التاجر غير موجود' }, { status: 404 })
    }

    // حذف جميع البيانات المرتبطة (Cascade deletion)
    // 1. حذف الرسائل أولاً
    await supabaseAdmin
      .from('Message')
      .delete()
      .in('conversation_id', 
        await supabaseAdmin
          .from('Conversation')
          .select('id')
          .eq('merchant_id', params.merchantId)
          .then(({ data }) => data?.map(c => c.id) || [])
      )

    // 2. حذف المحادثات
    await supabaseAdmin
      .from('Conversation')
      .delete()
      .eq('merchant_id', params.merchantId)

    // 3. حذف مصادر البيانات
    await supabaseAdmin
      .from('DataSource')
      .delete()
      .eq('merchant_id', params.merchantId)

    // 4. حذف الاشتراكات
    await supabaseAdmin
      .from('Subscription')
      .delete()
      .eq('merchant_id', params.merchantId)

    // 5. حذف التاجر
    const { error: deleteError } = await supabaseAdmin
      .from('Merchant')
      .delete()
      .eq('id', params.merchantId)

    if (deleteError) {
      console.error('❌ Error deleting merchant:', deleteError)
      return NextResponse.json({ error: 'خطأ في حذف التاجر' }, { status: 500 })
    }

    console.log(`🗑️ Deleted merchant: ${merchant.business_name} (${merchant.email})`)

    return NextResponse.json({
      success: true,
      message: 'تم حذف التاجر وجميع البيانات المرتبطة بنجاح'
    })

  } catch (error) {
    console.error('❌ Delete merchant error:', error)
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 })
  }
} 