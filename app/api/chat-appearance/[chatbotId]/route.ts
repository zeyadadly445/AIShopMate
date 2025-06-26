import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

interface ChatCustomization {
  primaryColor: string
  secondaryColor: string
  backgroundColor: string
  userMessageColor: string
  botMessageColor: string
  textColor: string
  fontFamily: string
  borderRadius: string
  chatHeaderStyle: string
  messageStyle: string
  inputStyle: string
  animation: string
  logoUrl?: string
  welcomeMessage: string
  placeholderText: string
  sendButtonText: string
  typingIndicatorText: string
}

// GET - تحميل التخصيصات
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ chatbotId: string }> }
) {
  try {
    const { chatbotId } = await params

    // البحث عن التاجر باستخدام chatbotId
    const { data: merchant, error: merchantError } = await supabase
      .from('Merchant')
      .select('id, primaryColor, logoUrl, welcomeMessage')
      .eq('chatbotId', chatbotId)
      .single()

    if (merchantError || !merchant) {
      return NextResponse.json({ error: 'Merchant not found' }, { status: 404 })
    }

    // البحث عن التخصيصات إذا كانت موجودة
    const { data: customizations, error: customError } = await supabase
      .from('ChatCustomization')
      .select('*')
      .eq('merchantId', merchant.id)
      .single()

    if (customError && customError.code !== 'PGRST116') {
      console.error('Database error:', customError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    // إرجاع التخصيصات أو القيم الافتراضية
    const result: ChatCustomization = {
      primaryColor: customizations?.primaryColor || merchant.primaryColor || '#3b82f6',
      secondaryColor: customizations?.secondaryColor || '#64748b',
      backgroundColor: customizations?.backgroundColor || '#f8fafc',
      userMessageColor: customizations?.userMessageColor || merchant.primaryColor || '#3b82f6',
      botMessageColor: customizations?.botMessageColor || '#ffffff',
      textColor: customizations?.textColor || '#1f2937',
      fontFamily: customizations?.fontFamily || 'Inter',
      borderRadius: customizations?.borderRadius || '16px',
      chatHeaderStyle: customizations?.chatHeaderStyle || 'modern',
      messageStyle: customizations?.messageStyle || 'rounded',
      inputStyle: customizations?.inputStyle || 'modern',
      animation: customizations?.animation || 'smooth',
      logoUrl: customizations?.logoUrl || merchant.logoUrl,
      welcomeMessage: customizations?.welcomeMessage || merchant.welcomeMessage || 'مرحبا! كيف يمكنني مساعدتك اليوم؟',
      placeholderText: customizations?.placeholderText || 'اكتب رسالتك هنا...',
      sendButtonText: customizations?.sendButtonText || 'إرسال',
      typingIndicatorText: customizations?.typingIndicatorText || 'يكتب...'
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error loading customization:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - حفظ التخصيصات
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ chatbotId: string }> }
) {
  try {
    const { chatbotId } = await params
    const body = await request.json() as ChatCustomization

    // البحث عن التاجر
    const { data: merchant, error: merchantError } = await supabase
      .from('Merchant')
      .select('id')
      .eq('chatbotId', chatbotId)
      .single()

    if (merchantError || !merchant) {
      return NextResponse.json({ error: 'Merchant not found' }, { status: 404 })
    }

    // التحقق من وجود التخصيصات
    const { data: existingCustomization, error: checkError } = await supabase
      .from('ChatCustomization')
      .select('id')
      .eq('merchantId', merchant.id)
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Database check error:', checkError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    const customizationData = {
      merchantId: merchant.id,
      primaryColor: body.primaryColor,
      secondaryColor: body.secondaryColor,
      backgroundColor: body.backgroundColor,
      userMessageColor: body.userMessageColor,
      botMessageColor: body.botMessageColor,
      textColor: body.textColor,
      fontFamily: body.fontFamily,
      borderRadius: body.borderRadius,
      chatHeaderStyle: body.chatHeaderStyle,
      messageStyle: body.messageStyle,
      inputStyle: body.inputStyle,
      animation: body.animation,
      logoUrl: body.logoUrl,
      welcomeMessage: body.welcomeMessage,
      placeholderText: body.placeholderText,
      sendButtonText: body.sendButtonText,
      typingIndicatorText: body.typingIndicatorText,
      updatedAt: new Date().toISOString()
    }

    let result
    if (existingCustomization) {
      // تحديث التخصيصات الموجودة
      const { data, error } = await supabase
        .from('ChatCustomization')
        .update(customizationData)
        .eq('merchantId', merchant.id)
        .select()
        .single()

      if (error) {
        console.error('Update error:', error)
        return NextResponse.json({ error: 'Failed to update customization' }, { status: 500 })
      }
      result = data
    } else {
      // إنشاء تخصيصات جديدة
      const { data, error } = await supabase
        .from('ChatCustomization')
        .insert({
          ...customizationData,
          createdAt: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        console.error('Insert error:', error)
        return NextResponse.json({ error: 'Failed to create customization' }, { status: 500 })
      }
      result = data
    }

    // تحديث اللون الأساسي ورسالة الترحيب في جدول Merchant أيضاً للتوافق مع النظام الحالي
    await supabase
      .from('Merchant')
      .update({
        primaryColor: body.primaryColor,
        welcomeMessage: body.welcomeMessage,
        logoUrl: body.logoUrl
      })
      .eq('id', merchant.id)

    return NextResponse.json({ 
      success: true, 
      message: 'Customization saved successfully',
      data: result 
    })
  } catch (error) {
    console.error('Error saving customization:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 