// src/pages/VerifyEmail.tsx
import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2, Home } from 'lucide-react';
import { fetcher } from '../utils/api';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Invalid verification link. No token provided.');
      return;
    }

    const verify = async () => {
      try {
        const res = await fetcher(`/auth/verify-email?token=${encodeURIComponent(token)}`);
        
        // Check for success message
        if (res.message && (res.message.includes('verified') || res.message.includes('successful'))) {
          setStatus('success');
          setMessage('Email verified successfully! You can now log in.');
          
          // Redirect to home/login page after 3 seconds
          setTimeout(() => {
            navigate('/');
          }, 3000);
        } else {
          throw new Error(res.detail || 'Verification failed');
        }
      } catch (err: any) {
        setStatus('error');
        setMessage(err.message || 'Verification link has expired or is invalid. Please request a new verification email.');
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
          © 2025 CampusStay - For Tshwane University of Technology
        </p>
      </div>
    </div>
  );
}