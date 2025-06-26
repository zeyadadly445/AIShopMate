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
  headerStyle: string
  messageStyle: string
  animationStyle: string
  logoUrl?: string
  welcomeMessage: string
  placeholderText: string
  sendButtonText: string
  typingIndicator: string
}

// GET - تحميل التخصيصات
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ chatbotId: string }> }
) {
  try {
    const { chatbotId } = await params
    console.log('🔍 Loading customizations for chatbotId:', chatbotId)

    // البحث عن التاجر باستخدام chatbotId
    const { data: merchant, error: merchantError } = await supabase
      .from('Merchant')
      .select('id, primaryColor, logoUrl, welcomeMessage')
      .eq('chatbotId', chatbotId)
      .single()

    if (merchantError) {
      console.error('❌ Merchant error:', merchantError)
      return NextResponse.json({ 
        error: 'Merchant not found',
        details: merchantError.message,
        chatbotId 
      }, { status: 404 })
    }

    if (!merchant) {
      console.error('❌ No merchant found for chatbotId:', chatbotId)
      return NextResponse.json({ 
        error: 'Merchant not found',
        chatbotId 
      }, { status: 404 })
    }

    console.log('✅ Found merchant:', merchant.id)

    // البحث عن التخصيصات إذا كانت موجودة
    const { data: customizations, error: customError } = await supabase
      .from('ChatCustomization')
      .select('*')
      .eq('merchantId', merchant.id)
      .single()

    if (customError && customError.code !== 'PGRST116') {
      console.error('❌ ChatCustomization table error:', customError)
      return NextResponse.json({ 
        error: 'Database error accessing ChatCustomization table',
        details: customError.message,
        hint: 'جدول ChatCustomization قد يكون غير موجود. يجب تطبيق SQL أولاً.'
      }, { status: 500 })
    }

    if (customError && customError.code === 'PGRST116') {
      console.log('⚠️ No existing customizations found - using defaults')
    } else {
      console.log('✅ Found existing customizations')
    }

    // إرجاع التخصيصات أو القيم الافتراضية
    const result: ChatCustomization = {
      primaryColor: customizations?.primaryColor || merchant.primaryColor || '#007bff',
      secondaryColor: customizations?.secondaryColor || '#6c757d',
      backgroundColor: customizations?.backgroundColor || '#ffffff',
      userMessageColor: customizations?.userMessageColor || merchant.primaryColor || '#007bff',
      botMessageColor: customizations?.botMessageColor || '#f8f9fa',
      textColor: customizations?.textColor || '#333333',
      fontFamily: customizations?.fontFamily || 'Inter',
      borderRadius: customizations?.borderRadius || 'medium',
      headerStyle: customizations?.headerStyle || 'modern',
      messageStyle: customizations?.messageStyle || 'rounded',
      animationStyle: customizations?.animationStyle || 'smooth',
      logoUrl: customizations?.logoUrl || merchant.logoUrl,
      welcomeMessage: customizations?.welcomeMessage || merchant.welcomeMessage || 'مرحبا! كيف يمكنني مساعدتك؟',
      placeholderText: customizations?.placeholderText || 'اكتب رسالتك هنا...',
      sendButtonText: customizations?.sendButtonText || 'إرسال',
      typingIndicator: customizations?.typingIndicator || 'يكتب...'
    }

    console.log('✅ Returning customizations successfully')
    return NextResponse.json(result)
  } catch (error) {
    console.error('❌ Critical error loading customization:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// POST - حفظ التخصيصات
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ chatbotId: string }> }
) {
  try {
    const { chatbotId } = await params
    console.log('💾 Saving customizations for chatbotId:', chatbotId)
    
    let body: ChatCustomization
    try {
      body = await request.json() as ChatCustomization
      console.log('✅ Successfully parsed request body')
    } catch (parseError) {
      console.error('❌ Failed to parse request body:', parseError)
      return NextResponse.json({ 
        error: 'Invalid JSON in request body',
        details: parseError instanceof Error ? parseError.message : 'Unknown parsing error'
      }, { status: 400 })
    }

    // البحث عن التاجر
    console.log('🔍 Looking for merchant with chatbotId:', chatbotId)
    const { data: merchant, error: merchantError } = await supabase
      .from('Merchant')
      .select('id')
      .eq('chatbotId', chatbotId)
      .single()

    if (merchantError) {
      console.error('❌ Merchant lookup error:', merchantError)
      return NextResponse.json({ 
        error: 'Merchant not found',
        details: merchantError.message,
        chatbotId 
      }, { status: 404 })
    }

    if (!merchant) {
      console.error('❌ No merchant found for chatbotId:', chatbotId)
      return NextResponse.json({ 
        error: 'Merchant not found',
        chatbotId 
      }, { status: 404 })
    }

    console.log('✅ Found merchant:', merchant.id)

    // التحقق من وجود جدول ChatCustomization
    console.log('🔍 Checking ChatCustomization table...')
    const { data: tableCheck, error: tableError } = await supabase
      .from('ChatCustomization')
      .select('id')
      .limit(1)

    if (tableError) {
      console.error('❌ ChatCustomization table not accessible:', tableError)
      return NextResponse.json({ 
        error: 'ChatCustomization table not found',
        details: tableError.message,
        hint: 'يجب تطبيق SQL script أولاً: supabase-chat-customization-safe.sql'
      }, { status: 500 })
    }

    console.log('✅ ChatCustomization table is accessible')

    // التحقق من وجود التخصيصات
    console.log('🔍 Checking for existing customizations...')
    const { data: existingCustomization, error: checkError } = await supabase
      .from('ChatCustomization')
      .select('id')
      .eq('merchantId', merchant.id)
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('❌ Database check error:', checkError)
      return NextResponse.json({ 
        error: 'Database error checking existing customizations',
        details: checkError.message 
      }, { status: 500 })
    }

    const isUpdate = !!existingCustomization
    console.log(isUpdate ? '🔄 Updating existing customizations' : '🆕 Creating new customizations')

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
      headerStyle: body.headerStyle,
      messageStyle: body.messageStyle,
      animationStyle: body.animationStyle,
      logoUrl: body.logoUrl,
      welcomeMessage: body.welcomeMessage,
      placeholderText: body.placeholderText,
      sendButtonText: body.sendButtonText,
      typingIndicator: body.typingIndicator,
      updatedAt: new Date().toISOString()
    }

    let result
    if (isUpdate) {
      // تحديث التخصيصات الموجودة
      console.log('🔄 Updating existing customization...')
      const { data, error } = await supabase
        .from('ChatCustomization')
        .update(customizationData)
        .eq('merchantId', merchant.id)
        .select()
        .single()

      if (error) {
        console.error('❌ Update error:', error)
        return NextResponse.json({ 
          error: 'Failed to update customization',
          details: error.message,
          operation: 'update'
        }, { status: 500 })
      }
      result = data
      console.log('✅ Successfully updated customizations')
    } else {
      // إنشاء تخصيصات جديدة
      console.log('🆕 Creating new customization...')
      const { data, error } = await supabase
        .from('ChatCustomization')
        .insert({
          ...customizationData,
          createdAt: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        console.error('❌ Insert error:', error)
        return NextResponse.json({ 
          error: 'Failed to create customization',
          details: error.message,
          operation: 'insert'
        }, { status: 500 })
      }
      result = data
      console.log('✅ Successfully created new customizations')
    }

    // تحديث اللون الأساسي ورسالة الترحيب في جدول Merchant أيضاً للتوافق مع النظام الحالي
    console.log('🔄 Updating Merchant table for compatibility...')
    const { error: merchantUpdateError } = await supabase
      .from('Merchant')
      .update({
        primaryColor: body.primaryColor,
        welcomeMessage: body.welcomeMessage,
        logoUrl: body.logoUrl
      })
      .eq('id', merchant.id)

    if (merchantUpdateError) {
      console.warn('⚠️ Warning: Failed to update Merchant table:', merchantUpdateError.message)
      // لا نفشل العملية كاملة لأن التخصيصات تم حفظها بنجاح
    } else {
      console.log('✅ Successfully updated Merchant table')
    }

    console.log('✅ All operations completed successfully')
    return NextResponse.json({ 
      success: true, 
      message: 'Customization saved successfully',
      data: result,
      operation: isUpdate ? 'updated' : 'created'
    })
  } catch (error) {
    console.error('❌ Critical error saving customization:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 