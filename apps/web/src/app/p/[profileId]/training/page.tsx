'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { todayISO, cn } from '@/lib/utils';

interface Session {
  id: string; date: string; discipline: string; sessionType: string;
  durationMinutes: number; intensity: string; rpe: number | null; description: string | null;
}

const DISCIPLINE_ICONS: Record<string, string> = {
  swim: '🏊', bike: '🚴', run: '🏃', strength: '💪', crossfit: '🏋️', mobility: '🧘', other: '⚡',
};

export default function TrainingPage() {
  const { profileId } = useParams();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    date: todayISO(), discipline: 'run', sessionType: '', durationMinutes: 45, intensity: 'moderate', rpe: undefined as number | undefined, description: '',
  });

  const load = () => {
    api.get<Session[]>(`/api/p/${profileId}/ironman/sessions`)
      .then(setSessions)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [profileId]);

  const addSession = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post(`/api/p/${profileId}/ironman/sessions`, {
      ...form,
      rpe: form.rpe || undefined,
      description: form.description || undefined,
    });
    setForm({ date: todayISO(), discipline: 'run', sessionType: '', durationMinutes: 45, intensity: 'moderate', rpe: undefined, description: '' });
    setShowAdd(false);
    load();
  };

  const deleteSession = async (id: string) => {
    await api.delete(`/api/p/${profileId}/ironman/sessions/${id}`);
    load();
  };

  if (loading) return <div className="text-[var(--text-muted)]">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">💪 Training Log</h1>
        <button className="btn-primary text-sm" onClick={() => setShowAdd(!showAdd)}>
          {showAdd ? 'Cancel' : '+ Log Session'}
        </button>
      </div>

      {showAdd && (
        <form onSubmit={addSession} className="card space-y-3">
          <div className="flex gap-3">
            <div className="w-32">
              <label className="label">Date</label>
              <input type="date" className="input" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
            </div>
            <div className="w-32">
              <label className="label">Discipline</label>
              <select className="input" value={form.discipline} onChange={e => setForm({ ...form, discipline: e.target.value })}>
                {['swim', 'bike', 'run', 'strength', 'crossfit', 'mobility', 'other'].map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="label">Session Type</label>
              <input className="input" value={form.sessionType} onChange={e => setForm({ ...form, sessionType: e.target.value })} placeholder="e.g. Easy run, Intervals" />
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-24">
              <label className="label">Minutes</label>
              <input type="number" className="input" value={form.durationMinutes} onChange={e => setForm({ ...form, durationMinutes: Number(e.target.value) })} />
            </div>
            <div className="w-32">
              <label className="label">Intensity</label>
              <select className="input" value={form.intensity} onChange={e => setForm({ ...form, intensity: e.target.value })}>
                <option value="easy">Easy</option><option value="moderate">Moderate</option><option value="hard">Hard</option>
              </select>
            </div>
            <div className="w-20">
              <label className="label">RPE</label>
              <input type="number" min={1} max={10} className="input" value={form.rpe || ''} onChange={e => setForm({ ...form, rpe: e.target.value ? Number(e.target.value) : undefined })} />
            </div>
          </div>
          <button type="submit" className="btn-primary">Log Session</button>
        </form>
      )}

      <div className="space-y-2">
        {sessions.map(s => (
          <div key={s.id} className="card flex items-center gap-3 group">
            <span className="text-xl">{DISCIPLINE_ICONS[s.discipline] || '⚡'}</span>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm capitalize">{s.discipline}</span>
                {s.sessionType && <span className="text-xs text-[var(--text-muted)]">· {s.sessionType}</span>}
              </div>
              <div className="flex gap-3 text-xs text-[var(--text-muted)]">
                <span>{new Date(s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                <span>{s.durationMinutes} min</span>
                <span className={cn(
                  s.intensity === 'easy' ? 'text-green-400' : s.intensity === 'hard' ? 'text-red-400' : 'text-amber-400'
                )}>{s.intensity}</span>
                {s.rpe && <span>RPE {s.rpe}</span>}
              </div>
            </div>
            <button onClick={() => deleteSession(s.id)} className="text-red-400 opacity-0 group-hover:opacity-100 text-xs">✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}
