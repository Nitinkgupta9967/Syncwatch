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
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Tv, ArrowLeft, Chrome } from 'lucide-react';
import './AuthPage.css';

export const AuthPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const isSignupParam = searchParams.get('signup') === 'true';
  const [isSignup, setIsSignup] = useState(isSignupParam);
  
  // Form State
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
        // Only update profile if username is provided
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
      <div className="auth-bg-shapes">
        <div className="shape shape-primary"></div>
        <div className="shape shape-secondary"></div>
      </div>
      
      <Link to="/" className="auth-back-link">
        <ArrowLeft size={20} /> Back to Home
      </Link>

      <div className="auth-container animate-fade-in">
        <div className="auth-brand">
          <div className="auth-logo">
            <Tv size={32} color="white" />
          </div>
          <h2 className="auth-title">SyncAnime</h2>
        </div>

        <Card glass className="auth-card">
          <div className="auth-header">
            <h3>{isSignup ? 'Create an account' : 'Welcome back'}</h3>
            <p>{isSignup ? 'Join the community and start watching together.' : 'Log in to access your watch rooms.'}</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            {error && <div className="auth-error-message" style={{ color: '#ff3b30', background: 'rgba(255,59,48,0.1)', padding: '10px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' }}>{error}</div>}
            {isSignup && (
              <Input 
                label="Username" 
                placeholder="e.g. OtakuKing99" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required 
                fullWidth 
              />
            )}
            <Input 
              label="Email" 
              type="email" 
              placeholder="you@example.com" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required 
              fullWidth 
            />
            <Input 
              label="Password" 
              type="password" 
              placeholder="••••••••" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
              fullWidth 
            />
            
            <Button type="submit" fullWidth size="lg" disabled={isLoading}>
              {isLoading ? 'Please wait...' : (isSignup ? 'Sign Up' : 'Log In')}
            </Button>
          </form>

          <div className="auth-divider">
            <span>or continue with</span>
          </div>

          <div className="auth-social">
            <Button variant="outline" fullWidth type="button" onClick={handleGoogleLogin} disabled={isLoading}>
              <Chrome size={18} /> Google
            </Button>
          </div>

          <div className="auth-footer">
            <p>
              {isSignup ? 'Already have an account?' : "Don't have an account?"}
              <button 
                type="button" 
                className="auth-toggle" 
                onClick={() => setIsSignup(!isSignup)}
              >
                {isSignup ? 'Log in here' : 'Sign up for free'}
              </button>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};
