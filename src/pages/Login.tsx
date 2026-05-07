import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LogIn, CheckSquare, AlertCircle, UserPlus, Mail, Lock, User as UserIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Navigate } from 'react-router-dom';
import { cn } from '../lib/utils';

type AuthMode = 'login' | 'signup';

export default function Login() {
  const { login, loginWithEmail, signupWithEmail, user } = useAuth();
  const [mode, setMode] = useState<AuthMode>('login');
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  
  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleGoogleLogin = async () => {
    if (isAuthenticating) return;
    setIsAuthenticating(true);
    setError(null);
    try {
      await login();
    } catch (err: any) {
      console.error('Google login error:', err);
      handleAuthError(err);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isAuthenticating) return;
    
    setIsAuthenticating(true);
    setError(null);

    try {
      if (mode === 'signup') {
        if (!name.trim()) throw new Error('name-required');
        await signupWithEmail(name, email, password);
      } else {
        await loginWithEmail(email, password);
      }
    } catch (err: any) {
      console.error('Email auth error:', err);
      handleAuthError(err);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleAuthError = (err: any) => {
    const code = err.code || err.message;
    switch (code) {
      case 'auth/popup-blocked':
        setError('Popup blocked by your browser. Please allow popups.');
        break;
      case 'auth/cancelled-popup-request':
      case 'auth/popup-closed-by-user':
        setError('Sign-in was cancelled.');
        break;
      case 'auth/email-already-in-use':
        setError('Email already in use. Please login instead.');
        break;
      case 'auth/invalid-email':
        setError('Invalid email address format.');
        break;
      case 'auth/weak-password':
        setError('Password is too weak (min 6 characters).');
        break;
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        setError('Invalid email or password.');
        break;
      case 'name-required':
        setError('Please enter your full name.');
        break;
      default:
        setError('An unexpected error occurred. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 overflow-hidden relative p-4">
      {/* Abstract background blobs */}
      <div className="absolute top-0 -left-4 w-72 h-72 bg-indigo-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
      <div className="absolute top-0 -right-4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
      <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md z-10"
      >
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-8 md:p-10 rounded-[3rem] shadow-2xl">
          <div className="flex flex-col items-center mb-10">
            <motion.div 
              whileHover={{ scale: 1.05, rotate: 5 }}
              className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg mb-6"
            >
              <CheckSquare className="text-white" size={32} />
            </motion.div>
            <h1 className="text-3xl font-black text-white mb-2 tracking-tight">TeamFlow Pro</h1>
            <p className="text-slate-400 text-center text-sm font-medium">Streamline your team's workflow with modern project management.</p>
          </div>

          <div className="flex bg-white/5 p-1 rounded-2xl mb-8">
            <button 
              onClick={() => setMode('login')}
              className={cn(
                "flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all",
                mode === 'login' ? "bg-white text-slate-900 shadow-md" : "text-white hover:bg-white/5"
              )}
            >
              Login
            </button>
            <button 
              onClick={() => setMode('signup')}
              className={cn(
                "flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all",
                mode === 'signup' ? "bg-white text-slate-900 shadow-md" : "text-white hover:bg-white/5"
              )}
            >
              Signup
            </button>
          </div>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-6 overflow-hidden"
              >
                <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-start gap-3 text-rose-200 text-sm">
                  <AlertCircle size={18} className="shrink-0 mt-0.5" />
                  <p>{error}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleEmailAuth} className="space-y-4">
            {mode === 'signup' && (
              <div className="relative">
                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input 
                  type="text" 
                  placeholder="Full Name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 pl-12 pr-4 py-4 rounded-2xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-medium"
                />
              </div>
            )}
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input 
                type="email" 
                placeholder="Email Address"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white/5 border border-white/10 pl-12 pr-4 py-4 rounded-2xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-medium"
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input 
                type="password" 
                placeholder="Password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/10 pl-12 pr-4 py-4 rounded-2xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-medium"
              />
            </div>

            <button
              type="submit"
              disabled={isAuthenticating}
              className={cn(
                "w-full flex items-center justify-center gap-3 bg-indigo-600 text-white py-4 px-6 rounded-2xl font-bold transition-all transform mt-6 shadow-xl shadow-indigo-500/20",
                isAuthenticating ? "opacity-50 cursor-not-allowed" : "hover:bg-indigo-500 hover:scale-[1.02] active:scale-[0.98]"
              )}
            >
              {isAuthenticating ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : mode === 'login' ? (
                <LogIn size={20} />
              ) : (
                <UserPlus size={20} />
              )}
              {isAuthenticating ? 'Processing...' : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <div className="relative my-10">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase tracking-widest font-black">
              <span className="bg-transparent px-4 text-slate-500">Or continue with</span>
            </div>
          </div>

          <button
            onClick={handleGoogleLogin}
            disabled={isAuthenticating}
            className={cn(
              "w-full flex items-center justify-center gap-3 bg-white text-slate-900 py-4 px-6 rounded-2xl font-bold transition-all transform shadow-lg",
              isAuthenticating ? "opacity-50 cursor-not-allowed" : "hover:bg-slate-100 hover:scale-[1.02] active:scale-[0.98]"
            )}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Google Work ID
          </button>
          
          <div className="mt-8 pt-8 border-t border-white/10 flex justify-center gap-6 grayscale opacity-30">
            <div className="text-white font-black text-[10px] italic uppercase tracking-[0.2em]">Verified Ops</div>
            <div className="text-white font-black text-[10px] italic uppercase tracking-[0.2em]">AES-256 SSL</div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
