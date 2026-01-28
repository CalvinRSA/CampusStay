import { useState } from 'react';
import { Home, Shield, Clock, MapPin, Users, ChevronRight, Menu, X, Mail } from 'lucide-react';
import { login, registerStudent } from '../utils/auth';
import { fetcher } from '../utils/api';

export default function LandingPage() {
  const [showLogin, setShowLogin] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [signupRole, setSignupRole] = useState<'student' | 'admin' | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Login
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);

  // Forgot Password
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);

  // Student signup
  const [studentData, setStudentData] = useState({
    full_name: '', email: '', phone_number: '', student_number: '', campus: '', password: '',
  });
  const [signupLoading, setSignupLoading] = useState(false);

  const campuses = ['Soshanguve North','Soshanguve South','Garankuwa Campus','Arts Campus','Arcadia Campus','Pretoria Campus'];

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoginLoading(true);

    try {
      console.log('=== LOGIN STARTED ===');
      const result = await login({ email: loginData.email, password: loginData.password });
      console.log('Login result:', result);
      
      showNotification('Login successful!', 'success');
      
      // Close modal
      setShowLogin(false);
      
      console.log('Login complete, waiting for redirect...');
      console.log('Current localStorage user:', localStorage.getItem('user'));
      console.log('Current localStorage token:', localStorage.getItem('access_token')?.substring(0, 20) + '...');
      
      // Force a small delay to ensure state updates
      setTimeout(() => {
        console.log('Checking if redirect happened...');
        console.log('Current path:', window.location.pathname);
        
        // If still on home page after 500ms, manually redirect
        if (window.location.pathname === '/') {
          const user = JSON.parse(localStorage.getItem('user') || '{}');
          console.log('Manual redirect for user:', user);
          if (user.role === 'admin') {
            console.log('Forcing redirect to /admin');
            window.location.href = '/admin';
          } else if (user.role === 'student') {
            console.log('Forcing redirect to /student');
            window.location.href = '/student';
          }
        }
      }, 500);
      
    } catch (err: any) {
      console.error('Login error:', err);
      setLoginError(err.message || "Incorrect email or password");
      showNotification(err.message || "Incorrect email or password", 'error');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotPasswordLoading(true);

    try {
      await fetcher('/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotPasswordEmail }),
      });

      showNotification(
        'If an account exists with that email, a password reset link has been sent. Please check your inbox.',
        'success'
      );
      setShowForgotPassword(false);
      setForgotPasswordEmail('');
    } catch (err: any) {
      showNotification(err.message || 'Failed to send reset email', 'error');
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  const handleStudentSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!/^\d{9}$/.test(studentData.student_number)) {
      showNotification("Student number must be exactly 9 digits", 'error');
      return;
    }

    setSignupLoading(true);

    try {
      await registerStudent(studentData);
      showNotification("Registered successfully! Check your email to verify your account.", 'success');
      setShowSignup(false);
      setSignupRole(null);
      setStudentData({
        full_name: '', email: '', phone_number: '',
        student_number: '', campus: '', password: ''
      });
    } catch (err: any) {
      showNotification(err.message || "Registration failed", 'error');
    } finally {
      setSignupLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Notification Toast */}
      {notification && (
        <div className={`fixed top-4 right-4 z-[60] px-6 py-4 rounded-lg shadow-lg transform transition-all duration-300 ${
          notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'
        } text-white font-medium max-w-md`}>
          {notification.message}
        </div>
      )}

      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/95 backdrop-blur-sm shadow-sm z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center">
                <Home className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-red-700 bg-clip-text text-transparent">
                CampusStay
              </span>
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-gray-700 hover:text-orange-600 transition">Features</a>
              <a href="#how-it-works" className="text-gray-700 hover:text-orange-600 transition">How It Works</a>
              <a href="#contact" className="text-gray-700 hover:text-orange-600 transition">Contact</a>
              <button onClick={() => setShowLogin(true)} className="text-orange-600 hover:text-orange-700 font-medium transition">
                Log In
              </button>
              <button onClick={() => setShowSignup(true)} className="bg-gradient-to-r from-orange-500 to-red-600 text-white px-6 py-2 rounded-lg hover:shadow-lg transition transform hover:scale-105">
                Get Started
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button onClick={() => setMobileMenu(!mobileMenu)} className="md:hidden text-gray-700">
              {mobileMenu ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenu && (
            <div className="md:hidden py-4 space-y-3">
              <a href="#features" className="block text-gray-700 hover:text-orange-600">Features</a>
              <a href="#how-it-works" className="block text-gray-700 hover:text-orange-600">How It Works</a>
              <a href="#contact" className="block text-gray-700 hover:text-orange-600">Contact</a>
              <button onClick={() => setShowLogin(true)} className="block w-full text-left text-orange-600 font-medium">
                Log In
              </button>
              <button onClick={() => setShowSignup(true)} className="block w-full bg-gradient-to-r from-orange-500 to-red-600 text-white px-6 py-2 rounded-lg">
                Get Started
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 bg-gradient-to-br from-orange-50 via-white to-red-50">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="inline-block bg-orange-100 text-orange-700 px-4 py-2 rounded-full text-sm font-medium">
                For TUT Students
              </div>
              <h1 className="text-5xl md:text-6xl font-bold text-gray-900 leading-tight">
                Find Your Perfect
                <span className="block bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                  Student Home
                </span>
              </h1>
              <p className="text-xl text-gray-600">
                Discover verified, NSFAS Accredited accommodation For Tshwane University of Technology Campuses Around Pretoria. Safe, convenient, and designed for students.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={() => setShowSignup(true)}
                  className="bg-gradient-to-r from-orange-500 to-red-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:shadow-xl transition transform hover:scale-105 flex items-center justify-center"
                >
                  Start Searching
                  <ChevronRight className="w-5 h-5 ml-2" />
                </button>
                <button className="border-2 border-orange-600 text-orange-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-orange-50 transition">
                  Learn More
                </button>
              </div>
              <div className="flex items-center space-x-8 pt-4">
                <div>
                  <div className="text-3xl font-bold text-gray-900">500+</div>
                  <div className="text-gray-600">Listings</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-gray-900">2,000+</div>
                  <div className="text-gray-600">Happy Students</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-gray-900">98%</div>
                  <div className="text-gray-600">Satisfaction</div>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="bg-gradient-to-br from-orange-400 to-red-600 rounded-3xl p-8 shadow-2xl transform rotate-3 hover:rotate-0 transition duration-500">
                <div className="bg-white rounded-2xl p-6 transform -rotate-3 hover:rotate-0 transition duration-500">
                  <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl mb-4 flex items-center justify-center">
                    <Home className="w-20 h-20 text-orange-500" />
                  </div>
                  <div className="space-y-3">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    <div className="flex justify-between items-center pt-2">
                      <div className="h-8 bg-orange-500 rounded w-24"></div>
                      <div className="h-8 bg-gray-200 rounded-full w-8"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Why Choose CampusStay?</h2>
            <p className="text-xl text-gray-600">Everything you need to find your ideal student accommodation</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-gradient-to-br from-orange-50 to-white p-8 rounded-2xl border border-orange-100 hover:shadow-xl transition transform hover:-translate-y-2">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center mb-6">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Verified Listings</h3>
              <p className="text-gray-600">All properties are verified and inspected to ensure safety and quality for TUT students.</p>
            </div>
            <div className="bg-gradient-to-br from-red-50 to-white p-8 rounded-2xl border border-red-100 hover:shadow-xl transition transform hover:-translate-y-2">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center mb-6">
                <MapPin className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Near Campus</h3>
              <p className="text-gray-600">Find accommodation within walking distance or near convenient transport routes to TUT.</p>
            </div>
            <div className="bg-gradient-to-br from-orange-50 to-white p-8 rounded-2xl border border-orange-100 hover:shadow-xl transition transform hover:-translate-y-2">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center mb-6">
                <Clock className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Quick Booking</h3>
              <p className="text-gray-600">Apply and secure your accommodation in minutes with our streamlined booking process.</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 px-4 bg-gradient-to-br from-gray-50 to-orange-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">How It Works</h2>
            <p className="text-xl text-gray-600">Three simple steps to your new home</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-6 text-white text-3xl font-bold">1</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Sign Up</h3>
              <p className="text-gray-600">Create your free account with your TUT student email in seconds.</p>
            </div>
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-6 text-white text-3xl font-bold">2</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Browse & Search</h3>
              <p className="text-gray-600">Filter by price, location, amenities, and find your perfect match.</p>
            </div>
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-6 text-white text-3xl font-bold">3</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Book & Move In</h3>
              <p className="text-gray-600">Apply online, get approved, and move into your new student home.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-orange-500 to-red-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">Ready to Find Your Home?</h2>
          <p className="text-xl text-orange-100 mb-8">Join thousands of TUT students who found their perfect accommodation through CampusStay</p>
          <button onClick={() => setShowSignup(true)} className="bg-white text-orange-600 px-10 py-4 rounded-lg text-lg font-semibold hover:shadow-2xl transition transform hover:scale-105">
            Get Started for Free
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="bg-gray-900 text-white py-12 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center">
              <Home className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold">CampusStay</span>
          </div>
          <p className="text-gray-400 mb-6">Student accommodation made simple for TUT students</p>
          
          {/* Contact Information */}
          <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto mb-6">
            <div className="text-gray-300">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <Mail className="w-5 h-5 text-orange-500" />
                <span className="font-semibold">Email Us</span>
              </div>
              <div className="space-y-1 text-sm">
                <p>
                  <a href="mailto:info@campusstay.co.za" className="hover:text-orange-500 transition">
                    info@campusstay.co.za
                  </a>
                </p>
                <p>
                  <a href="mailto:molakengcalvin@gmail.com" className="hover:text-orange-500 transition">
                    molakengcalvin@gmail.com
                  </a>
                </p>
              </div>
            </div>
            <div className="text-gray-300">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <Users className="w-5 h-5 text-orange-500" />
                <span className="font-semibold">Call Us</span>
              </div>
              <div className="text-sm">
                <p>
                  <a href="tel:+27710506325" className="hover:text-orange-500 transition">
                    +27 71 050 6325
                  </a>
                </p>
              </div>
            </div>
          </div>
          
          <p className="text-gray-500 text-sm">© 2025 CampusStay. All rights reserved.</p>
        </div>
      </footer>

      {/* Login Modal */}
      {showLogin && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-8 relative">
            <button
              onClick={() => setShowLogin(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h2>
              <p className="text-gray-600">Log in to your CampusStay account</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Official Email/TUT Email
                </label>
                <input
                  type="email"
                  value={loginData.email}
                  onChange={(e) =>
                    setLoginData({ ...loginData, email: e.target.value })
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                  placeholder="your.email@gmail.com"
                  required
                  disabled={loginLoading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={loginData.password}
                  onChange={(e) =>
                    setLoginData({ ...loginData, password: e.target.value })
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                  placeholder="Enter your password"
                  required
                  disabled={loginLoading}
                />
              </div>

              {loginError && (
                <p className="text-red-600 text-sm text-center">{loginError}</p>
              )}

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center">
                  <input type="checkbox" className="mr-2" disabled={loginLoading} />
                  <span className="text-gray-600">Remember me</span>
                </label>
                <button 
                  onClick={() => {
                    setShowLogin(false);
                    setShowForgotPassword(true);
                  }}
                  className="text-orange-600 hover:text-orange-700"
                >
                  Forgot password?
                </button>
              </div>

              <button
                onClick={handleLogin}
                disabled={loginLoading}
                className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white py-3 rounded-lg font-semibold hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {loginLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Logging in...
                  </>
                ) : (
                  'Log In'
                )}
              </button>
            </div>

            <p className="text-center text-gray-600 mt-6">
              Don't have an account?{' '}
              <button
                onClick={() => {
                  setShowLogin(false);
                  setShowSignup(true);
                }}
                className="text-orange-600 hover:text-orange-700 font-semibold"
                disabled={loginLoading}
              >
                Sign up
              </button>
            </p>
          </div>
        </div>
      )}

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-8 relative">
            <button
              onClick={() => setShowForgotPassword(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Forgot Password?</h2>
              <p className="text-gray-600">Enter your email and we'll send you a reset link</p>
            </div>

            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Official Email/TUT Email
                </label>
                <input
                  type="email"
                  value={forgotPasswordEmail}
                  onChange={(e) => setForgotPasswordEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                  placeholder="your.email@gmail.com"
                  required
                  disabled={forgotPasswordLoading}
                />
              </div>

              <button
                type="submit"
                disabled={forgotPasswordLoading}
                className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white py-3 rounded-lg font-semibold hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {forgotPasswordLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Sending...
                  </>
                ) : (
                  'Send Reset Link'
                )}
              </button>
            </form>

            <p className="text-center text-gray-600 mt-6">
              Remember your password?{' '}
              <button
                onClick={() => {
                  setShowForgotPassword(false);
                  setShowLogin(true);
                }}
                className="text-orange-600 hover:text-orange-700 font-semibold"
                disabled={forgotPasswordLoading}
              >
                Log in
              </button>
            </p>
          </div>
        </div>
      )}

      {/* Signup Modal - Role-Based */}
      {showSignup && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-8 relative my-8">
            <button
              onClick={() => {
                setShowSignup(false);
                setSignupRole(null);
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
              disabled={signupLoading}
            >
              <X className="w-6 h-6" />
            </button>

            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Join CampusStay</h2>
              <p className="text-gray-600">Create your account to get started</p>
            </div>

            {/* Role Selection */}
            {!signupRole ? (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 text-center">Who are you?</h3>
                <div className="grid grid-cols-1 gap-4">
                  <button
                    onClick={() => setSignupRole('student')}
                    className="p-6 border-2 border-orange-200 rounded-xl hover:border-orange-500 hover:bg-orange-50 transition flex items-center justify-center space-x-3"
                  >
                    <Users className="w-6 h-6 text-orange-600" />
                    <span className="font-medium">I'm a Student</span>
                  </button>
                  <button
                    onClick={() => setSignupRole('admin')}
                    className="p-6 border-2 border-gray-200 rounded-xl hover:border-gray-400 hover:bg-gray-50 transition flex items-center justify-center space-x-3"
                  >
                    <Shield className="w-6 h-6 text-gray-600" />
                    <span className="font-medium">I'm an Admin / Manager</span>
                  </button>
                </div>
              </div>
            ) : signupRole === 'student' ? (
              /* Student Signup Form */
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                  <input
                    type="text"
                    value={studentData.full_name}
                    onChange={(e) => setStudentData({ ...studentData, full_name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                    placeholder="John Doe"
                    required
                    disabled={signupLoading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Official Email/TUT Email</label>
                  <input
                    type="email"
                    value={studentData.email}
                    onChange={(e) => setStudentData({ ...studentData, email: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                    placeholder="your.email@gmail.com"
                    required
                    disabled={signupLoading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Student Number (9 digits)</label>
                  <input
                    type="text"
                    value={studentData.student_number}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 9);
                      setStudentData({ ...studentData, student_number: value });
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                    placeholder="123456789"
                    maxLength={9}
                    required
                    disabled={signupLoading}
                  />
                  {studentData.student_number && studentData.student_number.length !== 9 && (
                    <p className="text-red-500 text-xs mt-1">Must be exactly 9 digits</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Campus</label>
                  <select
                    value={studentData.campus}
                    onChange={(e) => setStudentData({ ...studentData, campus: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                    required
                    disabled={signupLoading}
                  >
                    <option value="">Select your campus</option>
                    {campuses.map((campus) => (
                      <option key={campus} value={campus}>
                        {campus}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                  <input
                    type="tel"
                    value={studentData.phone_number}
                    onChange={(e) => setStudentData({ ...studentData, phone_number: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                    placeholder="+27 12 345 6789"
                    required
                    disabled={signupLoading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                  <input
                    type="password"
                    value={studentData.password}
                    onChange={(e) => setStudentData({ ...studentData, password: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                    placeholder="Create a strong password"
                    required
                    disabled={signupLoading}
                  />
                </div>

                <div className="flex items-start">
                  <input type="checkbox" className="mt-1 mr-2" required disabled={signupLoading} />
                  <span className="text-sm text-gray-600">I agree to the Terms of Service and Privacy Policy</span>
                </div>

                <button
                  onClick={handleStudentSignup}
                  disabled={signupLoading}
                  className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white py-3 rounded-lg font-semibold hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {signupLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Creating Account...
                    </>
                  ) : (
                    'Create Student Account'
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setSignupRole(null)}
                  className="w-full text-sm text-gray-600 hover:text-gray-800"
                  disabled={signupLoading}
                >
                  Back
                </button>
              </div>
            ) : (
              /* Admin Signup (Invite Only) */
              <div className="text-center py-8">
                <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Admin registration is by invite only.</p>
                <button
                  onClick={() => {
                    setSignupRole(null);
                    setShowSignup(false);
                  }}
                  className="mt-4 text-orange-600 hover:text-orange-700 font-medium"
                >
                  Back to Login
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}