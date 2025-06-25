import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { SimpleAdminAuth } from '@/lib/admin-auth-simple'
import { needsMonthlyReset, isEligibleForReset, performMonthlyReset, type SubscriptionData } from '@/lib/monthly-reset'

// GET - الحصول على قائمة الحسابات التي تحتاج تجديد شهري
export async function GET(request: NextRequest) {
  try {
    console.log('📊 Monthly Reset API - Check eligible subscriptions')
    
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

    // جلب جميع الاشتراكات
    const { data: subscriptions, error } = await supabaseAdmin
      .from('Subscription')
      .select(`
        id,
        plan,
        status,
        messagesLimit,
        messagesUsed,
        lastReset,
        merchantId,
        Merchant(businessName, email)
      `)
      .order('lastReset', { ascending: true })

    if (error) {
      console.error('❌ Error fetching subscriptions:', error)
      return NextResponse.json({ error: 'خطأ في قاعدة البيانات' }, { status: 500 })
    }

    // تحليل الاشتراكات
    const eligibleForReset: any[] = []
    const needsResetButIneligible: any[] = []
    const upToDate: any[] = []

    subscriptions?.forEach((sub: any) => {
      const subscriptionData: SubscriptionData = {
        id: sub.id,
        plan: sub.plan,
        status: sub.status,
        messagesLimit: sub.messagesLimit,
        messagesUsed: sub.messagesUsed,
        lastReset: sub.lastReset,
        merchantId: sub.merchantId
      }

      const needsReset = needsMonthlyReset(subscriptionData)
      const eligible = isEligibleForReset(subscriptionData)
      
      const merchant = Array.isArray(sub.Merchant) ? sub.Merchant[0] : sub.Merchant
      const merchantInfo = {
        ...subscriptionData,
        businessName: merchant?.businessName,
        email: merchant?.email,
        daysSinceReset: Math.floor((Date.now() - new Date(sub.lastReset).getTime()) / (1000 * 60 * 60 * 24))
      }

      if (needsReset && eligible) {
        eligibleForReset.push(merchantInfo)
      } else if (needsReset && !eligible) {
        needsResetButIneligible.push(merchantInfo)
      } else {
        upToDate.push(merchantInfo)
      }
    })

    return NextResponse.json({
      success: true,
      summary: {
        total: subscriptions?.length || 0,
        eligibleForReset: eligibleForReset.length,
        needsResetButIneligible: needsResetButIneligible.length,
        upToDate: upToDate.length
      },
      details: {
        eligibleForReset,
        needsResetButIneligible,
        upToDate
      }
    })

  } catch (error) {
    console.error('❌ Monthly Reset Check error:', error)
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 })
  }
}

// POST - تنفيذ التجديد الشهري للحسابات المؤهلة
export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Monthly Reset API - Execute monthly reset')
    
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

    const { subscriptionIds } = await request.json()

    // إذا لم تحدد IDs محددة، اجلب جميع المؤهلين للتجديد
    let targetSubscriptions = []
    
    if (subscriptionIds && Array.isArray(subscriptionIds)) {
             // تجديد اشتراكات محددة
       const { data, error } = await supabaseAdmin
         .from('Subscription')
         .select(`
           id,
           plan,
           status,
           messagesLimit,
           messagesUsed,
           lastReset,
           merchantId,
           Merchant(businessName, email)
         `)
         .in('id', subscriptionIds)
      
      if (error) {
        return NextResponse.json({ error: 'خطأ في جلب الاشتراكات' }, { status: 500 })
      }
      
      targetSubscriptions = data || []
    } else {
             // تجديد جميع المؤهلين تلقائياً
       const { data, error } = await supabaseAdmin
         .from('Subscription')
         .select(`
           id,
           plan,
           status,
           messagesLimit,
           messagesUsed,
           lastReset,
           merchantId,
           Merchant(businessName, email)
         `)
         .eq('status', 'ACTIVE') // فقط الحسابات المفعلة
      
      if (error) {
        return NextResponse.json({ error: 'خطأ في جلب الاشتراكات' }, { status: 500 })
      }
      
             // فلترة المؤهلين للتجديد فقط
       targetSubscriptions = (data || []).filter((sub: any) => {
         const subscriptionData: SubscriptionData = {
           id: sub.id,
           plan: sub.plan,
           status: sub.status,
           messagesLimit: sub.messagesLimit,
           messagesUsed: sub.messagesUsed,
           lastReset: sub.lastReset,
           merchantId: sub.merchantId
         }
         return needsMonthlyReset(subscriptionData)
       })
    }

    // تنفيذ التجديد لكل اشتراك مؤهل
    const resetResults = []
    
         for (const sub of targetSubscriptions) {
       const subscriptionData: SubscriptionData = {
         id: sub.id,
         plan: sub.plan,
         status: sub.status,
         messagesLimit: sub.messagesLimit,
         messagesUsed: sub.messagesUsed,
         lastReset: sub.lastReset,
         merchantId: sub.merchantId
       }

       // التحقق من الأهلية مرة أخرى
       const merchant = Array.isArray(sub.Merchant) ? sub.Merchant[0] : sub.Merchant
       if (isEligibleForReset(subscriptionData)) {
         const resetResult = await performMonthlyReset(supabaseAdmin, sub.id)
         resetResults.push({
           subscriptionId: sub.id,
           businessName: merchant?.businessName,
           email: merchant?.email,
           ...resetResult
         })
       } else {
         resetResults.push({
           subscriptionId: sub.id,
           businessName: merchant?.businessName,
           email: merchant?.email,
           success: false,
           message: 'غير مؤهل للتجديد'
         })
       }
     }

    const successCount = resetResults.filter(r => r.success).length
    const failureCount = resetResults.filter(r => !r.success).length

    console.log(`✅ Monthly Reset completed: ${successCount} نجح، ${failureCount} فشل بواسطة المدير: ${session.username}`)

    return NextResponse.json({
      success: true,
      summary: {
        total: resetResults.length,
        successful: successCount,
        failed: failureCount
      },
      results: resetResults,
      executedBy: session.username,
      executedAt: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Monthly Reset execution error:', error)
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 })
  }
} 