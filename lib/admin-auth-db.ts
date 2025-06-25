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

    return jwt.sign(payload, ADMIN_JWT_SECRET, { 
      expiresIn: '24h',
      issuer: 'ai-shop-mate-admin',
      audience: 'admin-panel'
    })
  }

  /**
   * التحقق من صحة token المدير
   */
  static verifyAdminToken(token: string): AdminSession | null {
    try {
      if (!token) {
        return null
      }

      const decoded = jwt.verify(token, ADMIN_JWT_SECRET, {
        issuer: 'ai-shop-mate-admin',
        audience: 'admin-panel'
      }) as AdminSession

      if (!decoded || 
          typeof decoded !== 'object' || 
          !decoded.adminId || 
          !decoded.isAdmin) {
        return null
      }

      // التحقق من انتهاء الجلسة (24 ساعة)
      const sessionAge = Date.now() - decoded.loginTime
      if (sessionAge > 24 * 60 * 60 * 1000) {
        return null
      }

      return decoded
    } catch (error) {
      console.error('Invalid admin token:', error)
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
  if (!authHeader?.startsWith('Bearer ')) {
    console.log('❌ No valid authorization header')
    return null
  }

  const token = authHeader.substring(7)
  console.log('🎫 Token received, length:', token.length)
  
  const result = AdminAuthService.verifyAdminToken(token)
  console.log('🔐 Token verification result:', result ? 'SUCCESS' : 'FAILED')
  
  return result
}

/**
 * دالة للحماية من جانب العميل
 */
export function getAdminSession(): AdminSession | null {
  if (typeof window === 'undefined') return null
  
  const token = localStorage.getItem('admin_token')
  if (!token) return null

  try {
    return AdminAuthService.verifyAdminToken(token)
  } catch (error) {
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