import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdminAuth } from '@/lib/admin-auth'

// جلب تفاصيل مستخدم واحد
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const adminSession = requireAdminAuth(request)
    if (!adminSession) {
      return NextResponse.json({
        error: 'غير مصرح - صلاحيات مدير مطلوبة'
      }, { status: 403 })
    }

    const { userId } = await params

    // جلب بيانات المستخدم مع الاشتراك والمحادثات
    const { data: merchant, error: merchantError } = await supabaseAdmin
      .from('Merchant')
      .select(`
        id,
        email,
        businessName,
        phone,
        chatbotId,
        welcomeMessage,
        primaryColor,
        createdAt,
        updatedAt,
        subscription:Subscription(
          id,
          plan,
          status,
          messagesLimit,
          messagesUsed,
          startDate,
          endDate,
          createdAt,
          updatedAt
        )
      `)
      .eq('id', userId)
      .single()

    if (merchantError || !merchant) {
      return NextResponse.json({
        error: 'المستخدم غير موجود'
      }, { status: 404 })
    }

    // جلب إحصائيات المحادثات
    const { data: conversations, error: conversationsError } = await supabaseAdmin
      .from('Conversation')
      .select(`
        id,
        sessionId,
        createdAt,
        messages:Message(count)
      `)
      .eq('merchantId', userId)

    // جلب مصادر البيانات
    const { data: dataSources, error: dataSourcesError } = await supabaseAdmin
      .from('MerchantDataSource')
      .select('*')
      .eq('merchantId', userId)

    console.log(`📋 عرض تفاصيل المستخدم ${userId} بواسطة المدير: ${adminSession.username}`)

    return NextResponse.json({
      merchant,
      conversations: conversations || [],
      dataSources: dataSources || [],
      stats: {
        totalConversations: conversations?.length || 0,
        totalMessages: conversations?.reduce((sum, conv) => {
          const messageCount = Array.isArray(conv.messages) 
            ? conv.messages.length 
            : (conv.messages as any)?.count || 0
          return sum + messageCount
        }, 0) || 0,
        totalDataSources: dataSources?.length || 0,
        activeDataSources: dataSources?.filter(ds => ds.isActive).length || 0
      }
    })

  } catch (error) {
    console.error('خطأ في جلب تفاصيل المستخدم:', error)
    return NextResponse.json({
      error: 'خطأ في الخادم'
    }, { status: 500 })
  }
}

// تحديث بيانات المستخدم
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const adminSession = requireAdminAuth(request)
    if (!adminSession) {
      return NextResponse.json({
        error: 'غير مصرح - صلاحيات مدير مطلوبة'
      }, { status: 403 })
    }

    const { userId } = await params
    const updateData = await request.json()

    // التحقق من صحة البيانات
    const allowedFields = ['businessName', 'phone', 'welcomeMessage', 'primaryColor']
    const filteredData: any = {}
    
    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        filteredData[field] = updateData[field]
      }
    })

    if (Object.keys(filteredData).length === 0) {
      return NextResponse.json({
        error: 'لا توجد بيانات صالحة للتحديث'
      }, { status: 400 })
    }

    // تحديث بيانات التاجر
    const { data: updatedMerchant, error: updateError } = await supabaseAdmin
      .from('Merchant')
      .update(filteredData)
      .eq('id', userId)
      .select()
      .single()

    if (updateError) {
      throw updateError
    }

    console.log(`✏️ تم تحديث بيانات المستخدم ${userId} بواسطة المدير: ${adminSession.username}`)

    return NextResponse.json({
      success: true,
      message: 'تم تحديث البيانات بنجاح',
      merchant: updatedMerchant
    })

  } catch (error) {
    console.error('خطأ في تحديث المستخدم:', error)
    return NextResponse.json({
      error: 'خطأ في تحديث البيانات'
    }, { status: 500 })
  }
}

// حذف المستخدم
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const adminSession = requireAdminAuth(request)
    if (!adminSession) {
      return NextResponse.json({
        error: 'غير مصرح - صلاحيات مدير مطلوبة'
      }, { status: 403 })
    }

    const { userId } = await params

    // التحقق من وجود المستخدم أولاً
    const { data: existingMerchant, error: checkError } = await supabaseAdmin
      .from('Merchant')
      .select('id, businessName, email')
      .eq('id', userId)
      .single()

    if (checkError || !existingMerchant) {
      return NextResponse.json({
        error: 'المستخدم غير موجود'
      }, { status: 404 })
    }

    // حذف المستخدم (سيحذف تلقائياً جميع البيانات المرتبطة بسبب CASCADE)
    const { error: deleteError } = await supabaseAdmin
      .from('Merchant')
      .delete()
      .eq('id', userId)

    if (deleteError) {
      throw deleteError
    }

    console.log(`🗑️ تم حذف المستخدم ${existingMerchant.businessName} (${existingMerchant.email}) بواسطة المدير: ${adminSession.username}`)

    return NextResponse.json({
      success: true,
      message: 'تم حذف المستخدم بنجاح'
    })

  } catch (error) {
    console.error('خطأ في حذف المستخدم:', error)
    return NextResponse.json({
      error: 'خطأ في حذف المستخدم'
    }, { status: 500 })
  }
} 