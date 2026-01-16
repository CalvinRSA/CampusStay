// src/components/ResetPassword.tsx - FIXED TO USE API UTILS
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Home, Lock, CheckCircle, AlertCircle, LogIn, Loader2 } from 'lucide-react';
import { API_BASE } from '../utils/api';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [canRedirect, setCanRedirect] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Invalid or missing reset token');
    }
  }, [token]);

  // Separate countdown effect that only runs after successful reset
  useEffect(() => {
    if (canRedirect && success) {
      console.log('[RESET] Starting countdown for redirect...');
      
      const countdownInterval = setInterval(() => {
        setCountdown(prev => {
          console.log(`[RESET] Countdown: ${prev}`);
          
          if (prev <= 1) {
            clearInterval(countdownInterval);
            console.log('[RESET] Countdown complete, redirecting to login...');
            navigate('/', { replace: true });
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        console.log('[RESET] Cleaning up countdown interval');
        clearInterval(countdownInterval);
      };
    }
  }, [canRedirect, success, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!token) {
      setError('Invalid reset token');
      return;
    }

    setLoading(true);
    console.log('[RESET] Starting password reset...');

    try {
      console.log('[RESET] Sending reset request to backend...');
      // Use API_BASE from your api.ts file
      const response = await fetch(`${API_BASE}/auth/reset-password`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          token,
          new_password: password,
        }),
      });

      console.log(`[RESET] Response status: ${response.status}`);

      if (!response.ok) {
        const errorData = await response.json();
        console.log('[RESET] Error response:', errorData);
        throw new Error(errorData.detail || 'Failed to reset password');
      }

      const data = await response.json();
      console.log('[RESET] Success response:', data);
      console.log('[RESET] ✅ Password reset successful!');

      setSuccess(true);
      
      // Enable redirect only after successful reset
      console.log('[RESET] Enabling redirect capability...');
      setCanRedirect(true);

    } catch (err: any) {
      console.error('[RESET] ❌ Password reset failed:', err);
      setError(err.message || 'Failed to reset password. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  const handleManualRedirect = () => {
    console.log('[RESET] Manual redirect triggered');
    navigate('/', { replace: true });
  };

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

        {/* Success State */}
        {success ? (
          <div className="bg-white rounded-2xl p-8 shadow-xl border border-green-200">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Password Reset Successful! 🎉</h2>
              <p className="text-gray-600 mb-6">
                Your password has been reset successfully. You can now log in with your new password.
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
            </div>
          </div>
        ) : (
          /* Reset Password Form */
          <div className="bg-white rounded-2xl p-8 shadow-xl">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Reset Your Password</h2>
              <p className="text-gray-600">Enter your new password below</p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                  placeholder="Enter new password (min. 6 characters)"
                  required
                  disabled={loading || !token}
                  minLength={6}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                  placeholder="Confirm new password"
                  required
                  disabled={loading || !token}
                  minLength={6}
                />
              </div>

              <button
                type="submit"
                disabled={loading || !token}
                className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white py-3 rounded-lg font-semibold hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Resetting Password...
                  </>
                ) : (
                  'Reset Password'
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <button
                onClick={handleManualRedirect}
                className="text-orange-600 hover:text-orange-700 font-medium text-sm flex items-center gap-2 mx-auto"
              >
                <LogIn className="w-4 h-4" /> Back to Login
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-gray-500 text-sm mt-8">
          © 2025 CampusStay - Tshwane University of Technology
        </p>
      </div>
    </div>
  );
}