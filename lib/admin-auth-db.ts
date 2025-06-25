import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { supabaseAdmin } from '@/lib/supabase'

// JWT Secret for admin (can still use environment variable for this)
const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'admin-ai-shop-mate-secret-2024-secure-key-for-admin-panel-authentication'

export interface AdminSession {
  adminId: string
  username: string
  loginTime: number
  isAdmin: true
  dbId: number
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

export class AdminAuthService {
  
  /**
   * التحقق من بيانات دخول المدير من قاعدة البيانات
   */
  static async validateAdmin(username: string, password: string): Promise<AdminRecord | null> {
    try {
      console.log('🔍 Database Admin Login Attempt:', username)
      
      // جلب بيانات المدير من قاعدة البيانات
      const { data: admin, error } = await supabaseAdmin
        .from('Admin')
        .select('*')
        .eq('username', username)
        .eq('is_active', true)
        .single()

      if (error || !admin) {
        console.log('❌ Admin not found in database:', error?.message)
        return null
      }

      console.log('✅ Admin found in database:', admin.username)

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
        
        return null
      }

      console.log('✅ Password valid, updating last login')
      
      // تحديث آخر تسجيل دخول
      await supabaseAdmin
        .from('Admin')
        .update({ 
          last_login: new Date().toISOString(),
          login_attempts: 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', admin.id)

      return admin as AdminRecord
    } catch (error) {
      console.error('❌ Database error during admin validation:', error)
      return null
    }
  }

  /**
   * إنشاء JWT token للمدير
   */
  static generateAdminToken(admin: AdminRecord): string {
    const payload: AdminSession = {
      adminId: admin.admin_id,
      username: admin.username,
      loginTime: Date.now(),
      isAdmin: true,
      dbId: admin.id
    }

    console.log('🎫 Generating JWT token for admin:', admin.username)

    return jwt.sign(payload, ADMIN_JWT_SECRET, { 
      expiresIn: '24h'
    })
  }

  /**
   * التحقق من صحة token المدير
   */
  static verifyAdminToken(token: string): AdminSession | null {
    try {
      if (!token) {
        console.log('🚫 No token provided')
        return null
      }

      console.log('🔍 Verifying JWT token...')

      // Try basic JWT verification first
      let decoded: any
      try {
        decoded = jwt.verify(token, ADMIN_JWT_SECRET)
        console.log('✅ JWT verification successful')
      } catch (jwtError: any) {
        console.error('❌ JWT verification failed:', jwtError.message)
        
        // Try without issuer/audience validation
        try {
          decoded = jwt.verify(token, ADMIN_JWT_SECRET, { ignoreExpiration: false })
          console.log('✅ JWT verification successful (fallback)')
        } catch (fallbackError: any) {
          console.error('❌ JWT fallback verification failed:', fallbackError.message)
          return null
        }
      }

      if (!decoded || typeof decoded !== 'object') {
        console.log('❌ Invalid decoded token structure')
        return null
      }

      // التحقق من وجود البيانات المطلوبة
      if (!decoded.adminId || !decoded.username || decoded.isAdmin !== true) {
        console.log('❌ Missing required admin token fields')
        return null
      }

      // التحقق من انتهاء الجلسة (24 ساعة)
      if (decoded.loginTime) {
        const sessionAge = Date.now() - decoded.loginTime
        if (sessionAge > 24 * 60 * 60 * 1000) {
          console.log('❌ Session expired')
          return null
        }
      }

      const adminSession: AdminSession = {
        adminId: decoded.adminId,
        username: decoded.username,
        loginTime: decoded.loginTime || Date.now(),
        isAdmin: true,
        dbId: decoded.dbId || 0
      }

      console.log('✅ Admin session validated:', adminSession.username)
      return adminSession

    } catch (error: any) {
      console.error('❌ Token verification error:', error.message)
      return null
    }
  }

  /**
   * جلب بيانات المدير من قاعدة البيانات
   */
  static async getAdminById(adminId: string): Promise<AdminRecord | null> {
    try {
      const { data: admin, error } = await supabaseAdmin
        .from('Admin')
        .select('*')
        .eq('admin_id', adminId)
        .eq('is_active', true)
        .single()

      if (error || !admin) {
        return null
      }

      return admin as AdminRecord
    } catch (error) {
      console.error('Error fetching admin by ID:', error)
      return null
    }
  }

  /**
   * تحديث كلمة مرور المدير
   */
  static async updateAdminPassword(adminId: string, newPassword: string): Promise<boolean> {
    try {
      const passwordHash = await bcrypt.hash(newPassword, 12)
      
      const { error } = await supabaseAdmin
        .from('Admin')
        .update({ 
          password_hash: passwordHash,
          updated_at: new Date().toISOString()
        })
        .eq('admin_id', adminId)

      return !error
    } catch (error) {
      console.error('Error updating admin password:', error)
      return false
    }
  }
}

/**
 * Middleware للحماية من جانب الخادم
 */
export function requireAdminAuth(req: Request): AdminSession | null {
  console.log('🔍 Database-based Admin Auth Check')
  
  const authHeader = req.headers.get('authorization')
  if (!authHeader) {
    console.log('❌ No authorization header')
    return null
  }
  
  if (!authHeader.startsWith('Bearer ')) {
    console.log('❌ Invalid authorization header format')
    return null
  }

  const token = authHeader.substring(7)
  console.log('🎫 Token received, length:', token.length)
  
  if (!token || token.length < 10) {
    console.log('❌ Token too short or empty')
    return null
  }
  
  const result = AdminAuthService.verifyAdminToken(token)
  console.log('🔐 Token verification result:', result ? `SUCCESS (${result.username})` : 'FAILED')
  
  return result
}

/**
 * دالة للحماية من جانب العميل
 */
export function getAdminSession(): AdminSession | null {
  if (typeof window === 'undefined') {
    console.log('🚫 Window undefined (server side)')
    return null
  }
  
  const token = localStorage.getItem('admin_token')
  if (!token) {
    console.log('🚫 No admin token in localStorage')
    return null
  }

  try {
    console.log('🔍 Checking admin session from localStorage')
    const session = AdminAuthService.verifyAdminToken(token)
    
    if (!session) {
      console.log('🚫 Invalid session, clearing localStorage')
      clearAdminSession()
      return null
    }
    
    console.log('✅ Valid admin session found')
    return session
  } catch (error: any) {
    console.error('❌ Error checking admin session:', error.message)
    clearAdminSession()
    return null
  }
}

export function setAdminSession(token: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('admin_token', token)
  }
}

export function clearAdminSession(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('admin_token')
  }
} 