// src/components/VerifyEmail.tsx
import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2, Home, LogIn } from 'lucide-react';

const API_BASE = 'https://campusstay-backend.onrender.com';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [countdown, setCountdown] = useState(5);
  const [canRedirect, setCanRedirect] = useState(false);

  // Main verification effect
  useEffect(() => {
    let executed = false;

    const verifyEmail = async () => {
      if (executed) return;
      executed = true;

      if (!token) {
        setStatus('error');
        setMessage('Invalid verification link. No token provided.');
        return;
      }

      try {
        const url = `${API_BASE}/auth/verify-email?token=${encodeURIComponent(token)}`;
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
        });

        const responseText = await response.text();

        let data;
        try {
          data = JSON.parse(responseText);
        } catch (e) {
          throw new Error('Server returned invalid response');
        }

        if (!response.ok) {
          throw new Error(data.detail || data.message || `Server error (${response.status})`);
        }

        const messageText = data.message || '';
        const isSuccess = 
          messageText.toLowerCase().includes('verified') || 
          messageText.toLowerCase().includes('successful') ||
          data.status === 'success' ||
          data.status === 'already_verified';

        if (isSuccess) {
          setStatus('success');
          setMessage(messageText || 'Email verified successfully!');
          setCanRedirect(true);
        } else {
          throw new Error('Verification failed with unexpected response');
        }

      } catch (error: any) {
        setStatus('error');
        setMessage(error.message || 'Verification failed');
      }
    };

    verifyEmail();
  }, [token]);

  // Countdown effect
  useEffect(() => {
    if (canRedirect && status === 'success') {
      const countdownInterval = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            navigate('/', { replace: true });
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(countdownInterval);
    }
  }, [canRedirect, status, navigate]);

  const handleManualRedirect = () => {
    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
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

        {/* Main Status Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-10 text-center mb-4">
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
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-green-800 mb-2">
                  <strong>✓ Success!</strong> Your email has been verified.
                </p>
                <p className="text-sm text-green-700">
                  {message}
                </p>
              </div>
              <p className="text-lg text-gray-700 mb-6">
                You can now log in and start applying for accommodation.
              </p>
              
              {/* Countdown Display */}
              {canRedirect && (
                <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-center space-x-3">
                    <Loader2 className="w-5 h-5 animate-spin text-orange-600" />
                    <span className="text-gray-700 font-medium">
                      Redirecting to login in <span className="text-2xl font-bold text-orange-600">{countdown}</span> second{countdown !== 1 ? 's' : ''}...
                    </span>
                  </div>
                </div>
              )}

              {/* Manual redirect button */}
              <button
                onClick={handleManualRedirect}
                className="bg-gradient-to-r from-orange-500 to-red-600 text-white px-8 py-3 rounded-lg font-bold hover:shadow-lg transition flex items-center gap-2 mx-auto"
              >
                <LogIn className="w-5 h-5" /> Go to Login Now
              </button>
            </>
          )}
          
          {status === 'error' && (
            <>
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <XCircle className="w-12 h-12 text-red-600" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Verification Failed</h2>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-left">
                <p className="text-sm text-red-800 mb-3">
                  <strong>Error:</strong> {message}
                </p>
                <div className="text-xs text-red-700 space-y-1">
                  <p><strong>Common reasons:</strong></p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Verification link has expired (older than 24 hours)</li>
                    <li>Email already verified - try logging in</li>
                    <li>Invalid or corrupted token</li>
                    <li>Network connection issue</li>
                  </ul>
                </div>
              </div>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={handleManualRedirect}
                  className="bg-gradient-to-r from-orange-500 to-red-600 text-white px-6 py-3 rounded-lg font-bold hover:shadow-lg transition flex items-center gap-2"
                >
                  <LogIn className="w-5 h-5" /> Try Login Anyway
                </button>
              </div>
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