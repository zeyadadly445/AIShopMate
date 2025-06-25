// نظام التجديد الشهري للرسائل
export interface SubscriptionData {
  id: string
  plan: string
  status: string
  messagesLimit: number
  messagesUsed: number
  lastReset: string
  merchantId: string
}

/**
 * التحقق من الحاجة للتجديد الشهري
 * @param subscription بيانات الاشتراك
 * @returns هل يحتاج تجديد؟
 */
export function needsMonthlyReset(subscription: SubscriptionData): boolean {
  if (!subscription.lastReset) return false
  
  const lastResetDate = new Date(subscription.lastReset)
  const now = new Date()
  
  // حساب الفرق بالأيام
  const daysDifference = Math.floor((now.getTime() - lastResetDate.getTime()) / (1000 * 60 * 60 * 24))
  
  // إذا مر 30 يوم أو أكثر
  return daysDifference >= 30
}

/**
 * التحقق من صلاحية التجديد
 * @param subscription بيانات الاشتراك
 * @returns هل مؤهل للتجديد؟
 */
export function isEligibleForReset(subscription: SubscriptionData): boolean {
  // فقط الحسابات المفعلة مؤهلة للتجديد
  return subscription.status === 'ACTIVE'
}

/**
 * الحصول على حد الرسائل حسب الخطة
 * @param plan نوع الخطة
 * @returns عدد الرسائل
 */
export function getMessageLimitByPlan(plan: string): number {
  const limits: Record<string, number> = {
    'BASIC': 1000,
    'STANDARD': 5000,
    'PREMIUM': 15000,
    'ENTERPRISE': 50000
  }
  
  return limits[plan] || 1000
}

/**
 * تجديد الرسائل الشهري للاشتراك
 * @param supabaseAdmin عميل Supabase
 * @param subscriptionId معرف الاشتراك
 * @returns نتيجة التجديد
 */
export async function performMonthlyReset(
  supabaseAdmin: any,
  subscriptionId: string
): Promise<{ success: boolean; message: string; resetCount?: number }> {
  try {
    const now = new Date().toISOString()
    
    const { data, error } = await supabaseAdmin
      .from('Subscription')
      .update({
        messagesUsed: 0,
        lastReset: now
      })
      .eq('id', subscriptionId)
      .select('plan, merchantId, Merchant(businessName, email)')
      .single()

    if (error) {
      return { 
        success: false, 
        message: `خطأ في التجديد: ${error.message}` 
      }
    }

    const merchant = data.Merchant
    const resetCount = getMessageLimitByPlan(data.plan)

    console.log(`🔄 تم التجديد الشهري للتاجر: ${merchant?.businessName} (${merchant?.email}) - ${resetCount} رسالة`)

    return { 
      success: true, 
      message: 'تم تجديد الرسائل بنجاح',
      resetCount 
    }
    
  } catch (error) {
    console.error('❌ خطأ في التجديد الشهري:', error)
    return { 
      success: false, 
      message: 'حدث خطأ في التجديد' 
    }
  }
}

/**
 * التحقق من التجديد والتنفيذ إذا لزم الأمر
 * @param supabaseAdmin عميل Supabase
 * @param subscription بيانات الاشتراك
 * @returns الاشتراك المحدث
 */
export async function checkAndPerformReset(
  supabaseAdmin: any, 
  subscription: SubscriptionData
): Promise<SubscriptionData> {
  // التحقق من الحاجة للتجديد
  if (!needsMonthlyReset(subscription)) {
    return subscription
  }

  // التحقق من الصلاحية
  if (!isEligibleForReset(subscription)) {
    console.log(`⚠️ الاشتراك ${subscription.id} غير مؤهل للتجديد (الحالة: ${subscription.status})`)
    return subscription
  }

  // تنفيذ التجديد
  const resetResult = await performMonthlyReset(supabaseAdmin, subscription.id)
  
  if (resetResult.success) {
    // إرجاع الاشتراك المحدث
    return {
      ...subscription,
      messagesUsed: 0,
      lastReset: new Date().toISOString(),
      messagesLimit: getMessageLimitByPlan(subscription.plan)
    }
  }

  return subscription
} 