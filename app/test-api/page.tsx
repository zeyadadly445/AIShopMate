'use client'

import { useState } from 'react'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'

export default function TestAPIPage() {
  const [results, setResults] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [endpoint, setEndpoint] = useState('/api/debug-chat-simple')

  const testEndpoint = async (url: string, data: any) => {
    setLoading(true)
    setResults(null)
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      })
      
      const result = await response.json()
      setResults({
        status: response.status,
        statusText: response.statusText,
        data: result
      })
    } catch (error) {
      setResults({
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      setLoading(false)
    }
  }

  const tests = [
    {
      name: 'فحص التشخيص الشامل',
      endpoint: '/api/debug-chat-simple',
      data: { chatbotId: 'shoes', message: 'مرحبا', sessionId: 'test-session' }
    },
    {
      name: 'اختبار المتجر',
      endpoint: '/api/merchant/shoes',
      data: null,
      method: 'GET'
    },
    {
      name: 'دردشة مبسطة',
      endpoint: '/api/chat-simple/shoes',
      data: { message: 'مرحبا', sessionId: 'test-session' }
    },
    {
      name: 'فحص Supabase سريع',
      endpoint: '/api/test-supabase-quick',
      data: null,
      method: 'GET'
    }
  ]

  const runTest = async (test: any) => {
    if (test.method === 'GET') {
      setLoading(true)
      try {
        const response = await fetch(test.endpoint)
        const result = await response.json()
        setResults({
          status: response.status,
          statusText: response.statusText,
          data: result
        })
      } catch (error) {
        setResults({
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      } finally {
        setLoading(false)
      }
    } else {
      await testEndpoint(test.endpoint, test.data)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">🧪 اختبار API</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {tests.map((test, index) => (
            <Card key={index} className="p-6">
              <h3 className="text-lg font-semibold mb-4">{test.name}</h3>
              <p className="text-sm text-gray-600 mb-4">
                <code className="bg-gray-100 px-2 py-1 rounded">
                  {test.method || 'POST'} {test.endpoint}
                </code>
              </p>
              {test.data && (
                <pre className="text-xs bg-gray-100 p-2 rounded mb-4 overflow-x-auto">
                  {JSON.stringify(test.data, null, 2)}
                </pre>
              )}
              <Button
                onClick={() => runTest(test)}
                disabled={loading}
                className="w-full"
              >
                {loading ? 'جاري الاختبار...' : 'اختبار'}
              </Button>
            </Card>
          ))}
        </div>

        {results && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">📋 النتائج</h3>
            {results.error ? (
              <div className="bg-red-50 border border-red-200 rounded p-4">
                <p className="text-red-800 font-semibold">خطأ:</p>
                <p className="text-red-600">{results.error}</p>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-4 mb-4">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    results.status >= 200 && results.status < 300 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {results.status} {results.statusText}
                  </span>
                </div>
                <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-sm">
                  {JSON.stringify(results.data, null, 2)}
                </pre>
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  )
} 