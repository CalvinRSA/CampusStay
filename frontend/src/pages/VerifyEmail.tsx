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
      setMessage('Invalid verification link.');
      return;
    }

    const verify = async () => {
      try {
        const res = await fetcher(`/auth/verify-email?token=${token}`);
        if (res.message?.includes('verified')) {
          setStatus('success');
          setMessage('Email verified successfully! Redirecting...');
          setTimeout(() => navigate('/student/dashboard'), 3000);
        } else {
          throw new Error(res.detail || 'Verification failed');
        }
      } catch (err: any) {
        setStatus('error');
        setMessage(err.message || 'Link expired or invalid');
      }
    };

    verify();
  }, [token, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-10 max-w-md w-full text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="w-16 h-16 animate-spin text-orange-600 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Verifying Email...</h2>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-6" />
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Verified! 🎉</h2>
            <p className="text-lg text-gray-700">{message}</p>
          </>
        )}
        {status === 'error' && (
          <>
            <XCircle className="w-20 h-20 text-red-500 mx-auto mb-6" />
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Verification Failed</h2>
            <p className="text-lg text-gray-700 mb-6">{message}</p>
            <button
              onClick={() => navigate('/')}
              className="bg-orange-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-orange-700 transition flex items-center gap-2 mx-auto"
            >
              <Home className="w-5 h-5" /> Back to Home
            </button>
          </>
        )}
      </div>
    </div>
  );
}