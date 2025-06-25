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

      // إحصائيات المرشحين (Merchants)
      const { data: merchants, error: merchantsError } = await supabaseAdmin
        .from('Merchant')
        .select(`
          *,
          Subscription (
            id,
            plan,
            status,
            messagesLimit: messages_limit,
            messagesUsed: messages_used,
            startDate: start_date,
            endDate: end_date,
            createdAt: created_at,
            updatedAt: updated_at
          )
        `)
        .order('created_at', { ascending: false })

      if (merchantsError) {
        console.error('❌ Error fetching merchants:', merchantsError)
        throw merchantsError
      }

      // حساب الإحصائيات
      const stats = {
        totalMerchants: merchants?.length || 0,
        activeMerchants: merchants?.filter(m => m.Subscription?.[0]?.status === 'ACTIVE').length || 0,
        trialMerchants: merchants?.filter(m => m.Subscription?.[0]?.status === 'TRIAL').length || 0,
        newMerchantsThisMonth: merchants?.filter(m => {
          const createdAt = new Date(m.created_at)
          const now = new Date()
          return createdAt.getMonth() === now.getMonth() && createdAt.getFullYear() === now.getFullYear()
        }).length || 0,
        totalMessagesUsed: merchants?.reduce((sum, m) => sum + (m.Subscription?.[0]?.messagesUsed || 0), 0) || 0,
        limitReachedUsers: merchants?.filter(m => {
          const sub = m.Subscription?.[0]
          return sub && sub.messagesUsed >= sub.messagesLimit
        }).length || 0,
        potentialRevenue: merchants?.reduce((sum, m) => {
          const plan = m.Subscription?.[0]?.plan
          const planRevenue = {
            'BASIC': 29,
            'STANDARD': 79,
            'PREMIUM': 159,
            'ENTERPRISE': 299
          }
          return sum + (planRevenue[plan as keyof typeof planRevenue] || 0)
        }, 0) || 0,
        totalConversations: 0 // سيتم حسابها لاحقاً
      }

      // أعلى المستخدمين استخداماً
      const topUsers = merchants
        ?.filter(m => m.Subscription?.[0])
        .map(m => {
          const sub = m.Subscription[0]
          return {
            id: m.id,
            businessName: m.business_name,
            email: m.email,
            messagesUsed: sub.messagesUsed,
            messagesLimit: sub.messagesLimit,
            usagePercentage: Math.round((sub.messagesUsed / sub.messagesLimit) * 100),
            plan: sub.plan,
            status: sub.status,
            createdAt: m.created_at
          }
        })
        .sort((a, b) => b.messagesUsed - a.messagesUsed)
        .slice(0, 10) || []

      // تنسيق بيانات المرشحين
      const formattedMerchants = merchants?.map(m => {
        const sub = m.Subscription?.[0]
        return {
          id: m.id,
          email: m.email,
          businessName: m.business_name,
          phone: m.phone,
          chatbotId: m.chatbot_id,
          welcomeMessage: m.welcome_message,
          primaryColor: m.primary_color,
          createdAt: m.created_at,
          updatedAt: m.updated_at,
          subscription: sub ? {
            id: sub.id,
            plan: sub.plan,
            status: sub.status,
            messagesLimit: sub.messagesLimit,
            messagesUsed: sub.messagesUsed,
            usagePercentage: Math.round((sub.messagesUsed / sub.messagesLimit) * 100),
            remainingMessages: sub.messagesLimit - sub.messagesUsed,
            startDate: sub.startDate,
            endDate: sub.endDate,
            createdAt: sub.createdAt,
            updatedAt: sub.updatedAt
          } : null
        }
      }) || []

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
      console.error('❌ Error fetching dashboard data:', error)
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