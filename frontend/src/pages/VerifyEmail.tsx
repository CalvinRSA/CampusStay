// src/pages/VerifyEmail.tsx
import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2, Home } from 'lucide-react';
import { API_BASE } from '../utils/api';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [debugInfo, setDebugInfo] = useState('');

  useEffect(() => {
    console.log('=== EMAIL VERIFICATION STARTED ===');
    console.log('Token from URL:', token);
    console.log('Full URL:', window.location.href);

    if (!token) {
      console.error('No token found in URL');
      setStatus('error');
      setMessage('Invalid verification link. No token provided.');
      setDebugInfo('Token missing from URL parameters');
      return;
    }

    const verify = async () => {
      try {
        console.log('Making verification request...');
        const url = `${API_BASE}/auth/verify-email?token=${encodeURIComponent(token)}`;
        console.log('Request URL:', url);

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        console.log('Response status:', response.status);
        console.log('Response ok:', response.ok);

        const data = await response.json();
        console.log('Response data:', data);

        if (!response.ok) {
          throw new Error(data.detail || data.message || `Server returned ${response.status}`);
        }

        // Check for success
        if (data.message && (data.message.includes('verified') || data.message.includes('successful'))) {
          console.log('✅ Verification successful!');
          setStatus('success');
          setMessage(data.message);
          
          // Redirect to home page after 3 seconds
          setTimeout(() => {
            console.log('Redirecting to home page...');
            navigate('/');
          }, 3000);
        } else {
          throw new Error('Unexpected response from server');
        }

      } catch (err: any) {
        console.error('❌ Verification failed:', err);
        setStatus('error');
        setMessage(err.message || 'Verification failed. The link may have expired.');
        setDebugInfo(`Error: ${err.toString()}`);
      }
    };

    verify();
  }, [token, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center">
              <Home className="w-7 h-7 text-white" />
            </div>
            <span className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-red-700 bg-clip-text text-transparent">
              CampusStay
            </span>
          </div>
        </div>

        {/* Verification Status Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-10 text-center">
          {status === 'loading' && (
            <>
              <Loader2 className="w-16 h-16 animate-spin text-orange-600 mx-auto mb-6" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Verifying Your Email...</h2>
              <p className="text-gray-600">Please wait while we verify your account.</p>
            </>
          )}
          
          {status === 'success' && (
            <>
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-12 h-12 text-green-600" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Email Verified! 🎉</h2>
              <p className="text-lg text-gray-700 mb-4">{message}</p>
              <p className="text-sm text-gray-500">Redirecting to login page...</p>
            </>
          )}
          
          {status === 'error' && (
            <>
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <XCircle className="w-12 h-12 text-red-600" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Verification Failed</h2>
              <p className="text-lg text-gray-700 mb-6">{message}</p>
              
              {/* Debug Info */}
              {debugInfo && (
                <div className="mb-6 p-4 bg-gray-100 rounded-lg text-left">
                  <p className="text-xs text-gray-600 font-mono break-all">{debugInfo}</p>
                </div>
              )}
              
              <button
                onClick={() => navigate('/')}
                className="bg-gradient-to-r from-orange-500 to-red-600 text-white px-8 py-3 rounded-lg font-bold hover:shadow-lg transition flex items-center gap-2 mx-auto"
              >
                <Home className="w-5 h-5" /> Back to Home
              </button>
            </>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-gray-500 text-sm mt-8">
          © 2025 CampusStay - Tshwane University of Technology
        </p>
      </div>
    </div>
  );
}