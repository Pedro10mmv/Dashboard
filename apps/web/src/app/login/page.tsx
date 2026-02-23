'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const { login, register } = useAuth();
  const router = useRouter();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('demo@productivityos.dev');
  const [password, setPassword] = useState('password123');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isRegister) {
        await register(email, password, name);
      } else {
        await login(email, password);
      }
      router.push('/profiles');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="card max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold">🚀 Productivity OS</h1>
          <p className="text-[var(--text-muted)] text-sm mt-1">Your 10-year Game Studio command center</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div>
              <label className="label">Name</label>
              <input type="text" className="input" value={name} onChange={e => setName(e.target.value)} required />
            </div>
          )}
          <div>
            <label className="label">Email</label>
            <input type="email" className="input" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="label">Password</label>
            <input type="password" className="input" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? 'Loading...' : isRegister ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-sm text-[var(--text-muted)] mt-4">
          {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button className="text-brand-400 hover:underline" onClick={() => setIsRegister(!isRegister)}>
            {isRegister ? 'Sign in' : 'Register'}
          </button>
        </p>

        <div className="mt-6 p-3 rounded-lg bg-brand-600/10 border border-brand-600/20">
          <p className="text-xs text-brand-300">
            <strong>Demo:</strong> demo@productivityos.dev / password123
          </p>
        </div>
      </div>
    </div>
  );
}
