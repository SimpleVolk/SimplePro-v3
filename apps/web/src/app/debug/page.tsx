'use client';

import React, { useState } from 'react';
import { getApiUrl } from '../../lib/config';

// Force dynamic rendering for debug page
export const dynamic = 'force-dynamic';

export default function DebugPage() {
  const [testResult, setTestResult] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const testApiConnection = async () => {
    setIsLoading(true);
    setTestResult('Testing API connection...\n\n');

    try {
      // Test 1: Environment variables
      const envTest = {
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
        NODE_ENV: process.env.NODE_ENV,
        windowDefined: typeof window !== 'undefined'
      };

      setTestResult(prev => prev + `1. Environment Variables:\n${JSON.stringify(envTest, null, 2)}\n\n`);

      // Test 2: URL construction
      const apiUrl = getApiUrl('auth/login');
      setTestResult(prev => prev + `2. Constructed URL: ${apiUrl}\n\n`);

      // Test 3: Simple GET to health endpoint
      setTestResult(prev => prev + `3. Testing GET /api/health...\n`);

      const healthResponse = await fetch(getApiUrl('health'), {
        method: 'GET',
      });

      setTestResult(prev => prev + `Health check result: ${healthResponse.status} ${healthResponse.statusText}\n`);

      if (healthResponse.ok) {
        const healthData = await healthResponse.text();
        setTestResult(prev => prev + `Health response: ${healthData}\n\n`);
      }

      // Test 4: Login POST request
      setTestResult(prev => prev + `4. Testing POST /api/auth/login...\n`);

      const loginPayload = { username: 'admin', password: 'admin123' };
      const fetchOptions = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loginPayload),
        credentials: 'include' as RequestCredentials,
      };

      setTestResult(prev => prev + `Request options: ${JSON.stringify(fetchOptions, null, 2)}\n\n`);

      const loginResponse = await fetch(apiUrl, fetchOptions);

      setTestResult(prev => prev + `Login response status: ${loginResponse.status}\n`);
      setTestResult(prev => prev + `Login response headers: ${loginResponse.headers.get('content-type') || 'No content-type header'}\n`);

      if (loginResponse.ok) {
        const loginData = await loginResponse.json();
        setTestResult(prev => prev + `✅ Login successful!\n`);
        setTestResult(prev => prev + `Response data: ${JSON.stringify(loginData, null, 2)}\n`);
      } else {
        const errorText = await loginResponse.text();
        setTestResult(prev => prev + `❌ Login failed: ${errorText}\n`);
      }

    } catch (error) {
      setTestResult(prev => prev + `💥 Exception caught: ${error}\n`);

      if (error instanceof TypeError) {
        setTestResult(prev => prev + `Error type: ${error.name}\n`);
        setTestResult(prev => prev + `Error message: ${error.message}\n`);
        setTestResult(prev => prev + `Error stack: ${error.stack}\n`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>API Debug Page</h1>

      <button
        onClick={testApiConnection}
        disabled={isLoading}
        style={{
          padding: '10px 20px',
          marginBottom: '20px',
          backgroundColor: isLoading ? '#ccc' : '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: isLoading ? 'not-allowed' : 'pointer'
        }}
      >
        {isLoading ? 'Testing...' : 'Test API Connection'}
      </button>

      <pre style={{
        backgroundColor: '#f8f9fa',
        border: '1px solid #dee2e6',
        borderRadius: '4px',
        padding: '15px',
        whiteSpace: 'pre-wrap',
        maxHeight: '600px',
        overflow: 'auto'
      }}>
        {testResult}
      </pre>
    </div>
  );
}