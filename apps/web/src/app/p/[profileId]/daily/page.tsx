'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { todayISO } from '@/lib/utils';

interface Checkin {
  id: string; date: string; top1: string; secondary1?: string; secondary2?: string;
  energy: number; sleepHours: number; trainingPlanned: boolean;
  blocker?: string; avoidanceTag?: string;
}

interface DailyFocusResult {
  top1_quality: string; overload_risk: string;
  fifteen_minute_starter: { task: string; definition_of_done: string };
  avoidance_warning: string; fallback_if_blocked: string; training_nudge: string;
}

export default function DailyPage() {
  const { profileId } = useParams();
  const [checkin, setCheckin] = useState<Checkin | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [aiResult, setAiResult] = useState<DailyFocusResult | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [form, setForm] = useState({
    date: todayISO(), top1: '', secondary1: '', secondary2: '',
    energy: 7, sleepHours: 7, trainingPlanned: false,
    blocker: '', avoidanceTag: '',
  });

  useEffect(() => {
    api.get<Checkin | null>(`/api/p/${profileId}/checkins/today`)
      .then(c => {
        if (c) {
          setCheckin(c);
          setForm({
            date: todayISO(), top1: c.top1, secondary1: c.secondary1 || '', secondary2: c.secondary2 || '',
            energy: c.energy, sleepHours: c.sleepHours, trainingPlanned: c.trainingPlanned,
            blocker: c.blocker || '', avoidanceTag: c.avoidanceTag || '',
          });
        }
      })
      .finally(() => setLoading(false));
  }, [profileId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const result = await api.post<Checkin>(`/api/p/${profileId}/checkins`, {
      ...form,
      secondary1: form.secondary1 || undefined,
      secondary2: form.secondary2 || undefined,
      blocker: form.blocker || undefined,
      avoidanceTag: form.avoidanceTag || undefined,
    });
    setCheckin(result);
    setSaving(false);
  };

  const runDailyFocus = async () => {
    if (!checkin) return;
    setAiLoading(true);
    try {
      const res = await api.post<{ result: DailyFocusResult }>(`/api/p/${profileId}/checkins/${checkin.id}/ai/daily-focus`);
      setAiResult(res.result);
    } catch (err) {
      console.error(err);
    }
    setAiLoading(false);
  };

  if (loading) return <div className="text-[var(--text-muted)]">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">☀️ Morning Check-in</h1>
          <p className="text-[var(--text-muted)] text-sm">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        </div>
        {checkin && (
          <button className="btn-primary text-sm" onClick={runDailyFocus} disabled={aiLoading}>
            {aiLoading ? 'Analyzing...' : '🤖 Get Daily Focus'}
          </button>
        )}
      </div>

      {/* AI Result */}
      {aiResult && (
        <div className="card border-emerald-600/30">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-emerald-400">🤖 Daily Focus Analysis</h3>
            <button className="btn-ghost text-xs" onClick={() => setAiResult(null)}>Close</button>
          </div>

          <div className="p-4 rounded-lg bg-emerald-600/10 mb-3">
            <p className="text-sm font-medium text-emerald-400 mb-1">⏱️ 15-Minute Starter</p>
            <p className="font-medium">{aiResult.fifteen_minute_starter.task}</p>
            <p className="text-sm text-[var(--text-muted)]">✅ {aiResult.fifteen_minute_starter.definition_of_done}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="p-2 rounded bg-[var(--bg-input)]">
              <span className="text-[var(--text-muted)]">Top1 Quality:</span>{' '}
              <span className="font-medium">{aiResult.top1_quality}</span>
            </div>
            <div className="p-2 rounded bg-[var(--bg-input)]">
              <span className="text-[var(--text-muted)]">Overload Risk:</span>{' '}
              <span className="font-medium">{aiResult.overload_risk}</span>
            </div>
          </div>

          {aiResult.avoidance_warning && (
            <p className="text-sm text-amber-400 mt-3">⚠️ {aiResult.avoidance_warning}</p>
          )}
          {aiResult.fallback_if_blocked && (
            <p className="text-sm text-[var(--text-muted)] mt-2">🔄 Fallback: {aiResult.fallback_if_blocked}</p>
          )}
          {aiResult.training_nudge && (
            <p className="text-sm text-emerald-400 mt-2">🏋️ {aiResult.training_nudge}</p>
          )}
        </div>
      )}

      {/* Check-in Form */}
      <form onSubmit={submit} className="card space-y-4">
        <div>
          <label className="label">🎯 Top 1 Priority (required)</label>
          <input className="input text-lg" value={form.top1} onChange={e => setForm({ ...form, top1: e.target.value })} placeholder="What's the ONE thing you must accomplish today?" required />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Secondary Task 1</label>
            <input className="input" value={form.secondary1} onChange={e => setForm({ ...form, secondary1: e.target.value })} placeholder="Optional" />
          </div>
          <div>
            <label className="label">Secondary Task 2</label>
            <input className="input" value={form.secondary2} onChange={e => setForm({ ...form, secondary2: e.target.value })} placeholder="Optional" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="label">⚡ Energy (1-10)</label>
            <input type="range" min={1} max={10} value={form.energy} onChange={e => setForm({ ...form, energy: Number(e.target.value) })} className="w-full" />
            <p className="text-center text-sm font-medium">{form.energy}</p>
          </div>
          <div>
            <label className="label">😴 Sleep (hours)</label>
            <input type="number" step="0.5" min={0} max={24} className="input" value={form.sleepHours} onChange={e => setForm({ ...form, sleepHours: Number(e.target.value) })} />
          </div>
          <div>
            <label className="label">🏃 Training Today?</label>
            <button type="button" className={`input text-center ${form.trainingPlanned ? 'bg-emerald-600/20 border-emerald-600/50 text-emerald-400' : ''}`}
              onClick={() => setForm({ ...form, trainingPlanned: !form.trainingPlanned })}>
              {form.trainingPlanned ? 'Yes ✓' : 'No'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">🚧 Blocker</label>
            <input className="input" value={form.blocker} onChange={e => setForm({ ...form, blocker: e.target.value })} placeholder="What might stop you?" />
          </div>
          <div>
            <label className="label">🙈 Avoidance Tag</label>
            <input className="input" value={form.avoidanceTag} onChange={e => setForm({ ...form, avoidanceTag: e.target.value })} placeholder="What are you avoiding?" />
          </div>
        </div>

        <button type="submit" className="btn-primary w-full" disabled={saving}>
          {saving ? 'Saving...' : checkin ? 'Update Check-in' : 'Submit Check-in'}
        </button>
      </form>
    </div>
  );
}
