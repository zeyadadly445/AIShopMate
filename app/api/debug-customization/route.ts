import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const chatbotId = request.nextUrl.searchParams.get('chatbotId')
  
  const results = {
    timestamp: new Date().toISOString(),
    tests: [] as any[]
  }

  try {
    // 1. اختبار الاتصال بقاعدة البيانات
    results.tests.push({ name: 'Database Connection', status: '🔄 Testing...' })
    
    const { data: connectionTest, error: connectionError } = await supabase
      .from('Merchant')
      .select('count')
      .limit(1)
    
    if (connectionError) {
      results.tests[0] = { 
        name: 'Database Connection', 
        status: '❌ Failed', 
        error: connectionError.message 
      }
      return NextResponse.json(results)
    } else {
      results.tests[0] = { name: 'Database Connection', status: '✅ Success' }
    }

    // 2. التحقق من وجود جدول Merchant
    results.tests.push({ name: 'Merchant Table', status: '🔄 Testing...' })
    
    const { data: merchantCheck, error: merchantError } = await supabase
      .from('Merchant')
      .select('id, chatbotId')
      .limit(1)
    
    if (merchantError) {
      results.tests[1] = { 
        name: 'Merchant Table', 
        status: '❌ Failed', 
        error: merchantError.message 
      }
    } else {
      results.tests[1] = { 
        name: 'Merchant Table', 
        status: '✅ Success',
        rowCount: merchantCheck?.length || 0
      }
    }

    // 3. التحقق من وجود جدول ChatCustomization
    results.tests.push({ name: 'ChatCustomization Table', status: '🔄 Testing...' })
    
    const { data: customizationCheck, error: customizationError } = await supabase
      .from('ChatCustomization')
      .select('id')
      .limit(1)
    
    if (customizationError) {
      results.tests[2] = { 
        name: 'ChatCustomization Table', 
        status: '❌ Failed', 
        error: customizationError.message,
        note: 'جدول ChatCustomization غير موجود - يجب تطبيق SQL أولاً'
      }
    } else {
      results.tests[2] = { 
        name: 'ChatCustomization Table', 
        status: '✅ Success',
        rowCount: customizationCheck?.length || 0
      }
    }

    // 4. إذا تم توفير chatbotId، اختبار العثور على التاجر
    if (chatbotId) {
      results.tests.push({ name: 'Find Merchant by ChatbotId', status: '🔄 Testing...' })
      
      const { data: merchantData, error: findError } = await supabase
        .from('Merchant')
        .select('id, chatbotId, primaryColor, welcomeMessage')
        .eq('chatbotId', chatbotId)
        .single()
      
      if (findError) {
        results.tests[3] = { 
          name: 'Find Merchant by ChatbotId', 
          status: '❌ Failed', 
          error: findError.message,
          chatbotId
        }
      } else {
        results.tests[3] = { 
          name: 'Find Merchant by ChatbotId', 
          status: '✅ Success',
          merchantId: merchantData.id,
          chatbotId: merchantData.chatbotId
        }

        // 5. اختبار البحث عن تخصيصات موجودة
        if (results.tests[2].status === '✅ Success') {
          results.tests.push({ name: 'Find Existing Customizations', status: '🔄 Testing...' })
          
          const { data: existingCustom, error: existingError } = await supabase
            .from('ChatCustomization')
            .select('*')
            .eq('merchantId', merchantData.id)
            .single()
          
          if (existingError && existingError.code !== 'PGRST116') {
            results.tests[4] = { 
              name: 'Find Existing Customizations', 
              status: '❌ Failed', 
              error: existingError.message 
            }
          } else if (existingError && existingError.code === 'PGRST116') {
            results.tests[4] = { 
              name: 'Find Existing Customizations', 
              status: '⚠️ No Data',
              note: 'لا توجد تخصيصات محفوظة مسبقاً - هذا طبيعي'
            }
          } else {
            results.tests[4] = { 
              name: 'Find Existing Customizations', 
              status: '✅ Found',
              customizationId: existingCustom.id
            }
          }
        }
      }
    }

    // 6. اختبار صلاحيات الكتابة
    if (results.tests[2].status === '✅ Success') {
      results.tests.push({ name: 'Write Permissions Test', status: '🔄 Testing...' })
      
      const testData = {
        merchantId: 'test-merchant-id',
        primaryColor: '#ff0000',
        secondaryColor: '#00ff00',
        backgroundColor: '#0000ff',
        userMessageColor: '#ff0000',
        botMessageColor: '#ffffff',
        textColor: '#000000',
        fontFamily: 'Test',
        borderRadius: 'medium',
        headerStyle: 'modern',
        messageStyle: 'rounded',
        animationStyle: 'smooth',
        welcomeMessage: 'Test message',
        placeholderText: 'Test placeholder',
        sendButtonText: 'Test',
        typingIndicator: 'Testing...',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      const { error: insertError } = await supabase
        .from('ChatCustomization')
        .insert(testData)
      
      if (insertError) {
        results.tests[results.tests.length - 1] = { 
          name: 'Write Permissions Test', 
          status: '❌ Failed', 
          error: insertError.message 
        }
      } else {
        // حذف البيانات التجريبية
        await supabase
          .from('ChatCustomization')
          .delete()
          .eq('merchantId', 'test-merchant-id')
        
        results.tests[results.tests.length - 1] = { 
          name: 'Write Permissions Test', 
          status: '✅ Success' 
        }
      }
    }

    return NextResponse.json(results)
  } catch (error) {
    results.tests.push({
      name: 'General Error',
      status: '❌ Critical Error',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    
    return NextResponse.json(results, { status: 500 })
  }
} 