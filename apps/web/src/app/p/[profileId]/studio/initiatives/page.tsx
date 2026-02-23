'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface Initiative {
  id: string; title: string; description: string; status: string;
  quarterTag: string | null; targetDate: string | null;
  milestones: Array<{ id: string; title: string; done: boolean }>;
}

const STATUS_STYLES: Record<string, string> = {
  planned: 'badge-other',
  active: 'badge-studio',
  paused: 'badge-nutrition',
  done: 'badge-ironman',
};

export default function InitiativesPage() {
  const { profileId } = useParams();
  const router = useRouter();
  const [initiatives, setInitiatives] = useState<Initiative[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', status: 'planned', quarterTag: '' });

  useEffect(() => {
    api.get<Initiative[]>(`/api/p/${profileId}/studio/initiatives`)
      .then(setInitiatives)
      .finally(() => setLoading(false));
  }, [profileId]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    const initiative = await api.post<Initiative>(`/api/p/${profileId}/studio/initiatives`, form);
    setInitiatives([initiative, ...initiatives]);
    setForm({ title: '', description: '', status: 'planned', quarterTag: '' });
    setCreating(false);
  };

  if (loading) return <div className="text-[var(--text-muted)]">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">🎯 Initiatives</h1>
        <button className="btn-primary text-sm" onClick={() => setCreating(!creating)}>
          {creating ? 'Cancel' : '+ New Initiative'}
        </button>
      </div>

      {creating && (
        <form onSubmit={create} className="card space-y-3">
          <div>
            <label className="label">Title</label>
            <input className="input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="label">Status</label>
              <select className="input" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                <option value="planned">Planned</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="label">Quarter</label>
              <input className="input" value={form.quarterTag} onChange={e => setForm({ ...form, quarterTag: e.target.value })} placeholder="Q1-2026" />
            </div>
          </div>
          <button type="submit" className="btn-primary">Create Initiative</button>
        </form>
      )}

      <div className="space-y-3">
        {initiatives.map(i => (
          <div
            key={i.id}
            className="card cursor-pointer hover:border-brand-600/50 transition-colors"
            onClick={() => router.push(`/p/${profileId}/studio/initiatives/${i.id}`)}
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold">{i.title}</h3>
                <p className="text-sm text-[var(--text-muted)] mt-1">{i.description}</p>
              </div>
              <div className="flex gap-2 items-center">
                {i.quarterTag && <span className="badge badge-other">{i.quarterTag}</span>}
                <span className={cn('badge', STATUS_STYLES[i.status])}>{i.status}</span>
              </div>
            </div>
            {i.milestones.length > 0 && (
              <div className="mt-3 flex gap-1">
                {i.milestones.map(m => (
                  <div key={m.id} className={cn('w-3 h-3 rounded-sm', m.done ? 'bg-emerald-500' : 'bg-[var(--bg-input)]')} title={m.title} />
                ))}
                <span className="text-xs text-[var(--text-muted)] ml-2">
                  {i.milestones.filter(m => m.done).length}/{i.milestones.length}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
