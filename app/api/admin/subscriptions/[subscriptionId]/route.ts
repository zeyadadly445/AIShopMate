import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdminAuth } from '@/lib/admin-auth'

// تحديث الاشتراك
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ subscriptionId: string }> }
) {
  try {
    const adminSession = requireAdminAuth(request)
    if (!adminSession) {
      return NextResponse.json({
        error: 'غير مصرح - صلاحيات مدير مطلوبة'
      }, { status: 403 })
    }

    const { subscriptionId } = await params
    const updateData = await request.json()

    // التحقق من صحة البيانات
    const allowedFields = ['plan', 'status', 'messagesLimit', 'messagesUsed', 'endDate']
    const filteredData: any = {}
    
    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        filteredData[field] = updateData[field]
      }
    })

    // التحقق من صحة قيم الخطة والحالة
    const validPlans = ['BASIC', 'STANDARD', 'PREMIUM', 'ENTERPRISE']
    const validStatuses = ['TRIAL', 'ACTIVE', 'CANCELLED', 'EXPIRED']

    if (filteredData.plan && !validPlans.includes(filteredData.plan)) {
      return NextResponse.json({
        error: 'خطة غير صالحة'
      }, { status: 400 })
    }

    if (filteredData.status && !validStatuses.includes(filteredData.status)) {
      return NextResponse.json({
        error: 'حالة غير صالحة'
      }, { status: 400 })
    }

    if (Object.keys(filteredData).length === 0) {
      return NextResponse.json({
        error: 'لا توجد بيانات صالحة للتحديث'
      }, { status: 400 })
    }

    // جلب بيانات الاشتراك الحالي
    const { data: currentSubscription, error: fetchError } = await supabaseAdmin
      .from('Subscription')
      .select(`
        id,
        merchantId,
        plan,
        status,
        messagesLimit,
        messagesUsed,
        merchant:Merchant(businessName, email)
      `)
      .eq('id', subscriptionId)
      .single()

    if (fetchError || !currentSubscription) {
      return NextResponse.json({
        error: 'الاشتراك غير موجود'
      }, { status: 404 })
    }

    // تحديث الاشتراك
    const { data: updatedSubscription, error: updateError } = await supabaseAdmin
      .from('Subscription')
      .update(filteredData)
      .eq('id', subscriptionId)
      .select(`
        id,
        merchantId,
        plan,
        status,
        messagesLimit,
        messagesUsed,
        startDate,
        endDate,
        createdAt,
        updatedAt,
        merchant:Merchant(businessName, email)
      `)
      .single()

    if (updateError) {
      throw updateError
    }

    const merchant = Array.isArray(currentSubscription.merchant) 
      ? currentSubscription.merchant[0] 
      : currentSubscription.merchant

    console.log(`💳 تم تحديث اشتراك ${merchant?.businessName} (${merchant?.email}) بواسطة المدير: ${adminSession.username}`)
    console.log(`📝 التغييرات:`, filteredData)

    return NextResponse.json({
      success: true,
      message: 'تم تحديث الاشتراك بنجاح',
      subscription: updatedSubscription
    })

  } catch (error) {
    console.error('خطأ في تحديث الاشتراك:', error)
    return NextResponse.json({
      error: 'خطأ في تحديث الاشتراك'
    }, { status: 500 })
  }
}

// إعادة تعيين استخدام الرسائل
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ subscriptionId: string }> }
) {
  try {
    const adminSession = requireAdminAuth(request)
    if (!adminSession) {
      return NextResponse.json({
        error: 'غير مصرح - صلاحيات مدير مطلوبة'
      }, { status: 403 })
    }

    const { subscriptionId } = await params
    const { action } = await request.json()

    if (action !== 'reset_messages') {
      return NextResponse.json({
        error: 'إجراء غير صالح'
      }, { status: 400 })
    }

    // جلب بيانات الاشتراك الحالي
    const { data: currentSubscription, error: fetchError } = await supabaseAdmin
      .from('Subscription')
      .select(`
        id,
        merchantId,
        messagesUsed,
        merchant:Merchant(businessName, email)
      `)
      .eq('id', subscriptionId)
      .single()

    if (fetchError || !currentSubscription) {
      return NextResponse.json({
        error: 'الاشتراك غير موجود'
      }, { status: 404 })
    }

    // إعادة تعيين عداد الرسائل إلى صفر
    const { data: updatedSubscription, error: resetError } = await supabaseAdmin
      .from('Subscription')
      .update({ messagesUsed: 0 })
      .eq('id', subscriptionId)
      .select()
      .single()

    if (resetError) {
      throw resetError
    }

    const merchant = Array.isArray(currentSubscription.merchant) 
      ? currentSubscription.merchant[0] 
      : currentSubscription.merchant

    console.log(`🔄 تم إعادة تعيين عداد الرسائل للمستخدم ${merchant?.businessName} (${merchant?.email}) من ${currentSubscription.messagesUsed} إلى 0 بواسطة المدير: ${adminSession.username}`)

    return NextResponse.json({
      success: true,
      message: 'تم إعادة تعيين عداد الرسائل بنجاح',
      previousCount: currentSubscription.messagesUsed,
      subscription: updatedSubscription
    })

  } catch (error) {
    console.error('خطأ في إعادة تعيين عداد الرسائل:', error)
    return NextResponse.json({
      error: 'خطأ في إعادة تعيين عداد الرسائل'
    }, { status: 500 })
  }
} 