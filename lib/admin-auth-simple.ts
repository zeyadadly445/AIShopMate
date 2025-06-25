import { supabaseAdmin } from '@/lib/supabase'
import bcrypt from 'bcryptjs'

// Simple session interface (no JWT)
export interface SimpleAdminSession {
  username: string
  adminId: string
  dbId: number
  loginTime: number
  isValid: boolean
}

interface AdminRecord {
  id: number
  username: string
  email: string
  password_hash: string
  admin_id: string
  role: string
  is_active: boolean
  last_login: string | null
  login_attempts: number
  locked_until: string | null
  created_at: string
  updated_at: string
}

export class SimpleAdminAuth {
  
  /**
   * تسجيل دخول المدير بدون JWT
   */
  static async login(username: string, password: string): Promise<{ success: boolean; session?: SimpleAdminSession; error?: string }> {
    try {
      console.log('🔍 Simple Admin Login Attempt:', username)
      
      // جلب بيانات المدير من قاعدة البيانات
      const { data: admin, error } = await supabaseAdmin
        .from('Admin')
        .select('*')
        .eq('username', username)
        .eq('is_active', true)
        .single()

      if (error || !admin) {
        console.log('❌ Admin not found:', error?.message)
        return { success: false, error: 'المستخدم غير موجود' }
      }

      // التحقق من كلمة المرور
      const isPasswordValid = await bcrypt.compare(password, admin.password_hash)
      
      if (!isPasswordValid) {
        console.log('❌ Invalid password')
        
        // تحديث محاولات الدخول الفاشلة
        await supabaseAdmin
          .from('Admin')
          .update({ 
            login_attempts: admin.login_attempts + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', admin.id)
        
        return { success: false, error: 'كلمة المرور غير صحيحة' }
      }

      console.log('✅ Login successful, creating session')
      
      // تحديث آخر تسجيل دخول
      await supabaseAdmin
        .from('Admin')
        .update({ 
          last_login: new Date().toISOString(),
          login_attempts: 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', admin.id)

      // إنشاء جلسة بسيطة
      const session: SimpleAdminSession = {
        username: admin.username,
        adminId: admin.admin_id,
        dbId: admin.id,
        loginTime: Date.now(),
        isValid: true
      }

      return { success: true, session }
      
    } catch (error) {
      console.error('❌ Login error:', error)
      return { success: false, error: 'خطأ في الخادم' }
    }
  }

  /**
   * التحقق من صحة الجلسة
   */
  static validateSession(session: SimpleAdminSession | null): boolean {
    if (!session) {
      console.log('🚫 No session provided')
      return false
    }

    if (!session.isValid) {
      console.log('🚫 Session marked as invalid')
      return false
    }

    // التحقق من انتهاء الجلسة (24 ساعة)
    const sessionAge = Date.now() - session.loginTime
    if (sessionAge > 24 * 60 * 60 * 1000) {
      console.log('🚫 Session expired')
      return false
    }

    console.log('✅ Session is valid for:', session.username)
    return true
  }

  /**
   * الحصول على بيانات Dashboard
   */
  static async getDashboardData(session: SimpleAdminSession) {
    try {
      if (!this.validateSession(session)) {
        throw new Error('Invalid session')
      }

      console.log('📊 Fetching dashboard data for:', session.username)

      // جلب المرشحين أولاً بشكل بسيط
      console.log('🔍 Fetching merchants...')
      const { data: merchants, error: merchantsError } = await supabaseAdmin
        .from('Merchant')
        .select('*')
        .order('created_at', { ascending: false })

      if (merchantsError) {
        console.error('❌ Error fetching merchants:', merchantsError)
        throw new Error(`Merchants fetch error: ${merchantsError.message}`)
      }

      console.log(`✅ Found ${merchants?.length || 0} merchants`)

      // جلب الاشتراكات بشكل منفصل
      console.log('🔍 Fetching subscriptions...')
      const { data: subscriptions, error: subscriptionsError } = await supabaseAdmin
        .from('Subscription')
        .select('*')

      if (subscriptionsError) {
        console.error('❌ Error fetching subscriptions:', subscriptionsError)
        // لا نرمي خطأ هنا، نتابع بدون اشتراكات
        console.log('⚠️ Continuing without subscriptions data')
      }

      console.log(`✅ Found ${subscriptions?.length || 0} subscriptions`)

      // ربط الاشتراكات بالمرشحين
      const merchantsWithSubs = merchants?.map(merchant => {
        const subscription = subscriptions?.find(sub => sub.merchant_id === merchant.id)
        return {
          ...merchant,
          subscription: subscription ? {
            id: subscription.id,
            plan: subscription.plan,
            status: subscription.status,
            messagesLimit: subscription.messages_limit,
            messagesUsed: subscription.messages_used,
            usagePercentage: Math.round((subscription.messages_used / subscription.messages_limit) * 100),
            remainingMessages: subscription.messages_limit - subscription.messages_used,
            startDate: subscription.start_date,
            endDate: subscription.end_date,
            createdAt: subscription.created_at,
            updatedAt: subscription.updated_at
          } : null
        }
      }) || []

      // حساب الإحصائيات
      const stats = {
        totalMerchants: merchantsWithSubs.length,
        activeMerchants: merchantsWithSubs.filter(m => m.subscription?.status === 'ACTIVE').length,
        trialMerchants: merchantsWithSubs.filter(m => m.subscription?.status === 'TRIAL').length,
        newMerchantsThisMonth: merchantsWithSubs.filter(m => {
          const createdAt = new Date(m.created_at)
          const now = new Date()
          return createdAt.getMonth() === now.getMonth() && createdAt.getFullYear() === now.getFullYear()
        }).length,
        totalMessagesUsed: merchantsWithSubs.reduce((sum, m) => sum + (m.subscription?.messagesUsed || 0), 0),
        limitReachedUsers: merchantsWithSubs.filter(m => {
          const sub = m.subscription
          return sub && sub.messagesUsed >= sub.messagesLimit
        }).length,
        potentialRevenue: merchantsWithSubs.reduce((sum, m) => {
          const plan = m.subscription?.plan
          const planRevenue = {
            'BASIC': 29,
            'STANDARD': 79,
            'PREMIUM': 159,
            'ENTERPRISE': 299
          }
          return sum + (planRevenue[plan as keyof typeof planRevenue] || 0)
        }, 0),
        totalConversations: 0 // سيتم حسابها لاحقاً
      }

      // أعلى المستخدمين استخداماً
      const topUsers = merchantsWithSubs
        .filter(m => m.subscription)
        .map(m => {
          const sub = m.subscription!
          return {
            id: m.id,
            businessName: m.business_name,
            email: m.email,
            messagesUsed: sub.messagesUsed,
            messagesLimit: sub.messagesLimit,
            usagePercentage: sub.usagePercentage,
            plan: sub.plan,
            status: sub.status,
            createdAt: m.created_at
          }
        })
        .sort((a, b) => b.messagesUsed - a.messagesUsed)
        .slice(0, 10)

      // تنسيق بيانات المرشحين للعرض
      const formattedMerchants = merchantsWithSubs.map(m => ({
        id: m.id,
        email: m.email,
        businessName: m.business_name,
        phone: m.phone,
        chatbotId: m.chatbot_id,
        welcomeMessage: m.welcome_message,
        primaryColor: m.primary_color,
        createdAt: m.created_at,
        updatedAt: m.updated_at,
        subscription: m.subscription
      }))

      console.log('✅ Dashboard data prepared successfully')

      return {
        stats,
        merchants: formattedMerchants,
        topUsers,
        lastUpdated: new Date().toISOString(),
        adminSession: {
          username: session.username,
          loginTime: session.loginTime,
          adminId: session.adminId,
          dbId: session.dbId
        }
      }

    } catch (error) {
      console.error('❌ Error in getDashboardData:', error)
      throw error
    }
  }
}

// دوال مساعدة للـ frontend
export function getSimpleAdminSession(): SimpleAdminSession | null {
  if (typeof window === 'undefined') {
    console.log('🚫 Server side - no session')
    return null
  }
  
  try {
    const sessionData = localStorage.getItem('simple_admin_session')
    if (!sessionData) {
      console.log('🚫 No session in localStorage')
      return null
    }

    const session: SimpleAdminSession = JSON.parse(sessionData)
    
    if (!SimpleAdminAuth.validateSession(session)) {
      console.log('🚫 Invalid session, clearing')
      clearSimpleAdminSession()
      return null
    }

    console.log('✅ Valid session found:', session.username)
    return session
    
  } catch (error) {
    console.error('❌ Error parsing session:', error)
    clearSimpleAdminSession()
    return null
  }
}

export function setSimpleAdminSession(session: SimpleAdminSession): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('simple_admin_session', JSON.stringify(session))
    console.log('✅ Session saved for:', session.username)
  }
}

export function clearSimpleAdminSession(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('simple_admin_session')
    console.log('🗑️ Session cleared')
  }
}

// Middleware للـ API routes
export function requireSimpleAdminAuth(session: SimpleAdminSession | null): boolean {
  return SimpleAdminAuth.validateSession(session)
} 