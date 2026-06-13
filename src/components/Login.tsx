import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Button } from './ui/Button';
import { Mail, Lock, ArrowRight, User, Globe } from 'lucide-react';

export function LoginScreen() {
  const { login, register, loginWithGoogle } = useAppStore();
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDesktop = typeof window !== 'undefined' && (
    !!(window as any).electronAPI ||
    (window as any).__TAURI__ || 
    (window as any).electron ||
    navigator.userAgent.toLowerCase().includes('electron') ||
    window.location.protocol === 'file:' ||
    window.location.protocol.startsWith('tauri')
  );

  useEffect(() => {
    if (isDesktop) {
      // Register the Electron IPC listener for Google OAuth redirect codes
      if ((window as any).electronAPI) {
        (window as any).electronAPI.onGoogleOauthCode(async (code: string) => {
          try {
            setLoading(true);
            setError(null);
            
            const res = await fetch('/api/auth/google/exchange', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ code }),
            });
            
            let errorMessage = '';
            try {
              const data = await res.json();
              if (data.success && data.user) {
                const result = await loginWithGoogle({
                  googleId: data.user.googleId,
                  email: data.user.email,
                  username: data.user.username,
                  avatarUrl: data.user.avatarUrl,
                });
                if (!result.success) {
                  setError(result.error || 'Google Sign-In failed');
                  setLoading(false);
                }
                return;
              } else {
                errorMessage = data.error || 'Failed to exchange Google OAuth code';
              }
            } catch (jsonErr) {
              const text = await res.text().catch(() => '');
              errorMessage = `Server returned invalid response (Status ${res.status}): ${text.slice(0, 150)}`;
            }
            
            setError(errorMessage);
            setLoading(false);
          } catch (err: any) {
            console.error(err);
            setError(`Network or runtime error: ${err.message || err}`);
            setLoading(false);
          }
        });
      }
      return;
    }

    // Web-only: Load Google GSI client script
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    script.onload = () => {
      if ((window as any).google) {
        try {
          const googleClientId = '239505686018-0v0j8a9fk3n47qoohpkneteu2k3i55q8.apps.googleusercontent.com';

          (window as any).google.accounts.id.initialize({
            client_id: googleClientId,
            callback: handleGoogleCredentialResponse,
          });
          (window as any).google.accounts.id.renderButton(
            document.getElementById('google-signin-btn'),
            { theme: 'filled_black', size: 'large', width: 320, shape: 'rectangular' }
          );
        } catch (e) {
          console.warn('Google GSI initialization failed', e);
        }
      }
    };

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handleGoogleCredentialResponse = async (response: any) => {
    try {
      const base64Url = response.credential.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      const payload = JSON.parse(jsonPayload);
      
      setLoading(true);
      setError(null);
      
      const result = await loginWithGoogle({
        googleId: payload.sub,
        email: payload.email,
        username: payload.name,
        avatarUrl: payload.picture,
      });

      if (!result.success) {
        setError(result.error || 'Google Sign-In failed');
        setLoading(false);
      }
    } catch (e) {
      console.error(e);
      setError('Failed to parse Google credentials');
      setLoading(false);
    }
  };

  const handleSimulatedGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    const mockId = `g_${Math.floor(Math.random() * 1000000)}`;
    const mockEmail = `user.${mockId}@gmail.com`;
    const mockUsername = `GoogleUser_${mockId}`;
    
    const result = await loginWithGoogle({
      googleId: mockId,
      email: mockEmail,
      username: mockUsername,
      avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${mockId}`,
    });

    if (!result.success) {
      setError(result.error || 'Simulated Google login failed');
      setLoading(false);
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isRegistering) {
        const res = await register(username, email, password);
        if (!res.success) {
          setError(res.error || 'Failed to create account.');
          setLoading(false);
        }
      } else {
        const res = await login(email, password);
        if (!res.success) {
          setError(res.error || 'Invalid username/email or password.');
          setLoading(false);
        }
      }
    } catch (err) {
      setError('An error occurred during authentication.');
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-surface-0 font-sans select-none relative overflow-hidden">
      
      <div className="w-full max-w-[320px] px-2 z-10">
        {/* Header Branding without Shield */}
        <div className="flex flex-col items-center mb-8">
          <h1 className="text-3xl font-black text-text-primary tracking-[0.2em] uppercase font-sans select-none">
            Unisora
          </h1>
          <p className="text-[10px] uppercase tracking-[0.15em] font-semibold text-text-muted mt-2">
            {isRegistering ? 'Register space session' : 'Sign in to session'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-danger/10 border border-danger/20 rounded-md text-xs font-semibold text-danger text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleAuthSubmit} className="space-y-4">
          {isRegistering && (
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-text-secondary uppercase tracking-wider pl-0.5">Username</label>
              <div className="relative">
                <User size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Username"
                  className="w-full bg-surface-1 border border-border rounded-md py-2 pl-9 pr-3 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors"
                  required
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[9px] font-bold text-text-secondary uppercase tracking-wider pl-0.5">
              {isRegistering ? 'Email Address' : 'Username or Email'}
            </label>
            <div className="relative">
              <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={isRegistering ? "name@example.com" : "username or email"}
                className="w-full bg-surface-1 border border-border rounded-md py-2 pl-9 pr-3 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between px-0.5">
              <label className="text-[9px] font-bold text-text-secondary uppercase tracking-wider">Password</label>
              {!isRegistering && (
                <button 
                  type="button" 
                  className="text-[9px] font-bold text-accent hover:text-accent-hover transition-colors"
                >
                  Forgot?
                </button>
              )}
            </div>
            <div className="relative">
              <Lock size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-surface-1 border border-border rounded-md py-2 pl-9 pr-3 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors"
                required
              />
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="md"
            className="w-full h-9 rounded-md bg-accent hover:bg-accent-hover text-white font-semibold text-xs border-none"
            loading={loading}
            icon={<ArrowRight size={13} />}
          >
            {isRegistering ? 'Register' : 'Sign In'}
          </Button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-[7px] uppercase tracking-[0.2em] font-bold text-text-muted">
            <span className="bg-surface-0 px-3">or continue with</span>
          </div>
        </div>

        <div className="flex flex-col gap-2 items-center w-full">
          {/* Google Sign-In button container */}
          {isDesktop ? (
            <button
              type="button"
              onClick={() => {
                if ((window as any).electronAPI) {
                  (window as any).electronAPI.openGoogleLogin(
                    '239505686018-0v0j8a9fk3n47qoohpkneteu2k3i55q8.apps.googleusercontent.com'
                  );
                }
              }}
              className="flex items-center justify-center gap-2 w-full h-[38px] px-3 rounded-md bg-white hover:bg-neutral-100 text-neutral-800 text-sm font-semibold transition-colors cursor-pointer border border-neutral-300"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              Sign in with Google
            </button>
          ) : (
            <div id="google-signin-btn" className="w-full flex justify-center min-h-[38px] scale-95" />
          )}
          
          <button
            type="button"
            onClick={handleSimulatedGoogleLogin}
            className="flex items-center justify-center gap-2 w-full h-9 px-3 rounded-md border border-border bg-surface-1 hover:bg-surface-2 text-text-secondary text-xs transition-colors cursor-pointer"
          >
            <Globe size={12} className="text-text-muted" />
            Simulate Google Login
          </button>
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-text-muted">
            {isRegistering ? 'Already registered?' : "New to Unisora?"}{' '}
            <button
              onClick={() => {
                setIsRegistering(!isRegistering);
                setError(null);
              }}
              className="text-accent font-bold hover:underline transition-all cursor-pointer"
            >
              {isRegistering ? 'Sign In' : 'Register'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
