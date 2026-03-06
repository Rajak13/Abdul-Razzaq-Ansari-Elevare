'use client';

import { useState } from 'react';

export default function TestApiPage() {
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const testApi = async () => {
    setLoading(true);
    setResult('Testing...');

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
      
      setResult(`API URL: ${apiUrl}\n\nTesting registration...`);

      const response = await fetch(`${apiUrl}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: `test${Date.now()}@example.com`,
          password: 'Test123!@#',
          name: 'Test User',
        }),
      });

      const data = await response.json();

      setResult(
        `✅ Success!\n\n` +
        `Status: ${response.status}\n` +
        `API URL: ${apiUrl}\n` +
        `Response: ${JSON.stringify(data, null, 2)}`
      );
    } catch (error: any) {
      setResult(
        `❌ Error!\n\n` +
        `Message: ${error.message}\n` +
        `Error: ${JSON.stringify(error, null, 2)}`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>API Connection Test</h1>
      <p>This page tests the connection from Vercel frontend to Render backend.</p>
      
      <button
        onClick={testApi}
        disabled={loading}
        style={{
          background: '#0070f3',
          color: 'white',
          border: 'none',
          padding: '10px 20px',
          borderRadius: '5px',
          cursor: loading ? 'not-allowed' : 'pointer',
          marginBottom: '20px',
        }}
      >
        {loading ? 'Testing...' : 'Test Registration API'}
      </button>

      {result && (
        <pre
          style={{
            background: '#f5f5f5',
            padding: '15px',
            borderRadius: '5px',
            overflow: 'auto',
            whiteSpace: 'pre-wrap',
          }}
        >
          {result}
        </pre>
      )}
    </div>
  );
}
