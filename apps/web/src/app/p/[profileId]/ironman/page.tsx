'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';

interface IronmanPlan {
  targetEventName: string; targetEventDate: string | null; phase: string; weeklyHoursTarget: number;
}

interface WeeklySummary {
  swim: { count: number; minutes: number }; bike: { count: number; minutes: number };
  run: { count: number; minutes: number }; totalMinutes: number; totalSessions: number; hasLongSession: boolean;
}

interface AIWeeklyPlan {
  weekly_endurance_structure: { swim_sessions: number; bike_sessions: number; run_sessions: number; long_session: string; total_target_minutes: number };
  key_sessions: Array<{ discipline: string; session_type: string; duration_minutes: number; intensity: string; notes: string }>;
  warning: string; minimum_viable_week: string;
}

export default function IronmanPage() {
  const { profileId } = useParams();
  const [plan, setPlan] = useState<IronmanPlan | null>(null);
  const [summary, setSummary] = useState<WeeklySummary | null>(null);
  const [editing, setEditing] = useState(false);
  const [aiPlan, setAiPlan] = useState<AIWeeklyPlan | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [form, setForm] = useState({ targetEventName: 'Ironman 2027', targetEventDate: '', phase: 'base', weeklyHoursTarget: 8 });

  useEffect(() => {
    api.get<IronmanPlan>(`/api/p/${profileId}/ironman/plan`).then(p => {
      setPlan(p);
      setForm({ targetEventName: p.targetEventName, targetEventDate: p.targetEventDate?.split('T')[0] || '', phase: p.phase, weeklyHoursTarget: p.weeklyHoursTarget });
    });
    api.get<WeeklySummary>(`/api/p/${profileId}/ironman/weekly-summary`).then(setSummary);
  }, [profileId]);

  const savePlan = async () => {
    const updated = await api.put<IronmanPlan>(`/api/p/${profileId}/ironman/plan`, {
      ...form,
      targetEventDate: form.targetEventDate || undefined,
    });
    setPlan(updated);
    setEditing(false);
  };

  const generatePlan = async () => {
    setAiLoading(true);
    try {
      const res = await api.post<{ result: AIWeeklyPlan }>(`/api/p/${profileId}/ironman/ai/weekly-plan`);
      setAiPlan(res.result);
    } catch (err) { console.error(err); }
    setAiLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">🏊 Ironman Plan</h1>
        <div className="flex gap-2">
          <button className="btn-primary text-sm" onClick={generatePlan} disabled={aiLoading}>
            {aiLoading ? 'Generating...' : '🤖 Generate Weekly Plan'}
          </button>
          <button className="btn-secondary text-sm" onClick={() => setEditing(!editing)}>
            {editing ? 'Cancel' : 'Edit Plan'}
          </button>
        </div>
      </div>

      {/* Plan Settings */}
      {editing ? (
        <div className="card space-y-3">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="label">Event Name</label>
              <input className="input" value={form.targetEventName} onChange={e => setForm({ ...form, targetEventName: e.target.value })} />
            </div>
            <div className="w-40">
              <label className="label">Event Date</label>
              <input type="date" className="input" value={form.targetEventDate} onChange={e => setForm({ ...form, targetEventDate: e.target.value })} />
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-40">
              <label className="label">Phase</label>
              <select className="input" value={form.phase} onChange={e => setForm({ ...form, phase: e.target.value })}>
                {['base', 'build', 'peak', 'taper', 'offseason'].map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="w-40">
              <label className="label">Weekly Hours Target</label>
              <input type="number" className="input" value={form.weeklyHoursTarget} onChange={e => setForm({ ...form, weeklyHoursTarget: Number(e.target.value) })} />
            </div>
          </div>
          <button className="btn-primary" onClick={savePlan}>Save</button>
        </div>
      ) : plan && (
        <div className="card">
          <h2 className="font-semibold">{plan.targetEventName}</h2>
          <div className="flex gap-4 mt-2 text-sm text-[var(--text-muted)]">
            {plan.targetEventDate && <span>📅 {new Date(plan.targetEventDate).toLocaleDateString()}</span>}
            <span>📊 Phase: <span className="text-brand-400 capitalize">{plan.phase}</span></span>
            <span>⏱ {plan.weeklyHoursTarget}h/week target</span>
          </div>
        </div>
      )}

      {/* Weekly Summary */}
      {summary && (
        <div className="card">
          <h2 className="font-semibold mb-3">📊 This Week</h2>
          <div className="grid grid-cols-4 gap-3">
            <div className="text-center p-3 rounded-lg bg-[var(--bg-input)]">
              <p className="text-2xl font-bold text-blue-400">{summary.swim.count}</p>
              <p className="text-xs text-[var(--text-muted)]">🏊 Swim ({summary.swim.minutes}m)</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-[var(--bg-input)]">
              <p className="text-2xl font-bold text-green-400">{summary.bike.count}</p>
              <p className="text-xs text-[var(--text-muted)]">🚴 Bike ({summary.bike.minutes}m)</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-[var(--bg-input)]">
              <p className="text-2xl font-bold text-orange-400">{summary.run.count}</p>
              <p className="text-xs text-[var(--text-muted)]">🏃 Run ({summary.run.minutes}m)</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-[var(--bg-input)]">
              <p className="text-2xl font-bold">{summary.totalMinutes}</p>
              <p className="text-xs text-[var(--text-muted)]">Total min</p>
            </div>
          </div>
          <div className="mt-2 text-sm text-[var(--text-muted)]">
            {summary.hasLongSession ? <span className="text-emerald-400">✓ Long session completed</span> : <span className="text-amber-400">⚠ No long session yet</span>}
          </div>
        </div>
      )}

      {/* AI Weekly Plan */}
      {aiPlan && (
        <div className="card border-brand-600/30">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-brand-400">🤖 AI Weekly Plan</h3>
            <button className="btn-ghost text-xs" onClick={() => setAiPlan(null)}>Close</button>
          </div>
          <div className="grid grid-cols-4 gap-2 mb-3 text-sm">
            <div className="p-2 rounded bg-[var(--bg-input)] text-center">
              <p className="font-bold">{aiPlan.weekly_endurance_structure.swim_sessions}</p>
              <p className="text-xs text-[var(--text-muted)]">Swim</p>
            </div>
            <div className="p-2 rounded bg-[var(--bg-input)] text-center">
              <p className="font-bold">{aiPlan.weekly_endurance_structure.bike_sessions}</p>
              <p className="text-xs text-[var(--text-muted)]">Bike</p>
            </div>
            <div className="p-2 rounded bg-[var(--bg-input)] text-center">
              <p className="font-bold">{aiPlan.weekly_endurance_structure.run_sessions}</p>
              <p className="text-xs text-[var(--text-muted)]">Run</p>
            </div>
            <div className="p-2 rounded bg-[var(--bg-input)] text-center">
              <p className="font-bold">{aiPlan.weekly_endurance_structure.total_target_minutes}m</p>
              <p className="text-xs text-[var(--text-muted)]">Total</p>
            </div>
          </div>
          <p className="text-sm mb-3">Long: <span className="text-brand-400">{aiPlan.weekly_endurance_structure.long_session}</span></p>

          <h4 className="text-sm font-medium mb-2">Key Sessions:</h4>
          <div className="space-y-2">
            {aiPlan.key_sessions.map((s, i) => (
              <div key={i} className="p-2 rounded bg-[var(--bg-input)] text-sm">
                <div className="flex gap-2">
                  <span className="capitalize font-medium">{s.discipline}</span>
                  <span className="text-[var(--text-muted)]">{s.session_type}</span>
                  <span>{s.duration_minutes}m</span>
                  <span className="text-[var(--text-dim)]">{s.intensity}</span>
                </div>
                {s.notes && <p className="text-xs text-[var(--text-muted)] mt-1">{s.notes}</p>}
              </div>
            ))}
          </div>

          {aiPlan.warning && <p className="text-sm text-amber-400 mt-3">⚠️ {aiPlan.warning}</p>}
          <p className="text-sm text-[var(--text-muted)] mt-2">📉 Minimum viable week: {aiPlan.minimum_viable_week}</p>
        </div>
      )}
    </div>
  );
}
