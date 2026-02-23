'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

interface Profile {
  id: string;
  name: string;
  domainsEnabled: string[];
  tone: string;
  strictness: number;
}

export default function ProfilesPage() {
  const { user, loading: authLoading, logout } = useAuth();
  const router = useRouter();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    if (user) {
      api.get<Profile[]>('/api/profiles')
        .then(setProfiles)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [user, authLoading, router]);

  const createProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      const profile = await api.post<Profile>('/api/profiles', { name: newName });
      setProfiles([...profiles, profile]);
      setNewName('');
      setCreating(false);
    } catch (err) {
      console.error(err);
    }
  };

  if (authLoading || loading) {
    return <div className="min-h-screen flex items-center justify-center text-[var(--text-muted)]">Loading...</div>;
  }

  return (
    <div className="min-h-screen px-4 py-12 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">👤 Select Profile</h1>
          <p className="text-[var(--text-muted)] text-sm">Welcome back, {user?.name}</p>
        </div>
        <button className="btn-ghost text-sm" onClick={logout}>Sign Out</button>
      </div>

      <div className="grid gap-4">
        {profiles.map(p => (
          <button
            key={p.id}
            onClick={() => router.push(`/p/${p.id}/dashboard`)}
            className="card text-left hover:border-brand-600/50 transition-colors cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">{p.name}</h2>
                <div className="flex gap-2 mt-1">
                  {p.domainsEnabled.map(d => (
                    <span key={d} className={`badge badge-${d}`}>{d}</span>
                  ))}
                </div>
              </div>
              <span className="text-[var(--text-dim)]">→</span>
            </div>
          </button>
        ))}
      </div>

      {creating ? (
        <form onSubmit={createProfile} className="card mt-4">
          <label className="label">Profile Name</label>
          <div className="flex gap-2">
            <input className="input" value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Me, Work, GF" autoFocus />
            <button type="submit" className="btn-primary">Create</button>
            <button type="button" className="btn-secondary" onClick={() => setCreating(false)}>Cancel</button>
          </div>
        </form>
      ) : (
        <button className="btn-secondary w-full mt-4" onClick={() => setCreating(true)}>
          + New Profile
        </button>
      )}
    </div>
  );
}
