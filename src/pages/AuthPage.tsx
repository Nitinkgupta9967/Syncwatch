import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  updateProfile
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { ArrowLeft, Chrome } from 'lucide-react';
import './AuthPage.css';

export const AuthPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const isSignupParam = searchParams.get('signup') === 'true';
  const [isSignup, setIsSignup] = useState(isSignupParam);
  
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (isSignup) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        if (username.trim()) {
           await updateProfile(userCredential.user, { displayName: username });
        }
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      navigate('/dashboard');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to authenticate');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError('');
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      navigate('/dashboard');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to authenticate with Google');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="blob-container">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
      </div>
      
      <Link to="/" className="auth-back-link">
        <ArrowLeft size={20} /> Home
      </Link>

      <div className="auth-container animate-fade-in">
        <div className="auth-brand">
          <div className="auth-logo-box glass-card">
            <span className="logo-emoji">✨</span>
          </div>
          <h2 className="auth-title-text">SyncAnime</h2>
        </div>

        <div className="auth-card-wrap glass-card">
          <div className="auth-header">
            <h3>{isSignup ? 'Start Your Journey' : 'Welcome Back'}</h3>
            <p>{isSignup ? 'Create an account to host your first party.' : 'Log in to rejoin your anime community.'}</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            {error && <div className="auth-error-pill">{error}</div>}
            {isSignup && (
              <div className="input-group">
                <label>Username</label>
                <input 
                  placeholder="e.g. AnimeFan_99" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required 
                />
              </div>
            )}
            <div className="input-group">
              <label>Email Address</label>
              <input 
                type="email" 
                placeholder="you@email.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required 
              />
            </div>
            <div className="input-group">
              <label>Password</label>
              <input 
                type="password" 
                placeholder="••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required 
              />
            </div>
            
            <button type="submit" className="btn-primary auth-submit" disabled={isLoading}>
              {isLoading ? 'Processing...' : (isSignup ? 'Create Account' : 'Sign In')}
            </button>
          </form>

          <div className="auth-divider">
            <span>or</span>
          </div>

          <button className="btn-social glass-card" onClick={handleGoogleLogin} disabled={isLoading}>
            <Chrome size={20} /> Continue with Google
          </button>

          <div className="auth-footer">
            <p>
              {isSignup ? 'Already have an account?' : "New to SyncAnime?"}
              <button 
                type="button" 
                className="auth-toggle-btn" 
                onClick={() => setIsSignup(!isSignup)}
              >
                {isSignup ? 'Sign in' : 'Create one for free'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
