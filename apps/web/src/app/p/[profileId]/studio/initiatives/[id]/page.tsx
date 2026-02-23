'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface Milestone { id: string; title: string; done: boolean; sortOrder: number; }
interface Initiative {
  id: string; title: string; description: string; status: string;
  quarterTag: string | null; targetDate: string | null;
  milestones: Milestone[];
}

export default function InitiativeDetailPage() {
  const { profileId, id } = useParams();
  const [initiative, setInitiative] = useState<Initiative | null>(null);
  const [loading, setLoading] = useState(true);
  const [newMilestone, setNewMilestone] = useState('');
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', status: '', quarterTag: '' });

  const load = () => {
    api.get<Initiative>(`/api/p/${profileId}/studio/initiatives/${id}`)
      .then(i => { setInitiative(i); setForm({ title: i.title, description: i.description, status: i.status, quarterTag: i.quarterTag || '' }); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [profileId, id]);

  const updateInitiative = async () => {
    await api.patch(`/api/p/${profileId}/studio/initiatives/${id}`, form);
    setEditing(false);
    load();
  };

  const addMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMilestone.trim()) return;
    await api.post(`/api/p/${profileId}/studio/initiatives/${id}/milestones`, { title: newMilestone });
    setNewMilestone('');
    load();
  };

  const toggleMilestone = async (m: Milestone) => {
    await api.patch(`/api/p/${profileId}/studio/milestones/${m.id}`, { done: !m.done });
    load();
  };

  const deleteMilestone = async (milestoneId: string) => {
    await api.delete(`/api/p/${profileId}/studio/milestones/${milestoneId}`);
    load();
  };

  if (loading) return <div className="text-[var(--text-muted)]">Loading...</div>;
  if (!initiative) return <div className="text-red-400">Initiative not found</div>;

  const progress = initiative.milestones.length > 0
    ? Math.round((initiative.milestones.filter(m => m.done).length / initiative.milestones.length) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{initiative.title}</h1>
        <button className="btn-secondary text-sm" onClick={() => setEditing(!editing)}>
          {editing ? 'Cancel' : 'Edit'}
        </button>
      </div>

      {editing ? (
        <div className="card space-y-3">
          <div>
            <label className="label">Title</label>
            <input className="input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
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
                <option value="done">Done</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="label">Quarter</label>
              <input className="input" value={form.quarterTag} onChange={e => setForm({ ...form, quarterTag: e.target.value })} />
            </div>
          </div>
          <button className="btn-primary" onClick={updateInitiative}>Save Changes</button>
        </div>
      ) : (
        <div className="card">
          <p className="text-[var(--text-muted)]">{initiative.description || 'No description'}</p>
          <div className="flex gap-2 mt-2">
            <span className="badge badge-studio">{initiative.status}</span>
            {initiative.quarterTag && <span className="badge badge-other">{initiative.quarterTag}</span>}
          </div>
        </div>
      )}

      {/* Milestones */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">📋 Milestones</h2>
          <span className="text-sm text-[var(--text-muted)]">{progress}% complete</span>
        </div>

        {initiative.milestones.length > 0 && (
          <div className="w-full bg-[var(--bg-input)] rounded-full h-2 mb-4">
            <div className="h-2 rounded-full bg-emerald-500 transition-all" style={{ width: `${progress}%` }} />
          </div>
        )}

        <div className="space-y-2">
          {initiative.milestones.map(m => (
            <div key={m.id} className="flex items-center gap-3 p-2 rounded-lg bg-[var(--bg-input)] group">
              <button onClick={() => toggleMilestone(m)} className={cn(
                'w-5 h-5 rounded border-2 flex items-center justify-center text-xs transition-colors',
                m.done ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-[var(--border)] hover:border-emerald-500'
              )}>
                {m.done && '✓'}
              </button>
              <span className={cn('flex-1 text-sm', m.done && 'line-through text-[var(--text-dim)]')}>{m.title}</span>
              <button onClick={() => deleteMilestone(m.id)} className="text-red-400 opacity-0 group-hover:opacity-100 text-xs">✕</button>
            </div>
          ))}
        </div>

        <form onSubmit={addMilestone} className="flex gap-2 mt-3">
          <input
            className="input text-sm"
            value={newMilestone}
            onChange={e => setNewMilestone(e.target.value)}
            placeholder="Add milestone..."
          />
          <button type="submit" className="btn-primary text-sm">Add</button>
        </form>
      </div>
    </div>
  );
}
