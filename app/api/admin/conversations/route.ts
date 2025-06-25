import { NextRequest, NextResponse } from 'next/server'
import { SimpleAdminAuth } from '@/lib/admin-auth-simple'
import { supabaseAdmin } from '@/lib/supabase'

// GET - جلب جميع المحادثات
export async function GET(request: NextRequest) {
  try {
    console.log('💬 Admin Conversations API - GET all conversations')
    
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
    const search = url.searchParams.get('search') || ''

    const offset = (page - 1) * limit

    // إعداد الفلتر
    let query = supabaseAdmin
      .from('Conversation')
      .select(`
        *,
        Merchant (
          id,
          email,
          business_name,
          chatbot_id
        ),
        Message (
          id,
          content,
          is_from_user,
          created_at,
          tokens_used
        )
      `)

    if (merchantId) {
      query = query.eq('merchant_id', merchantId)
    }

    const { data: conversations, error } = await query
      .range(offset, offset + limit - 1)
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('❌ Error fetching conversations:', error)
      return NextResponse.json({ error: 'خطأ في جلب البيانات' }, { status: 500 })
    }

    // إحصائيات إجمالية
    const { count: totalCount } = await supabaseAdmin
      .from('Conversation')
      .select('id', { count: 'exact', head: true })

    // تنسيق البيانات
    const formattedConversations = conversations?.map(conv => {
      const messages = conv.Message || []
      const userMessages = messages.filter(m => m.is_from_user)
      const botMessages = messages.filter(m => !m.is_from_user)
      const totalTokens = messages.reduce((sum, m) => sum + (m.tokens_used || 0), 0)
      
      const lastUserMessage = userMessages.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )[0]

      return {
        id: conv.id,
        merchantId: conv.merchant_id,
        sessionId: conv.session_id,
        userIp: conv.user_ip,
        userAgent: conv.user_agent,
        isActive: conv.is_active,
        createdAt: conv.created_at,
        updatedAt: conv.updated_at,
        merchant: conv.Merchant ? {
          id: conv.Merchant.id,
          email: conv.Merchant.email,
          businessName: conv.Merchant.business_name,
          chatbotId: conv.Merchant.chatbot_id
        } : null,
        stats: {
          totalMessages: messages.length,
          userMessages: userMessages.length,
          botMessages: botMessages.length,
          totalTokens,
          duration: Math.floor((new Date(conv.updated_at).getTime() - new Date(conv.created_at).getTime()) / (1000 * 60)), // minutes
          lastUserMessage: lastUserMessage?.content?.substring(0, 100) + (lastUserMessage?.content?.length > 100 ? '...' : ''),
          lastActivity: conv.updated_at
        }
      }
    }) || []

    return NextResponse.json({
      success: true,
      conversations: formattedConversations,
      pagination: {
        page,
        limit,
        total: totalCount || 0,
        totalPages: Math.ceil((totalCount || 0) / limit)
      }
    })

  } catch (error) {
    console.error('❌ Conversations API error:', error)
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 })
  }
}

// DELETE - حذف محادثة
export async function DELETE(request: NextRequest) {
  try {
    console.log('💬 Admin Conversations API - DELETE conversation')
    
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

    const { conversationId } = await request.json()

    if (!conversationId) {
      return NextResponse.json({ error: 'معرف المحادثة مطلوب' }, { status: 400 })
    }

    // حذف الرسائل أولاً
    await supabaseAdmin
      .from('Message')
      .delete()
      .eq('conversation_id', conversationId)

    // حذف المحادثة
    const { error: deleteError } = await supabaseAdmin
      .from('Conversation')
      .delete()
      .eq('id', conversationId)

    if (deleteError) {
      console.error('❌ Error deleting conversation:', deleteError)
      return NextResponse.json({ error: 'خطأ في حذف المحادثة' }, { status: 500 })
    }

    console.log(`🗑️ Deleted conversation: ${conversationId}`)

    return NextResponse.json({
      success: true,
      message: 'تم حذف المحادثة بنجاح'
    })

  } catch (error) {
    console.error('❌ Delete conversation error:', error)
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 })
  }
} 