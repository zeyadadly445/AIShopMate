'use client'

import React from 'react'
import Link from 'next/link'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'

export default function TestChatPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-4xl mx-auto">
        <Card className="text-center p-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-6">اختبار نظام المحادثة</h1>
          <p className="text-gray-600 mb-8">
            الآن يمكنك اختبار نظام المحادثة الذكي. هذه بعض الروابط التجريبية:
          </p>
          
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-800 mb-2">مثال على رابط محادثة:</h3>
              <code className="text-sm text-blue-600 bg-white px-3 py-1 rounded">
                https://ai-shop-mate.vercel.app/chat/shoes
              </code>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-800 mb-2">لاختبار المحادثة محلياً:</h3>
              <code className="text-sm text-blue-600 bg-white px-3 py-1 rounded">
                http://localhost:3000/chat/shoes
              </code>
            </div>
          </div>

          <div className="mt-8 space-y-4">
            <Link href="/chat/shoes">
              <Button className="mx-2">اختبار محادثة متجر الأحذية</Button>
            </Link>
            
            <Link href="/dashboard">
              <Button variant="outline" className="mx-2">الذهاب إلى لوحة التحكم</Button>
            </Link>
            
            <Link href="/auth/register">
              <Button variant="secondary" className="mx-2">تسجيل متجر جديد</Button>
            </Link>
          </div>

          <div className="mt-8 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <h3 className="font-semibold text-yellow-800 mb-2">ملاحظة مهمة:</h3>
            <p className="text-sm text-yellow-700">
              للعمل بشكل كامل، تحتاج لإنشاء ملف <code>.env.local</code> في جذر المشروع 
              وإضافة متغيرات البيئة للاتصال مع Supabase.
            </p>
          </div>
        </Card>
      </div>
    </div>
  )
} 